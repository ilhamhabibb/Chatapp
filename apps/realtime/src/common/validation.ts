import { HttpException } from "@nestjs/common";
import { z } from "zod";

const { localeError: idLocaleError } = z.locales.id();

/**
 * `getValidationMessage` forwards `issue.message` straight to the user, and
 * Zod's default wording is English and leaks type names ("expected string to
 * have <=2000 characters", "received undefined"). Every UI string in this app
 * is Indonesian, so the most common limit/format issues get natural phrasing
 * and anything unhandled falls back to Zod's own Indonesian locale.
 *
 * A message supplied on the validator itself (e.g. the username regex) still
 * wins, because Zod only consults the error map when no custom message exists.
 */
// Only the fields this function reads are described, so the code does not
// depend on Zod's internal issue type names.
type ValidationIssue = {
  code: string;
  input?: unknown;
  origin?: string;
  maximum?: number;
  minimum?: number;
  format?: string;
};

function userFacingMessage(issue: ValidationIssue): string | undefined {
  if (issue.code === "too_big") {
    if (issue.origin === "string") return `Maksimal ${issue.maximum} karakter`;
    if (issue.origin === "array") return `Maksimal ${issue.maximum} item`;
    return `Nilai terlalu besar (maksimal ${issue.maximum})`;
  }
  if (issue.code === "too_small") {
    if (issue.origin === "string") return `Minimal ${issue.minimum} karakter`;
    if (issue.origin === "array") return `Minimal ${issue.minimum} item`;
    return `Nilai terlalu kecil (minimal ${issue.minimum})`;
  }
  if (issue.code === "invalid_format") {
    const labels: Record<string, string> = {
      email: "Format email tidak valid",
      uuid: "ID tidak valid",
      url: "URL tidak valid",
      regex: "Format tidak sesuai",
      datetime: "Tanggal/waktu tidak valid",
    };
    return labels[String(issue.format)];
  }
  if (issue.code === "invalid_type") {
    if (issue.input === undefined) return "Wajib diisi";
    return "Nilai tidak valid";
  }
  return undefined;
}

z.config({
  customError: (issue) =>
    userFacingMessage(issue as ValidationIssue) ?? idLocaleError(issue as never),
});

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
