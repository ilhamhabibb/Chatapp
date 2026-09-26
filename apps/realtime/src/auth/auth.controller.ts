import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { serialize } from "cookie";
import type { FastifyReply } from "fastify";
import { AuthUser } from "../common/auth-user";
import { readSessionCookie } from "../common/session-cookie";
import { success } from "../common/http/response";
import { parseInput } from "../common/validation";
import { isCookieSecure, type AppConfig } from "../config/env";
import { AuthenticatedRequest, AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from "./auth.schemas";
import { SessionService } from "./session.service";

@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly session: SessionService,
    @Inject(ConfigService) private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Single source of truth for the session cookie. Login, logout and any future
   * refresh path must agree on `httpOnly`/`sameSite`/`secure`; duplicating the
   * literal is how a logout cookie silently ends up weaker than the login one.
   */
  private writeSessionCookie(reply: FastifyReply, value: string, maxAge: number): void {
    reply.header(
      "Set-Cookie",
      serialize(this.session.createCookieName(), value, {
        httpOnly: true,
        secure: isCookieSecure(this.config.get("NODE_ENV"), this.config.get("COOKIE_SECURE")),
        sameSite: "lax",
        path: "/",
        maxAge,
        ...(maxAge === 0 ? { expires: new Date(0) } : {}),
      }),
    );
  }

  @Post("register")
  async register(@Body() body: unknown) {
    const result = await this.auth.register(parseInput(registerSchema, body));
    return success(result, "Akun berhasil dibuat");
  }

  @Post("verify-email")
  async verifyEmail(@Body() body: unknown) {
    const user = await this.auth.verifyEmail(parseInput(verifyEmailSchema, body));
    return success(user, "Email berhasil diverifikasi");
  }

  @Post("login")
  async login(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.auth.login(parseInput(loginSchema, body));
    if (!result.session) {
      throw new Error("Session tidak dibuat");
    }
    this.writeSessionCookie(reply, result.session.token, result.session.expiresIn);
    return success({ user: result.user }, "Login berhasil");
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = readSessionCookie(request.headers.cookie, this.session.createCookieName());
    if (token) {
      await this.auth.destroySession(token);
    }
    this.writeSessionCookie(reply, "", 0);
    return success(null, "Logout berhasil");
  }

  @Post("forgot-password")
  async forgotPassword(@Body() body: unknown) {
    await this.auth.requestPasswordReset(parseInput(forgotPasswordSchema, body));
    return success(null, "Jika email terdaftar, tautan reset akan dikirim");
  }

  @Post("reset-password")
  async resetPassword(@Body() body: unknown) {
    await this.auth.resetPassword(parseInput(resetPasswordSchema, body));
    return success(null, "Password berhasil diubah");
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async me(@Req() request: AuthenticatedRequest) {
    const user = request.user as AuthUser;
    return success(user);
  }

}
