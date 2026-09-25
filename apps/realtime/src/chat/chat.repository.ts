import { Injectable } from "@nestjs/common";
import { Prisma, MessageKind, ConversationRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePrivateConversationInput } from "./chat.schemas";

const conversationInclude = {
  members: { include: { user: true } },
  messages: {
    take: 1,
    orderBy: { createdAt: "desc" as const },
    include: { sender: true },
  },
  _count: { select: { members: true } },
};

const messageInclude = { sender: true } satisfies Prisma.MessageInclude;

export type ConversationRecord = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;
export type MessageRecord = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<ConversationRecord[]> {
    return this.prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      include: conversationInclude,
      orderBy: { updatedAt: "desc" },
    });
  }

  async findById(conversationId: string): Promise<ConversationRecord | null> {
    return this.prisma.conversation.findUnique({ where: { id: conversationId }, include: conversationInclude });
  }

  async listPublic(search?: string): Promise<ConversationRecord[]> {
    return this.prisma.conversation.findMany({
      where: {
        type: "PUBLIC",
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }] } : {}),
      },
      include: conversationInclude,
      orderBy: { updatedAt: "desc" },
      take: 30,
    });
  }

  async findPrivateBetween(firstUserId: string, secondUserId: string): Promise<ConversationRecord | null> {
    return this.prisma.conversation.findFirst({
      where: {
        type: "PRIVATE",
        AND: [{ members: { some: { userId: firstUserId } } }, { members: { some: { userId: secondUserId } } }],
      },
      include: conversationInclude,
    });
  }

  async createPrivate(input: CreatePrivateConversationInput, ownerId: string): Promise<ConversationRecord> {
    return this.prisma.conversation.create({
      data: {
        type: "PRIVATE",
        ownerId,
        members: {
          create: [
            { userId: ownerId, role: ConversationRole.OWNER },
            { userId: input.userId, role: ConversationRole.MEMBER },
          ],
        },
      },
      include: conversationInclude,
    });
  }

  async createPublic(ownerId: string, name: string, description?: string): Promise<ConversationRecord> {
    return this.prisma.conversation.create({
      data: {
        type: "PUBLIC",
        ownerId,
        name,
        ...(description === undefined ? {} : { description }),
        members: { create: { userId: ownerId, role: ConversationRole.OWNER } },
      },
      include: conversationInclude,
    });
  }

  async listMemberIds(conversationId: string): Promise<string[]> {
    return this.prisma.conversationMember.findMany({ where: { conversationId }, select: { userId: true } }).then((members) => members.map((member) => member.userId));
  }

  async countUnread(conversationId: string, userId: string, lastReadMessageId: string | null): Promise<number> {
    if (!lastReadMessageId) {
      return this.prisma.message.count({ where: { conversationId, senderId: { not: userId }, deletedAt: null } });
    }
    const lastRead = await this.prisma.message.findFirst({ where: { id: lastReadMessageId, conversationId }, select: { createdAt: true } });
    if (!lastRead) {
      return 0;
    }
    return this.prisma.message.count({ where: { conversationId, senderId: { not: userId }, deletedAt: null, createdAt: { gt: lastRead.createdAt } } });
  }

  async isMember(conversationId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    return member !== null;
  }

  async addMember(conversationId: string, userId: string): Promise<void> {
    await this.prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      update: {},
      create: { conversationId, userId, role: ConversationRole.MEMBER },
    });
  }

  async removeMember(conversationId: string, userId: string): Promise<void> {
    await this.prisma.conversationMember.deleteMany({ where: { conversationId, userId } });
  }

  async listMessages(conversationId: string, cursor: string | undefined, limit: number): Promise<MessageRecord[]> {
    return this.prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }

  async createMessage(conversationId: string, senderId: string, clientMessageId: string, body: string): Promise<MessageRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const message = await transaction.message.upsert({
        where: { conversationId_senderId_clientMessageId: { conversationId, senderId, clientMessageId } },
        update: {},
        create: { conversationId, senderId, clientMessageId, body, kind: MessageKind.TEXT },
        include: messageInclude,
      });
      await transaction.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return message;
    });
  }

  async markRead(conversationId: string, userId: string, messageId?: string): Promise<boolean> {
    if (messageId) {
      const message = await this.prisma.message.findFirst({ where: { id: messageId, conversationId }, select: { id: true } });
      if (!message) {
        return false;
      }
    }
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: messageId ? { lastReadMessageId: messageId } : {},
    });
    return true;
  }
}
