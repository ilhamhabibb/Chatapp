import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, AuthGuard } from "../auth/auth.guard";
import { success } from "../common/http/response";
import { parseInput } from "../common/validation";
import { ChatService } from "./chat.service";
import {
  conversationMemberParamsSchema,
  conversationParamsSchema,
  createPrivateConversationSchema,
  createPublicConversationSchema,
  messageListQuerySchema,
  publicConversationSearchSchema,
} from "./chat.schemas";

@Controller("api/conversations")
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return success(await this.chat.listConversations(request.user!.id));
  }

  @Get("public")
  async listPublic(@Req() request: AuthenticatedRequest, @Query() query: unknown) {
    const { search } = parseInput(publicConversationSearchSchema, query);
    return success(await this.chat.listPublicConversations(request.user!.id, search));
  }

  @Post("private")
  async createPrivate(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const input = parseInput(createPrivateConversationSchema, body);
    return success(await this.chat.createPrivateConversation(request.user!.id, input), "Private chat siap digunakan");
  }

  @Post("public")
  async createPublic(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const input = parseInput(createPublicConversationSchema, body);
    return success(await this.chat.createPublicConversation(request.user!.id, input), "Public room berhasil dibuat");
  }

  @Get(":conversationId")
  async get(@Req() request: AuthenticatedRequest, @Param() params: unknown) {
    const { conversationId } = parseInput(conversationParamsSchema, params);
    return success(await this.chat.getConversation(request.user!.id, conversationId));
  }

  @Get(":conversationId/messages")
  async messages(@Req() request: AuthenticatedRequest, @Param() params: unknown, @Query() query: unknown) {
    const { conversationId } = parseInput(conversationParamsSchema, params);
    const input = parseInput(messageListQuerySchema, query);
    return success(await this.chat.listMessages(request.user!.id, conversationId, input.cursor, input.limit));
  }

  @Get(":conversationId/members")
  async members(@Req() request: AuthenticatedRequest, @Param() params: unknown) {
    const { conversationId } = parseInput(conversationParamsSchema, params);
    return success(await this.chat.listMembers(request.user!.id, conversationId));
  }

  @Post(":conversationId/join")
  async joinPublic(@Req() request: AuthenticatedRequest, @Param() params: unknown) {
    const { conversationId } = parseInput(conversationParamsSchema, params);
    return success(await this.chat.joinPublicConversation(request.user!.id, conversationId), "Berhasil bergabung ke public room");
  }

  @Post(":conversationId/members")
  async addMember(@Req() request: AuthenticatedRequest, @Param() params: unknown, @Body() body: unknown) {
    const { conversationId } = parseInput(conversationParamsSchema, params);
    const input = parseInput(createPrivateConversationSchema, body);
    await this.chat.addMember(request.user!.id, conversationId, input.userId);
    return success(null, "Anggota berhasil ditambahkan");
  }

  @Delete(":conversationId/members/:userId")
  async removeMember(@Req() request: AuthenticatedRequest, @Param() params: unknown) {
    const { conversationId, userId } = parseInput(conversationMemberParamsSchema, params);
    await this.chat.removeMember(request.user!.id, conversationId, userId);
    return success(null, "Anggota berhasil dihapus");
  }
}
