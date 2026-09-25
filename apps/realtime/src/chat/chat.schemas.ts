import { z } from "zod";

const conversationId = z.string().uuid();
const clientMessageId = z.string().uuid();

export const createPrivateConversationSchema = z.object({
  userId: z.string().uuid(),
});

export const createPublicConversationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(280).optional(),
});

export const conversationParamsSchema = z.object({ conversationId });

export const conversationMemberParamsSchema = z.object({
  conversationId,
  userId: z.string().uuid(),
});

export const publicConversationSearchSchema = z.object({
  search: z.string().trim().max(80).optional(),
});

export const messageSendSchema = z.object({
  conversationId,
  clientMessageId,
  body: z.string().trim().min(1).max(2000),
});

export const typingSchema = z.object({ conversationId });
export const readSchema = z.object({ conversationId, messageId: z.string().uuid().optional() });
export const messageListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export type CreatePrivateConversationInput = z.infer<typeof createPrivateConversationSchema>;
export type CreatePublicConversationInput = z.infer<typeof createPublicConversationSchema>;
export type MessageSendInput = z.infer<typeof messageSendSchema>;
