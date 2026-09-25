import { z } from "zod";

export const createGameRoomSchema = z.object({
  roundDurationSeconds: z.coerce.number().int().min(30).max(180).default(90),
});

export const gameRoomParamsSchema = z.object({
  code: z.string().trim().min(4).max(12).regex(/^[A-Z0-9]+$/),
});

export const gameInputSchema = z.object({
  x: z.coerce.number().min(-1).max(1),
  y: z.coerce.number().min(-1).max(1),
  sequence: z.coerce.number().int().min(0),
});

export const gameReadySchema = z.object({
  ready: z.boolean(),
});

export const gameRoomJoinSchema = z.object({
  code: z.string().trim().min(4).max(12).transform((value) => value.toUpperCase()),
});

export type CreateGameRoomInput = z.infer<typeof createGameRoomSchema>;
