import { randomInt } from "node:crypto";
import { GameHazard, GamePlayer, GameRoomStatus, GameState, GameToken } from "@chating/contracts";

export interface ActivePlayer extends GamePlayer {
  inputX: number;
  inputY: number;
  lastSequence: number;
  invulnerableUntil: number;
}

export interface ActiveRoom {
  id: string;
  code: string;
  hostId: string;
  status: GameRoomStatus;
  roundDurationSeconds: number;
  players: Map<string, ActivePlayer>;
  tokens: GameToken[];
  hazards: GameHazard[];
  matchId: string | null;
  roundStartedAt: number;
  roundEndsAt: number;
  lastTickAt: number;
  persisted: boolean;
}

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;
const PLAYER_RADIUS = 18;
const TOKEN_RADIUS = 12;
const HAZARD_RADIUS = 24;
const PLAYER_SPEED = 190;

export function createTokens(): GameToken[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `token-${index}-${randomInt(1_000_000)}`,
    x: 40 + ((index * 173) % (WORLD_WIDTH - 80)),
    y: 40 + ((index * 97) % (WORLD_HEIGHT - 80)),
  }));
}

export function createHazards(): GameHazard[] {
  return Array.from({ length: 4 }, (_, index) => ({
    id: `hazard-${index}-${randomInt(1_000_000)}`,
    x: 140 + index * 190,
    y: 130 + (index % 2) * 220,
    radius: HAZARD_RADIUS,
  }));
}

export function createInitialRoomState(id: string, code: string, hostId: string, roundDurationSeconds: number): ActiveRoom {
  return {
    id,
    code,
    hostId,
    status: GameRoomStatus.WAITING,
    roundDurationSeconds,
    players: new Map(),
    tokens: [],
    hazards: [],
    matchId: null,
    roundStartedAt: 0,
    roundEndsAt: 0,
    lastTickAt: 0,
    persisted: false,
  };
}

export function resetRoomForRound(room: ActiveRoom): void {
  room.status = GameRoomStatus.PLAYING;
  room.tokens = createTokens();
  room.hazards = createHazards();
  room.roundStartedAt = Date.now();
  room.roundEndsAt = room.roundStartedAt + room.roundDurationSeconds * 1000;
  room.lastTickAt = room.roundStartedAt;
  room.persisted = false;
  for (const player of room.players.values()) {
    player.score = 0;
    player.tokens = 0;
    player.inputX = 0;
    player.inputY = 0;
    player.lastSequence = 0;
    player.invulnerableUntil = 0;
    const angle = (room.players.size ? Array.from(room.players.keys()).indexOf(player.id) : 0) * (Math.PI * 2 / 4);
    player.x = WORLD_WIDTH / 2 + Math.cos(angle) * 100;
    player.y = WORLD_HEIGHT / 2 + Math.sin(angle) * 100;
  }
}

export function tickRoom(room: ActiveRoom, now: number): void {
  if (room.status !== GameRoomStatus.PLAYING) {
    return;
  }
  const deltaSeconds = Math.min(0.1, (now - room.lastTickAt) / 1000);
  room.lastTickAt = now;

  for (const player of room.players.values()) {
    const length = Math.hypot(player.inputX, player.inputY) || 1;
    const normalizedX = player.inputX / length;
    const normalizedY = player.inputY / length;
    player.x = clamp(player.x + normalizedX * PLAYER_SPEED * deltaSeconds, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    player.y = clamp(player.y + normalizedY * PLAYER_SPEED * deltaSeconds, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
  }

  for (const hazard of room.hazards) {
    hazard.x += Math.sin(now / 700 + hazard.id.length) * 0.7;
    hazard.y += Math.cos(now / 900 + hazard.id.length) * 0.7;
    hazard.x = clamp(hazard.x, hazard.radius, WORLD_WIDTH - hazard.radius);
    hazard.y = clamp(hazard.y, hazard.radius, WORLD_HEIGHT - hazard.radius);
  }

  for (const player of room.players.values()) {
    if (player.invulnerableUntil > now) {
      continue;
    }
    for (const hazard of room.hazards) {
      if (distance(player.x, player.y, hazard.x, hazard.y) <= hazard.radius + PLAYER_RADIUS) {
        player.score = Math.max(0, player.score - 5);
        player.x = WORLD_WIDTH / 2;
        player.y = WORLD_HEIGHT / 2;
        player.invulnerableUntil = now + 1000;
        break;
      }
    }
  }

  for (const token of room.tokens) {
    for (const player of room.players.values()) {
      if (distance(player.x, player.y, token.x, token.y) <= TOKEN_RADIUS + PLAYER_RADIUS) {
        player.score += 10;
        player.tokens += 1;
        token.x = -1000;
        token.y = -1000;
        break;
      }
    }
  }

  room.tokens = room.tokens.filter((token) => token.x >= 0);
  if (now >= room.roundEndsAt) {
    room.status = GameRoomStatus.FINISHED;
  }
}

export function toGameState(room: ActiveRoom): GameState {
  return {
    roomCode: room.code,
    hostId: room.hostId,
    status: room.status,
    roundDurationSeconds: room.roundDurationSeconds,
    remainingSeconds: Math.max(0, Math.ceil((room.roundEndsAt - Date.now()) / 1000)),
    players: Array.from(room.players.values()).map((player) => ({
      id: player.id,
      username: player.username,
      displayName: player.displayName,
      x: player.x,
      y: player.y,
      score: player.score,
      tokens: player.tokens,
      ready: player.ready,
      connected: player.connected,
    })),
    tokens: room.tokens,
    hazards: room.hazards,
  };
}

function distance(firstX: number, firstY: number, secondX: number, secondY: number): number {
  return Math.hypot(firstX - secondX, firstY - secondY);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
