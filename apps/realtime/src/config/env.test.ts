import { afterEach, describe, expect, it } from "vitest";
import {
  gatewayOriginChecker,
  getAllowedOrigins,
  isOriginAllowed,
  isCookieSecure,
  isPrivateOriginAllowed,
  validateEnv,
} from "./env";

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

describe("origin allowlist", () => {
  it("accepts exactly the configured origins", () => {
    const allowed = getAllowedOrigins("https://app.example, https://admin.example");
    expect(isOriginAllowed("https://app.example", allowed)).toBe(true);
    expect(isOriginAllowed("https://admin.example", allowed)).toBe(true);
    expect(isOriginAllowed("https://evil.example", allowed)).toBe(false);
  });

  it("does not treat a prefix match as a match", () => {
    const allowed = getAllowedOrigins("https://app.example");
    expect(isOriginAllowed("https://app.example.evil.test", allowed)).toBe(false);
    expect(isOriginAllowed("https://app.example:8443", allowed)).toBe(false);
  });

  it("allows requests without an Origin header (non-browser clients)", () => {
    expect(isOriginAllowed(undefined, getAllowedOrigins("https://app.example"))).toBe(true);
  });

  it("permits private-network origins only when explicitly enabled", () => {
    const lan = "http://192.168.0.104:3000";
    expect(isOriginAllowed(lan, getAllowedOrigins("https://app.example", true))).toBe(true);
    expect(isOriginAllowed(lan, getAllowedOrigins("https://app.example", false))).toBe(false);
  });

  it("defaults private origins to off in production and on otherwise", () => {
    expect(isPrivateOriginAllowed("production", undefined)).toBe(false);
    expect(isPrivateOriginAllowed("development", undefined)).toBe(true);
    expect(isPrivateOriginAllowed("production", "true")).toBe(true);
    expect(isPrivateOriginAllowed("development", "false")).toBe(false);
  });
});

describe("gatewayOriginChecker", () => {
  it("resolves the allowlist from the process environment", () => {
    process.env.NODE_ENV = "production";
    process.env.WEB_ORIGIN = "https://app.example";
    process.env.ALLOW_PRIVATE_ORIGIN = "false";
    const check = gatewayOriginChecker();
    const decide = (origin?: string) => {
      let allowed: boolean | undefined;
      check(origin, (_error, value) => {
        allowed = value;
      });
      return allowed;
    };
    expect(decide("https://app.example")).toBe(true);
    expect(decide("http://192.168.0.104:3000")).toBe(false);
    expect(decide("https://evil.example")).toBe(false);
  });

  it("fails closed in production when WEB_ORIGIN is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.WEB_ORIGIN;
    expect(() => gatewayOriginChecker()).toThrow(/WEB_ORIGIN/);
  });
});

describe("isCookieSecure", () => {
  it("defaults to on in production and off elsewhere", () => {
    expect(isCookieSecure("production")).toBe(true);
    expect(isCookieSecure("development")).toBe(false);
    expect(isCookieSecure("test")).toBe(false);
  });

  it("honours an explicit value in development", () => {
    expect(isCookieSecure("development", "true")).toBe(true);
    expect(isCookieSecure("development", "false")).toBe(false);
  });

  it("never allows production to be turned off", () => {
    expect(isCookieSecure("production", "false")).toBe(false);
  });
});

describe("validateEnv", () => {
  const base = {
    DATABASE_URL: "postgresql://localhost:5432/db",
    REDIS_URL: "redis://localhost:6379",
  };

  it("rejects the console mail provider in production", () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: "production", EMAIL_PROVIDER: "console", WEB_ORIGIN: "https://app.example" }),
    ).toThrow(/EMAIL_PROVIDER/);
  });

  it("requires WEB_ORIGIN in production", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production" })).toThrow(/WEB_ORIGIN/);
  });

  it("refuses a non-secure session cookie in production", () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: "production",
        WEB_ORIGIN: "https://app.example",
        COOKIE_SECURE: "false",
      }),
    ).toThrow(/COOKIE_SECURE/);
  });

  it("refuses to boot in production while only the console mail provider exists", () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: "production", WEB_ORIGIN: "https://app.example" }),
    ).toThrow(/EMAIL_PROVIDER/);
  });

  it("accepts a development environment without extra configuration", () => {
    expect(validateEnv({ ...base }).NODE_ENV).toBe("development");
  });
});
