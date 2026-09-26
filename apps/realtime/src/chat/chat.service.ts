import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConversationMember, ConversationSummary, Message, MessagePage, PublicUser } from "@chating/contracts";
import { UsersService } from "../users/users.service";
import { ChatRepository, ConversationRecord, MessageRecord } from "./chat.repository";
import { CreatePrivateConversationInput, CreatePublicConversationInput, MessageSendInput } from "./chat.schemas";

@Injectable()
export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly users: UsersService,
  ) {}

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const records = await this.repository.listForUser(userId);
    return Promise.all(records.map((record) => this.mapConversation(record, userId)));
  }

  async listPublicConversations(userId: string, search?: string): Promise<ConversationSummary[]> {
    const records = await this.repository.listPublic(search);
    return Promise.all(records.map((record) => this.mapConversation(record, userId)));
  }

  async listMembers(userId: string, conversationId: string): Promise<ConversationMember[]> {
    await this.requireMember(conversationId, userId);
    const conversation = await this.repository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException("Percakapan tidak ditemukan");
    }
    return Promise.all(conversation.members.map(async (member) => ({
      user: await this.mapUser(member.user),
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    })));
  }

  async listMemberIds(conversationId: string): Promise<string[]> {
    return this.repository.listMemberIds(conversationId);
  }

  async createPrivateConversation(userId: string, input: CreatePrivateConversationInput): Promise<ConversationSummary> {
    if (input.userId === userId) {
      throw new ConflictException("Tidak dapat membuat chat privat dengan diri sendiri");
    }
    const target = await this.users.getById(input.userId);
    const existing = await this.repository.findPrivateBetween(userId, target.id);
    if (existing) {
      return this.mapConversation(existing, userId);
    }
    return this.mapConversation(await this.repository.createPrivate(input, userId), userId);
  }

  async createPublicConversation(userId: string, input: CreatePublicConversationInput): Promise<ConversationSummary> {
    return this.mapConversation(await this.repository.createPublic(userId, input.name, input.description), userId);
  }

  async joinPublicConversation(userId: string, conversationId: string): Promise<ConversationSummary> {
    const conversation = await this.repository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException("Percakapan tidak ditemukan");
    }
    if (conversation.type !== "PUBLIC") {
      throw new ForbiddenException("Room ini bukan public room");
    }
    await this.repository.addMember(conversationId, userId);
    return this.getConversation(userId, conversationId);
  }

  async getConversation(userId: string, conversationId: string): Promise<ConversationSummary> {
    return this.mapConversation(await this.requireConversation(userId, conversationId), userId);
  }

  async listMessages(userId: string, conversationId: string, cursor: string | undefined, limit: number): Promise<MessagePage> {
    await this.requireMember(conversationId, userId);
    const records = await this.repository.listMessages(conversationId, cursor, limit);
    const hasMore = records.length > limit;
    const page = hasMore ? records.slice(0, limit) : records;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;
    return {
      items: await Promise.all(page.reverse().map((record) => this.mapMessage(record))),
      nextCursor,
    };
  }

  async sendMessage(userId: string, input: MessageSendInput): Promise<Message> {
    await this.requireMember(input.conversationId, userId);
    return this.mapMessage(await this.repository.createMessage(input.conversationId, userId, input.clientMessageId, input.body));
  }

  async assertMember(userId: string, conversationId: string): Promise<void> {
    if (!(await this.repository.isMember(conversationId, userId))) {
      throw new ForbiddenException("Anda bukan anggota percakapan ini");
    }
  }

  async addMember(userId: string, conversationId: string, memberId: string): Promise<void> {
    const conversation = await this.requireConversation(userId, conversationId);
    if (conversation.type !== "PUBLIC") {
      throw new ForbiddenException("Anggota hanya dapat ditambahkan ke public room");
    }
    await this.users.getById(memberId);
    await this.repository.addMember(conversationId, memberId);
  }

  async removeMember(userId: string, conversationId: string, memberId: string): Promise<string> {
    const conversation = await this.requireConversation(userId, conversationId);
    if (userId === memberId) {
      await this.repository.removeMember(conversationId, memberId);
      return memberId;
    }
    if (conversation.type !== "PUBLIC") {
      throw new ForbiddenException("Hanya anggota yang dapat keluar dari private chat");
    }
    const actor = conversation.members.find((member) => member.userId === userId);
    const target = conversation.members.find((member) => member.userId === memberId);
    if (!actor || !["OWNER", "MODERATOR"].includes(actor.role)) {
      throw new ForbiddenException("Anda tidak memiliki izin moderasi");
    }
    if (target?.role === "OWNER") {
      throw new ForbiddenException("Owner room tidak dapat dihapus");
    }
    await this.repository.removeMember(conversationId, memberId);
    return memberId;
  }

  async markRead(userId: string, conversationId: string, messageId?: string): Promise<void> {
    await this.requireMember(conversationId, userId);
    if (!(await this.repository.markRead(conversationId, userId, messageId))) {
      throw new NotFoundException("Pesan tidak ditemukan");
    }
  }

  private async requireConversation(userId: string, conversationId: string): Promise<ConversationRecord> {
    const conversation = await this.repository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException("Percakapan tidak ditemukan");
    }
    await this.assertMember(userId, conversationId);
    return conversation;
  }

  private async requireMember(conversationId: string, userId: string): Promise<void> {
    if (!(await this.repository.isMember(conversationId, userId))) {
      throw new ForbiddenException("Anda bukan anggota percakapan ini");
    }
  }

  private async mapMessage(record: MessageRecord): Promise<Message> {
    return {
      id: record.id,
      conversationId: record.conversationId,
      sender: await this.mapUser(record.sender),
      clientMessageId: record.clientMessageId,
      body: record.body,
      kind: record.kind,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private async mapConversation(record: ConversationRecord, userId: string): Promise<ConversationSummary> {
    const member = record.members.find((item) => item.userId === userId);
    const peerMember = record.type === "PRIVATE" ? record.members.find((item) => item.userId !== userId) : undefined;
    const [lastMessage, unreadCount, peer] = await Promise.all([
      record.messages[0] ? this.mapMessage(record.messages[0]) : null,
      member ? this.repository.countUnread(record.id, userId, member.lastReadMessageId) : Promise.resolve(0),
      peerMember ? this.mapUser(peerMember.user) : Promise.resolve(null),
    ]);
    return {
      id: record.id,
      type: record.type,
      name: record.name,
      description: record.description,
      role: member?.role ?? "MEMBER",
      lastMessage,
      unreadCount,
      memberCount: record._count.members,
      peer,
    };
  }

  private async mapUser(user: { id: string; username: string; displayName: string; avatarUrl: string | null; lastSeenAt: Date | null }): Promise<PublicUser> {
    return this.users.toPublicUser(user);
  }
}
