import { HttpException, Logger, UnauthorizedException } from "@nestjs/common";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Namespace, Socket } from "socket.io";
import { ZodError } from "zod";
import { CHAT_NAMESPACE } from "@chating/contracts";
import { gatewayOriginChecker } from "../config/env";
import { AuthUser } from "../common/auth-user";
import { getValidationMessage, parseInput } from "../common/validation";
import { SessionService } from "../auth/session.service";
import { RedisService } from "../redis/redis.module";
import { UsersService } from "../users/users.service";
import { ChatService } from "./chat.service";
import { messageSendSchema, readSchema, typingSchema } from "./chat.schemas";

@WebSocketGateway({
  namespace: CHAT_NAMESPACE,
  cors: { origin: gatewayOriginChecker(), credentials: true },
})
export class ChatGateway {
  private readonly logger = new Logger("ChatGateway");

  @WebSocketServer()
  private server!: Namespace;

  private readonly typingTimers = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();

  constructor(
    private readonly session: SessionService,
    private readonly chat: ChatService,
    private readonly redis: RedisService,
    private readonly users: UsersService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    // See GameGateway: keep the pending session on the socket so handlers that
    // run before this resolves can await it rather than see a missing user.
    const pending = this.session.resolveFromCookie(client.handshake.headers.cookie);
    client.data.auth = pending;
    const user = await pending;
    if (!user) {
      client.disconnect(true);
      return;
    }
    client.data.user = user;
    await client.join(this.userRoom(user.id));
    await this.redis.addPresence(user.id, client.id, 70);
    const presenceTimer = setInterval(() => {
      void this.redis.refreshPresence(user.id, client.id, 70);
    }, 25_000);
    client.data.presenceTimer = presenceTimer;
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data.user as AuthUser | undefined;
    if (!user) {
      return;
    }
    const presenceTimer = client.data.presenceTimer as ReturnType<typeof setInterval> | undefined;
    if (presenceTimer) {
      clearInterval(presenceTimer);
    }
    const remainingConnections = await this.redis.removePresence(user.id, client.id);
    if (remainingConnections === 0) {
      await this.users.markOffline(user.id);
    }
    for (const room of client.rooms) {
      if (room.startsWith("conversation:")) {
        await this.broadcastPresence(room.slice("conversation:".length), user.id, remainingConnections > 0);
      }
    }
  }

  @SubscribeMessage("conversation.join")
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.run(async () => {
      const input = parseInput(typingSchema, body);
      const user = await this.getUser(client);
      await this.chat.assertMember(user.id, input.conversationId);
      const room = this.conversationRoom(input.conversationId);
      const previousRooms = Array.from(client.rooms).filter((value) => value.startsWith("conversation:") && value !== room);
      await Promise.all(previousRooms.map((value) => client.leave(value)));
      await client.join(room);
      await this.broadcastPresence(input.conversationId, user.id, true);
      return { conversationId: input.conversationId };
    });
  }

  @SubscribeMessage("message.send")
  async send(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.run(async () => {
      const input = parseInput(messageSendSchema, body);
      const user = await this.getUser(client);
      const message = await this.chat.sendMessage(user.id, input);
      this.server.to(this.conversationRoom(input.conversationId)).emit("message.created", message);
      return message;
    });
  }

  @SubscribeMessage("typing.start")
  async typingStart(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.run(async () => {
      const input = parseInput(typingSchema, body);
      const user = await this.getUser(client);
      await this.chat.assertMember(user.id, input.conversationId);
      const room = this.conversationRoom(input.conversationId);
      const timers = this.typingTimers.get(room) ?? new Map<string, ReturnType<typeof setTimeout>>();
      const previous = timers.get(user.id);
      if (previous) {
        clearTimeout(previous);
      }
      timers.set(user.id, setTimeout(() => {
        timers.delete(user.id);
        this.server.to(room).emit("typing.updated", { conversationId: input.conversationId, userId: user.id, isTyping: false });
      }, 3000));
      this.typingTimers.set(room, timers);
      this.server.to(room).emit("typing.updated", { conversationId: input.conversationId, userId: user.id, isTyping: true });
      return { typing: true };
    });
  }

  @SubscribeMessage("typing.stop")
  async typingStop(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.run(async () => {
      const input = parseInput(typingSchema, body);
      const user = await this.getUser(client);
      await this.chat.assertMember(user.id, input.conversationId);
      const room = this.conversationRoom(input.conversationId);
      const timers = this.typingTimers.get(room);
      const timer = timers?.get(user.id);
      if (timer) {
        clearTimeout(timer);
        timers?.delete(user.id);
      }
      this.server.to(room).emit("typing.updated", { conversationId: input.conversationId, userId: user.id, isTyping: false });
      return { typing: false };
    });
  }

  @SubscribeMessage("message.read")
  async read(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.run(async () => {
      const input = parseInput(readSchema, body);
      const user = await this.getUser(client);
      await this.chat.markRead(user.id, input.conversationId, input.messageId);
      this.server.to(this.conversationRoom(input.conversationId)).emit("message.read", { conversationId: input.conversationId, userId: user.id, messageId: input.messageId ?? null });
      return { read: true };
    });
  }

  private async broadcastPresence(conversationId: string, userId: string, isOnline: boolean): Promise<void> {
    const memberIds = await this.chat.listMemberIds(conversationId);
    const payload = { conversationId, userId, isOnline };
    this.server.to(this.conversationRoom(conversationId)).emit("conversation.presence", payload);
    for (const memberId of memberIds) {
      this.server.to(this.userRoom(memberId)).emit("conversation.presence", payload);
    }
  }

  /**
   * A removed member must stop receiving live traffic immediately. The REST
   * history is already blocked by `requireMember`, but the socket room is
   * independent, so an open tab would otherwise keep streaming messages.
   */
  async evictFromConversation(conversationId: string, memberId: string): Promise<void> {
    const room = this.conversationRoom(conversationId);
    await this.server.in(room).socketsLeave(this.userRoom(memberId));
    this.server.to(room).emit("conversation.member.removed", { conversationId, userId: memberId });
  }

  private conversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
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
      return { success: false, error: { code: "CHAT_ERROR", message: getValidationMessage(error) } };
    }
  }
}
