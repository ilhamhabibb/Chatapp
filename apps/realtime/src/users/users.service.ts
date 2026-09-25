import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.module";
import { AuthUser } from "../common/auth-user";
import { PublicUser } from "@chating/contracts";
import { UpdateProfileInput } from "./user.schemas";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User tidak ditemukan");
    }
    return this.toPublicUser(user);
  }

  async getById(userId: string): Promise<PublicUser> {
    return this.getProfile(userId);
  }

  async getByUsername(username: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (!user) {
      throw new NotFoundException("User tidak ditemukan");
    }
    return this.toPublicUser(user);
  }

  async search(query: string): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query.toLowerCase(), mode: "insensitive" } },
          { displayName: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { username: "asc" },
      take: 10,
    });
    return Promise.all(users.map((user) => this.toPublicUser(user)));
  }

  async markOffline(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
        ...(input.avatarUrl === undefined ? {} : { avatarUrl: input.avatarUrl }),
      },
    });
    return this.toPublicUser(user);
  }

  async toPublicUser(user: { id: string; username: string; displayName: string; avatarUrl: string | null; lastSeenAt: Date | null }): Promise<PublicUser> {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isOnline: await this.redis.isOnline(user.id),
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    };
  }

  async toAuthUser(user: AuthUser): Promise<PublicUser> {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isOnline: await this.redis.isOnline(user.id),
      lastSeenAt: user.lastSeenAt,
    };
  }
}
