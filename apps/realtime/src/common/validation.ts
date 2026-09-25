import { HttpException } from "@nestjs/common";
import { z } from "zod";

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  return schema.parse(input);
}

export function getValidationMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(", ");
  }
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === "string") {
      return response;
    }
    const message = (response as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    if (message) {
      return message;
    }
  }
  return "Request tidak valid";
}
