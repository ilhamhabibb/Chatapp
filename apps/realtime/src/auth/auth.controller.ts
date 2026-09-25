import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { serialize } from "cookie";
import type { FastifyReply } from "fastify";
import { AuthUser } from "../common/auth-user";
import { readSessionCookie } from "../common/session-cookie";
import { success } from "../common/http/response";
import { parseInput } from "../common/validation";
import { AuthenticatedRequest, AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from "./auth.schemas";
import { SessionService } from "./session.service";

@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly session: SessionService,
  ) {}

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
    this.setSessionCookie(reply, result.session.token, result.session.expiresIn);
    return success({ user: result.user }, "Login berhasil");
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = readSessionCookie(request.headers.cookie, this.session.createCookieName());
    if (token) {
      await this.auth.destroySession(token);
    }
    reply.header("Set-Cookie", serialize(this.session.createCookieName(), "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0, expires: new Date(0) }));
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

  private setSessionCookie(reply: FastifyReply, token: string, expiresIn: number): void {
    const secure = process.env.NODE_ENV === "production";
    reply.header("Set-Cookie", serialize(this.session.createCookieName(), token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn,
    }));
  }
}
