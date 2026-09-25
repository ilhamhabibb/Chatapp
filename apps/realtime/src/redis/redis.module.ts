import { Global, Inject, Injectable, Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.client = new Redis(this.config.getOrThrow<string>("REDIS_URL"), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, "EX", ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async addPresence(userId: string, connectionId: string, ttlSeconds: number): Promise<number> {
    const key = this.presenceKey(userId);
    const now = Date.now();
    const transaction = this.client.multi();
    transaction.zadd(key, now, connectionId);
    transaction.expire(key, ttlSeconds);
    await transaction.exec();
    return this.client.zcard(key);
  }

  async refreshPresence(userId: string, connectionId: string, ttlSeconds: number): Promise<void> {
    const key = this.presenceKey(userId);
    const refreshed = await this.client.zadd(key, "XX", "CH", Date.now(), connectionId);
    if (refreshed === 0) {
      await this.addPresence(userId, connectionId, ttlSeconds);
      return;
    }
    await this.client.expire(key, ttlSeconds);
  }

  async removePresence(userId: string, connectionId: string): Promise<number> {
    const key = this.presenceKey(userId);
    await this.client.zrem(key, connectionId);
    const count = await this.client.zcard(key);
    if (count === 0) {
      await this.client.del(key);
    } else {
      await this.client.expire(key, 60);
    }
    return count;
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.client.zcard(this.presenceKey(userId))) > 0;
  }

  private presenceKey(userId: string): string {
    return `presence:${userId}`;
  }
}

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
