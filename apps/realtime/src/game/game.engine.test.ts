import { GameRoomStatus } from "@chating/contracts";
import { describe, expect, it } from "vitest";
import { createInitialRoomState, tickRoom, toGameState } from "./game.engine";

function addPlayer(room: ReturnType<typeof createInitialRoomState>): void {
  room.players.set("player-1", {
    id: "player-1",
    username: "alice",
    displayName: "Alice",
    x: 100,
    y: 100,
    score: 0,
    tokens: 0,
    ready: true,
    connected: true,
    inputX: 1,
    inputY: 0,
    lastSequence: 1,
    invulnerableUntil: 0,
  });
}

describe("game engine", () => {
  it("moves a player using server input", () => {
    const room = createInitialRoomState("room-1", "ABCD", "player-1", 90);
    addPlayer(room);
    room.status = GameRoomStatus.PLAYING;
    room.lastTickAt = 1000;
    room.roundStartedAt = 1000;
    room.roundEndsAt = 2000;

    tickRoom(room, 1100);

    expect(room.players.get("player-1")?.x).toBeGreaterThan(100);
    expect(room.players.get("player-1")?.y).toBe(100);
  });

  it("collects a token and finishes an expired round", () => {
    const room = createInitialRoomState("room-1", "ABCD", "player-1", 90);
    addPlayer(room);
    room.status = GameRoomStatus.PLAYING;
    room.lastTickAt = 1000;
    room.roundStartedAt = 1000;
    room.roundEndsAt = 1001;
    room.tokens = [{ id: "token-1", x: 100, y: 100 }];

    tickRoom(room, 1000);
    expect(room.players.get("player-1")?.score).toBe(10);
    expect(room.players.get("player-1")?.tokens).toBe(1);
    expect(room.tokens).toHaveLength(0);

    tickRoom(room, 1001);
    expect(room.status).toBe(GameRoomStatus.FINISHED);
    expect(toGameState(room).remainingSeconds).toBe(0);
  });
});
