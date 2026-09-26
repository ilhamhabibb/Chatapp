import { HttpException, Logger, OnModuleDestroy, UnauthorizedException } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Namespace, Socket } from "socket.io";
import { ZodError } from "zod";
import { GAME_NAMESPACE } from "@chating/contracts";
import { gatewayOriginChecker } from "../config/env";
import { AuthUser } from "../common/auth-user";
import { getValidationMessage, parseInput } from "../common/validation";
import { SessionService } from "../auth/session.service";
import { gameInputSchema, gameReadySchema, gameRoomJoinSchema } from "./game.schemas";
import { GameService } from "./game.service";

@WebSocketGateway({
  namespace: GAME_NAMESPACE,
  cors: { origin: gatewayOriginChecker(), credentials: true },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleDestroy {
  private readonly logger = new Logger("GameGateway");
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
    // The session lookup is async, but the client can emit from its `connect`
    // handler before this promise settles. Park the promise on the socket so
    // message handlers can await it instead of racing `client.data.user`.
    const pending = this.session.resolveFromCookie(client.handshake.headers.cookie);
    client.data.auth = pending;
    const user = await pending;
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
    const codes = Array.from(client.rooms)
      .filter((room) => room.startsWith("game:"))
      .map((room) => room.slice("game:".length));
    for (const code of codes) {
      const remaining = await this.server.in(this.room(code)).fetchSockets();
      const stillConnected = remaining.some(
        (peer) => (peer.data as { user?: AuthUser }).user?.id === user.id,
      );
      if (!stillConnected) {
        await this.game.markDisconnected(user.id, [code]);
      }
    }
  }

  @SubscribeMessage("game.room.join")
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.run(async () => {
      const input = parseInput(gameRoomJoinSchema, body);
      const user = await this.getUser(client);
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
      const user = await this.getUser(client);
      const code = this.codeFromRoom(client);
      return this.game.setReady(code, user.id, input.ready);
    });
  }

  @SubscribeMessage("game.start")
  async start(@ConnectedSocket() client: Socket) {
    return this.run(async () => {
      const user = await this.getUser(client);
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
      const user = await this.getUser(client);
      await this.game.setInput(this.codeFromRoom(client), user.id, input.x, input.y, input.sequence);
      return { accepted: true };
    });
  }

  @SubscribeMessage("game.rematch.request")
  async rematch(@ConnectedSocket() client: Socket) {
    return this.run(async () => {
      const user = await this.getUser(client);
      await this.game.requestRematch(this.codeFromRoom(client), user.id);
      return { rematch: true };
    });
  }

  @SubscribeMessage("game.leave")
  async leave(@ConnectedSocket() client: Socket) {
    return this.run(async () => {
      const user = await this.getUser(client);
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

  private async getUser(client: Socket): Promise<AuthUser> {
    const pending = client.data.auth as Promise<AuthUser | null> | undefined;
    const user = (await pending) ?? (client.data.user as AuthUser | undefined);
    if (!user) {
      throw new UnauthorizedException("Sesi tidak valid");
    }
    return user;
  }

  private async run<T>(action: () => Promise<T>): Promise<{ success: true; data: T } | { success: false; error: { code: string; message: string } }> {
    try {
      return { success: true, data: await action() };
    } catch (error) {
      // Zod/HTTP failures are ordinary client mistakes and already surface a
      // safe message, so keep them out of the error log with their stack dump.
      if (error instanceof ZodError || error instanceof HttpException) {
        this.logger.warn(`socket handler ditolak: ${getValidationMessage(error)}`);
      } else {
        this.logger.error(`socket handler gagal: ${error instanceof Error ? error.stack : String(error)}`);
      }
      return { success: false, error: { code: "GAME_ERROR", message: getValidationMessage(error) } };
    }
  }
}
