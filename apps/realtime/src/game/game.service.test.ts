import { describe, expect, it, vi } from "vitest";
import { GameService } from "./game.service";
import { GameRepository, GameRoomRecord } from "./game.repository";

describe("GameService", () => {
  it("uses the database room id when loading results", async () => {
    const room = {
      id: "room-id",
      code: "ABCD",
      participants: [
        {
          userId: "user-1",
          status: "ACTIVE",
          ready: false,
          user: { id: "user-1", username: "alice", displayName: "Alice" },
        },
      ],
    } as unknown as GameRoomRecord;
    const repository = {
      findByCode: vi.fn().mockResolvedValue(room),
      listResults: vi.fn().mockResolvedValue([]),
    } as unknown as GameRepository;
    const service = new GameService(repository);

    await service.getResults("abcd", "user-1");

    expect(repository.findByCode).toHaveBeenCalledWith("ABCD");
    expect(repository.listResults).toHaveBeenCalledWith("room-id");
  });
});
