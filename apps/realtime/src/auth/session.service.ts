import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readSessionCookie } from "../common/session-cookie";
import { AuthService } from "./auth.service";
import { AuthUser } from "../common/auth-user";

@Injectable()
export class SessionService {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  createCookieName(): string {
    return this.config.getOrThrow<string>("SESSION_COOKIE_NAME");
  }

  async resolveFromCookie(cookieHeader: string | undefined | null): Promise<AuthUser | null> {
    const token = readSessionCookie(cookieHeader, this.createCookieName());
    return token ? this.auth.resolveSession(token) : null;
  }

  async resolveToken(token: string): Promise<AuthUser | null> {
    return this.auth.resolveSession(token);
  }
}
