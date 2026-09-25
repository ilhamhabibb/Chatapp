import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
});

export const usernameParamsSchema = z.object({
  username: z.string().trim().min(3).max(32),
});

export const userSearchQuerySchema = z.object({
  query: z.string().trim().min(1).max(80),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
