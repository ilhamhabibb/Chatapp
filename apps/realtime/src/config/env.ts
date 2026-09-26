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
  ALLOW_PRIVATE_ORIGIN: z.enum(["true", "false"]).optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

const PRIVATE_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d{1,5})?$/;

export function validateEnv(config: Record<string, unknown>): AppConfig {
  const parsed = envSchema.parse(config);
  if (parsed.NODE_ENV === "production") {
    if (!config.WEB_ORIGIN) {
      throw new Error("WEB_ORIGIN wajib diisi saat NODE_ENV=production");
    }
    if (!isCookieSecure(parsed.NODE_ENV, parsed.COOKIE_SECURE)) {
      // A non-secure session cookie in production lets any network attacker
      // read the session token and hijack the account.
      throw new Error("COOKIE_SECURE tidak boleh=false saat NODE_ENV=production");
    }
    if (parsed.EMAIL_PROVIDER === "console") {
      // The console provider writes live password-reset tokens to stdout, which
      // in production means into the log aggregator. A real provider must be
      // implemented and selected before this app can be deployed.
      throw new Error("EMAIL_PROVIDER=console tidak boleh dipakai saat NODE_ENV=production");
    }
  }
  return parsed;
}

/**
 * `Secure` is tied to the scheme the *browser* uses, not to the port this
 * process listens on, so it cannot be derived from anything the server sees at
 * runtime. Production defaults it on, but a deployment that terminates TLS in
 * front of a plain-HTTP origin still needs `true` (the default) — only an
 * explicitly insecure local setup may turn it off.
 */
export function isCookieSecure(nodeEnv: string, explicit?: string): boolean {
  if (explicit === "false") return false;
  return nodeEnv === "production" ? true : explicit === "true";
}

export function isPrivateOriginAllowed(nodeEnv: string, explicit?: string): boolean {
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return nodeEnv !== "production";
}

export function getAllowedOrigins(webOrigin: string, allowPrivateNetwork = false): (string | RegExp)[] {
  const origins = webOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return allowPrivateNetwork ? [...origins, PRIVATE_ORIGIN] : origins;
}

export function isOriginAllowed(origin: string | undefined, allowed: (string | RegExp)[]): boolean {
  if (origin === undefined) {
    return true;
  }
  return allowed.some((entry) => (typeof entry === "string" ? entry === origin : entry.test(origin)));
}

/**
 * Same-origin helper for the Socket.IO gateways. The `@WebSocketGateway`
 * decorator is evaluated while the module is being loaded, which happens
 * before Nest validates `ConfigModule`, so this reads `process.env` directly.
 * Keeping the logic here guarantees the gateways and the REST surface apply
 * exactly the same origin policy.
 */
export function gatewayOriginChecker(): (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const webOrigin = process.env.WEB_ORIGIN;
  if (!webOrigin && nodeEnv === "production") {
    // Fail closed: silently falling back to localhost + every private-network
    // address would accept any LAN host in a production deployment.
    throw new Error("WEB_ORIGIN wajib diisi saat NODE_ENV=production");
  }
  const allowed = getAllowedOrigins(
    webOrigin ?? "http://localhost:3000",
    isPrivateOriginAllowed(nodeEnv, process.env.ALLOW_PRIVATE_ORIGIN),
  );
  return (origin, callback) => callback(null, isOriginAllowed(origin, allowed));
}
