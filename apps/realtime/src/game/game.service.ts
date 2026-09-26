import { ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ParticipantStatus } from "@prisma/client";
import { GameRoomStatus, GameRoomSummary, GameState } from "@chating/contracts";
import { GameRepository, GameRoomRecord } from "./game.repository";
import { CreateGameRoomInput } from "./game.schemas";
import { ActivePlayer, ActiveRoom, createInitialRoomState, resetRoomForRound, tickRoom, toGameState } from "./game.engine";
import { randomInt } from "node:crypto";

@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
  private readonly rooms = new Map<string, ActiveRoom>();
  private readonly roomTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly repository: GameRepository,
  ) {}

  onModuleInit(): void {
    this.ticker = setInterval(() => this.tickAll(), 1000 / 15);
  }

  onModuleDestroy(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
    }
    for (const timer of this.roomTimers.values()) {
      clearTimeout(timer);
    }
  }

  async listRooms(): Promise<GameRoomSummary[]> {
    const records = await this.repository.listOpen();
    return records.map((record) => this.toSummary(record));
  }

  async createRoom(userId: string, input: CreateGameRoomInput): Promise<GameRoomSummary> {
    const code = await this.createUniqueCode();
    const record = await this.repository.create(userId, code, input.roundDurationSeconds);
    return this.toSummary(record);
  }

  async joinRoom(code: string, userId: string): Promise<GameState> {
    const record = await this.requireRoom(code);
    const activePlayers = record.participants.filter((participant) => participant.status === ParticipantStatus.ACTIVE);
    const alreadyJoined = activePlayers.some((participant) => participant.userId === userId);
    if (!alreadyJoined && activePlayers.length >= record.maxPlayers) {
      throw new ForbiddenException("Room sudah penuh");
    }
    await this.repository.addParticipant(record.id, userId);
    const room = this.rooms.get(code) ?? createInitialRoomState(record.id, record.code, record.hostId, record.roundDurationSeconds);
    this.rooms.set(code, room);
    const refreshed = await this.requireRoom(code);
    this.syncPlayers(room, refreshed);
    return toGameState(room);
  }

  async getState(code: string, userId: string): Promise<GameState> {
    const record = await this.assertParticipant(code, userId);
    const room = this.rooms.get(code);
    if (!room) {
      const created = createInitialRoomState(record.id, record.code, record.hostId, record.roundDurationSeconds);
      this.rooms.set(code, created);
      this.syncPlayers(created, record);
      return toGameState(created);
    }
    return toGameState(room);
  }

  async setReady(code: string, userId: string, ready: boolean): Promise<GameState> {
    const room = await this.getActiveRoom(code, userId);
    const player = room.players.get(userId);
    if (!player) {
      throw new ForbiddenException("Pemain tidak ditemukan");
    }
    player.ready = ready;
    await this.repository.updateReady(room.id, userId, ready);
    return toGameState(room);
  }

  async startRoom(code: string, userId: string): Promise<GameState> {
    const room = await this.getActiveRoom(code, userId);
    if (room.hostId !== userId) {
      throw new ForbiddenException("Hanya host yang dapat memulai round");
    }
    const players = Array.from(room.players.values()).filter((player) => player.connected);
    if (players.length < 2 || players.some((player) => !player.ready)) {
      throw new ForbiddenException("Minimal dua pemain dan semua harus siap");
    }
    const matchId = await this.repository.createMatch(room.id);
    room.matchId = matchId;
    room.status = GameRoomStatus.COUNTDOWN;
    room.roundStartedAt = 0;
    room.roundEndsAt = 0;
    const timer = setTimeout(() => {
      const current = this.rooms.get(code);
      if (current) {
        resetRoomForRound(current);
        this.roomTimers.delete(code);
      }
    }, 3000);
    this.roomTimers.set(code, timer);
    return toGameState(room);
  }

  // No DB check here on purpose: this runs per input event (~60Hz per player).
  // The in-memory `players` map is the authorization gate for a live room.
  async setInput(code: string, userId: string, x: number, y: number, sequence: number): Promise<void> {
    const room = this.rooms.get(code);
    if (!room || room.status !== GameRoomStatus.PLAYING) {
      return;
    }
    const player = room.players.get(userId);
    if (!player || sequence <= player.lastSequence) {
      return;
    }
    const length = Math.hypot(x, y);
    player.inputX = length > 1 ? x / length : x;
    player.inputY = length > 1 ? y / length : y;
    player.lastSequence = sequence;
  }

  async requestRematch(code: string, userId: string): Promise<void> {
    const room = await this.getActiveRoom(code, userId);
    if (room.hostId !== userId) {
      throw new ForbiddenException("Hanya host yang meminta rematch");
    }
    for (const player of room.players.values()) {
      player.ready = false;
      await this.repository.updateReady(room.id, player.id, false);
    }
    room.status = GameRoomStatus.WAITING;
  }

  async leaveRoom(code: string, userId: string): Promise<void> {
    const room = this.rooms.get(code);
    if (!room) {
      return;
    }
    const player = room.players.get(userId);
    if (player) {
      player.connected = false;
    }
    await this.repository.updateReady(room.id, userId, false);
  }

  async markDisconnected(userId: string, codes: string[]): Promise<void> {
    for (const code of codes) {
      const room = this.rooms.get(code);
      const player = room?.players.get(userId);
      if (player) {
        player.connected = false;
      }
    }
  }

  async getResults(code: string, userId: string): Promise<Awaited<ReturnType<GameRepository["listResults"]>>> {
    const record = await this.assertParticipant(code, userId);
    return this.repository.listResults(record.id);
  }

  getActiveStates(): GameState[] {
    return Array.from(this.rooms.values()).map(toGameState);
  }

  private tickAll(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      tickRoom(room, now);
      if (room.status === GameRoomStatus.FINISHED && room.matchId && !room.persisted) {
        room.persisted = true;
        void this.persistFinishedRoom(room);
      }
      if (room.status === GameRoomStatus.CLOSED) {
        this.rooms.delete(code);
      }
    }
  }

  private async persistFinishedRoom(room: ActiveRoom): Promise<void> {
    if (!room.matchId) {
      return;
    }
    const results = Array.from(room.players.values())
      .sort((first, second) => second.score - first.score)
      .map((player) => ({ userId: player.id, score: player.score, tokens: player.tokens, survivalTimeMs: room.roundDurationSeconds * 1000 }));
    await this.repository.finishMatch(room.matchId, room.id, room.roundDurationSeconds * 1000, results);
  }

  private async getActiveRoom(code: string, userId: string): Promise<ActiveRoom> {
    await this.assertParticipant(code, userId);
    const room = this.rooms.get(code);
    if (!room) {
      const record = await this.requireRoom(code);
      const created = createInitialRoomState(record.id, record.code, record.hostId, record.roundDurationSeconds);
      this.syncPlayers(created, record);
      this.rooms.set(code, created);
      return created;
    }
    return room;
  }

  private async assertParticipant(code: string, userId: string): Promise<GameRoomRecord> {
    const record = await this.requireRoom(code);
    const participant = record.participants.find((item) => item.userId === userId && item.status === ParticipantStatus.ACTIVE);
    if (!participant) {
      throw new ForbiddenException("Anda bukan peserta room ini");
    }
    return record;
  }

  private async requireRoom(code: string): Promise<GameRoomRecord> {
    const record = await this.repository.findByCode(code.toUpperCase());
    if (!record) {
      throw new NotFoundException("Game room tidak ditemukan");
    }
    return record;
  }

  private syncPlayers(room: ActiveRoom, record: GameRoomRecord): void {
    const active = record.participants.filter((participant) => participant.status === ParticipantStatus.ACTIVE);
    for (const participant of active) {
      const current = room.players.get(participant.userId);
      if (current) {
        current.ready = participant.ready;
        current.connected = true;
        continue;
      }
      room.players.set(participant.userId, {
        id: participant.userId,
        username: participant.user.username,
        displayName: participant.user.displayName,
        x: 480,
        y: 270,
        score: 0,
        tokens: 0,
        ready: participant.ready,
        connected: true,
        inputX: 0,
        inputY: 0,
        lastSequence: 0,
        invulnerableUntil: 0,
      });
    }
  }

  private toSummary(record: GameRoomRecord): GameRoomSummary {
    return {
      id: record.id,
      code: record.code,
      status: record.status,
      hostId: record.hostId,
      playerCount: record.participants.filter((participant) => participant.status === ParticipantStatus.ACTIVE).length,
      maxPlayers: record.maxPlayers,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private async createUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = randomInt(100000, 1000000).toString(36).toUpperCase().padStart(4, "0");
      if (!(await this.repository.findByCode(code))) {
        return code;
      }
    }
    throw new Error("Tidak dapat membuat kode room");
  }
}
