import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().min(1).default("chating_session"),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  EMAIL_PROVIDER: z.enum(["console"]).default("console"),
  EMAIL_FROM: z.string().email().default("no-reply@example.test"),
  EMAIL_API_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppConfig {
  return envSchema.parse(config);
}

export function getAllowedOrigins(webOrigin: string): string[] {
  return webOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
