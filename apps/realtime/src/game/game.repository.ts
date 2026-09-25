import { Injectable } from "@nestjs/common";
import { GameRoomStatus, ParticipantStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const roomInclude = {
  host: true,
  participants: { include: { user: true } },
} satisfies Prisma.GameRoomInclude;

const resultInclude = { user: true } satisfies Prisma.GameResultInclude;

export type GameRoomRecord = Prisma.GameRoomGetPayload<{ include: typeof roomInclude }>;
export type GameResultRecord = Prisma.GameResultGetPayload<{ include: typeof resultInclude }>;

@Injectable()
export class GameRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(hostId: string, code: string, roundDurationSeconds: number): Promise<GameRoomRecord> {
    return this.prisma.gameRoom.create({
      data: { hostId, code, roundDurationSeconds, maxPlayers: 4 },
      include: roomInclude,
    });
  }

  async findByCode(code: string): Promise<GameRoomRecord | null> {
    return this.prisma.gameRoom.findUnique({ where: { code }, include: roomInclude });
  }

  async listOpen(): Promise<GameRoomRecord[]> {
    return this.prisma.gameRoom.findMany({
      where: { status: { in: [GameRoomStatus.WAITING, GameRoomStatus.COUNTDOWN, GameRoomStatus.PLAYING] } },
      include: roomInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async addParticipant(roomId: string, userId: string): Promise<void> {
    await this.prisma.gameParticipant.upsert({
      where: { gameRoomId_userId: { gameRoomId: roomId, userId } },
      update: { status: ParticipantStatus.ACTIVE, ready: false, lastSeenAt: new Date() },
      create: { gameRoomId: roomId, userId },
    });
  }

  async updateReady(roomId: string, userId: string, ready: boolean): Promise<void> {
    await this.prisma.gameParticipant.updateMany({
      where: { gameRoomId: roomId, userId, status: ParticipantStatus.ACTIVE },
      data: { ready },
    });
  }

  async updateParticipantStatus(roomId: string, userId: string, status: ParticipantStatus): Promise<void> {
    await this.prisma.gameParticipant.updateMany({
      where: { gameRoomId: roomId, userId },
      data: { status, ...(status === ParticipantStatus.ACTIVE ? { lastSeenAt: new Date(), ready: false } : {}) },
    });
  }

  async updateRoomStatus(roomId: string, status: GameRoomStatus, finishedAt?: Date): Promise<void> {
    await this.prisma.gameRoom.update({ where: { id: roomId }, data: { status, ...(finishedAt ? { finishedAt } : {}) } });
  }

  async createMatch(roomId: string): Promise<string> {
    const match = await this.prisma.gameMatch.create({ data: { gameRoomId: roomId, status: "ACTIVE", startedAt: new Date() } });
    return match.id;
  }

  async finishMatch(matchId: string, roomId: string, durationMs: number, results: Array<{ userId: string; score: number; tokens: number; survivalTimeMs: number }>): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.gameMatch.update({ where: { id: matchId }, data: { status: "FINISHED", endedAt: new Date(), durationMs } }),
      this.prisma.gameRoom.update({ where: { id: roomId }, data: { status: GameRoomStatus.FINISHED, finishedAt: new Date() } }),
      ...results.map((result, index) => this.prisma.gameResult.create({ data: { matchId, rank: index + 1, userId: result.userId, score: result.score, tokensCollected: result.tokens, survivalTimeMs: result.survivalTimeMs } })),
    ]);
  }

  async listResults(roomId: string): Promise<GameResultRecord[]> {
    const matches = await this.prisma.gameMatch.findMany({ where: { gameRoomId: roomId, status: "FINISHED" }, orderBy: { endedAt: "desc" }, take: 10, include: { results: { include: resultInclude } } });
    return matches[0]?.results ?? [];
  }
}
