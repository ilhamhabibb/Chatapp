import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Namespace, Socket } from "socket.io";
import { GAME_NAMESPACE } from "@chating/contracts";
import { AuthUser } from "../common/auth-user";
import { readSessionCookie } from "../common/session-cookie";
import { getValidationMessage, parseInput } from "../common/validation";
import { SessionService } from "../auth/session.service";
import { gameInputSchema, gameReadySchema, gameRoomJoinSchema } from "./game.schemas";
import { GameService } from "./game.service";

@WebSocketGateway({
  namespace: GAME_NAMESPACE,
  cors: { origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"], credentials: true },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  private server!: Namespace;

  private broadcastTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly session: SessionService,
    private readonly game: GameService,
  ) {}

  afterInit(): void {
    this.broadcastTimer = setInterval(() => {
      for (const state of this.game.getActiveStates()) {
        this.server.to(this.room(state.roomCode)).emit("game.state", state);
      }
    }, 1000 / 15);
  }

  onModuleDestroy(): void {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    const user = await this.session.resolveFromCookie(readSessionCookie(client.handshake.headers.cookie, this.session.createCookieName()));
    if (!user) {
      client.disconnect(true);
      return;
    }
    client.data.user = user;
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data.user as AuthUser | undefined;
    if (!user) {
      return;
    }
    const codes = Array.from(client.rooms).filter((room) => room.startsWith("game:")).map((room) => room.slice("game:".length));
    await this.game.markDisconnected(user.id, codes);
  }

  @SubscribeMessage("game.room.join")
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.run(async () => {
      const input = parseInput(gameRoomJoinSchema, body);
      const user = this.getUser(client);
      const state = await this.game.joinRoom(input.code, user.id);
      await client.join(this.room(input.code));
      client.emit("game.room.snapshot", state);
      return state;
    });
  }

  @SubscribeMessage("game.player.ready")
  async ready(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.run(async () => {
      const input = parseInput(gameReadySchema, body);
      const user = this.getUser(client);
      const code = this.codeFromRoom(client);
      return this.game.setReady(code, user.id, input.ready);
    });
  }

  @SubscribeMessage("game.start")
  async start(@ConnectedSocket() client: Socket) {
    return this.run(async () => {
      const user = this.getUser(client);
      const code = this.codeFromRoom(client);
      const state = await this.game.startRoom(code, user.id);
      this.server.to(this.room(code)).emit("game.countdown", { roomCode: code, durationMs: 3000 });
      return state;
    });
  }

  @SubscribeMessage("game.input")
  async input(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.run(async () => {
      const input = parseInput(gameInputSchema, body);
      const user = this.getUser(client);
      await this.game.setInput(this.codeFromRoom(client), user.id, input.x, input.y, input.sequence);
      return { accepted: true };
    });
  }

  @SubscribeMessage("game.rematch.request")
  async rematch(@ConnectedSocket() client: Socket) {
    return this.run(async () => {
      const user = this.getUser(client);
      await this.game.requestRematch(this.codeFromRoom(client), user.id);
      return { rematch: true };
    });
  }

  @SubscribeMessage("game.leave")
  async leave(@ConnectedSocket() client: Socket) {
    return this.run(async () => {
      const user = this.getUser(client);
      const code = this.codeFromRoom(client);
      await this.game.leaveRoom(code, user.id);
      await client.leave(this.room(code));
      return { left: true };
    });
  }

  private room(code: string): string {
    return `game:${code}`;
  }

  private codeFromRoom(client: Socket): string {
    const room = Array.from(client.rooms).find((item) => item.startsWith("game:"));
    if (!room) {
      throw new Error("Anda belum bergabung ke game room");
    }
    return room.slice("game:".length);
  }

  private getUser(client: Socket): AuthUser {
    const user = client.data.user as AuthUser | undefined;
    if (!user) {
      throw new Error("Sesi tidak valid");
    }
    return user;
  }

  private async run<T>(action: () => Promise<T>): Promise<{ success: true; data: T } | { success: false; error: { code: string; message: string } }> {
    try {
      return { success: true, data: await action() };
    } catch (error) {
      return { success: false, error: { code: "GAME_ERROR", message: getValidationMessage(error) } };
    }
  }
}
