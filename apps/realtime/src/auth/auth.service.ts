import { createHash, randomBytes } from "node:crypto";
import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.module";
import { AuthUser } from "../common/auth-user";
import { MailService } from "./mail.service";
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.schemas";

interface SessionResult {
  token: string;
  expiresIn: number;
}

interface AuthResult {
  user: AuthUser;
  session?: SessionResult;
  devVerificationToken?: string;
}

/**
 * A real argon2id hash of an unguessable value. Verifying against it when the
 * email is unknown keeps the failure path's cost equal to the success path, so
 * response timing does not reveal whether an account exists.
 */
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$H1vmTZfRM9ctchyx/10QHQ$/zy4KtBdxO8vt33WLuAKHQSaHga4jWuGZvomb43JYg0";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
      select: { email: true, username: true },
    });
    if (existing) {
      throw new ConflictException("Email atau username sudah digunakan");
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash: await argon2.hash(input.password),
      },
    });
    const token = await this.createAuthToken(user.id, "EMAIL_VERIFICATION");
    await this.mail.sendVerification(user.email, token);

    const result: AuthResult = { user: this.toAuthUser(user) };
    if (this.config.getOrThrow<string>("NODE_ENV") !== "production") {
      result.devVerificationToken = token;
    }
    return result;
  }

  async verifyEmail(input: VerifyEmailInput): Promise<AuthUser> {
    const tokenRecord = await this.prisma.authToken.findUnique({ where: { tokenHash: this.hashToken(input.token) } });
    if (!tokenRecord || tokenRecord.type !== "EMAIL_VERIFICATION" || tokenRecord.usedAt || tokenRecord.expiresAt <= new Date()) {
      throw new UnauthorizedException("Token verifikasi tidak valid");
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.authToken.updateMany({
        where: { id: tokenRecord.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new UnauthorizedException("Token verifikasi tidak valid");
      }
      return tx.user.update({ where: { id: tokenRecord.userId }, data: { emailVerifiedAt: new Date() } });
    });
    return this.toAuthUser(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    // Verify against a throwaway hash when the account is unknown, otherwise the
    // missing-argon2-work timing difference confirms whether the email exists.
    const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordMatches = await argon2.verify(hash, input.password);
    if (!user || !passwordMatches) {
      throw new UnauthorizedException("Email atau password salah");
    }
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException("Verifikasi email sebelum login");
    }
    return { user: this.toAuthUser(user), session: await this.createSession(user.id) };
  }

  async requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      return;
    }
    const token = await this.createAuthToken(user.id, "PASSWORD_RESET");
    await this.mail.sendPasswordReset(user.email, token);
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenRecord = await this.prisma.authToken.findUnique({ where: { tokenHash: this.hashToken(input.token) } });
    if (!tokenRecord || tokenRecord.type !== "PASSWORD_RESET" || tokenRecord.usedAt || tokenRecord.expiresAt <= new Date()) {
      throw new UnauthorizedException("Token reset tidak valid");
    }
    const passwordHash = await argon2.hash(input.password);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.authToken.updateMany({
        where: { id: tokenRecord.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new UnauthorizedException("Token reset tidak valid");
      }
      await tx.user.update({ where: { id: tokenRecord.userId }, data: { passwordHash } });
    });
    // A reset triggered by a compromise must also evict the attacker's session.
    await this.revokeUserSessions(tokenRecord.userId);
  }

  async createSession(userId: string): Promise<SessionResult> {
    const token = randomBytes(32).toString("base64url");
    const expiresIn = this.config.getOrThrow<number>("SESSION_TTL_SECONDS");
    await this.redis.set(this.sessionKey(token), userId, expiresIn);
    await this.redis.addToSet(this.sessionIndexKey(userId), this.sessionKey(token), expiresIn);
    return { token, expiresIn };
  }

  /** Drops every session belonging to a user, e.g. after a password reset. */
  async revokeUserSessions(userId: string): Promise<void> {
    const indexKey = this.sessionIndexKey(userId);
    const keys = await this.redis.membersOfSet(indexKey);
    if (keys.length > 0) {
      await this.redis.deleteMany(keys);
    }
    await this.redis.deleteSet(indexKey);
  }

  async resolveSession(token: string): Promise<AuthUser | null> {
    const userId = await this.redis.get(this.sessionKey(token));
    if (!userId) {
      return null;
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await this.redis.delete(this.sessionKey(token));
      return null;
    }
    return this.toAuthUser(user);
  }

  async destroySession(token: string): Promise<void> {
    const key = this.sessionKey(token);
    const userId = await this.redis.get(key);
    await this.redis.delete(key);
    if (userId) {
      await this.redis.removeFromSet(this.sessionIndexKey(userId), key);
    }
  }

  async getUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User tidak ditemukan");
    }
    return this.toAuthUser(user);
  }

  private async createAuthToken(userId: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET"): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await this.prisma.authToken.create({
      data: {
        userId,
        type,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return token;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private sessionKey(token: string): string {
    return `session:${createHash("sha256").update(token).digest("hex")}`;
  }

  private sessionIndexKey(userId: string): string {
    return `sessions:user:${userId}`;
  }

  private toAuthUser(user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    emailVerifiedAt: Date | null;
    lastSeenAt: Date | null;
  }): AuthUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      emailVerified: user.emailVerifiedAt !== null,
      avatarUrl: user.avatarUrl,
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    };
  }
}
