import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RedisModule } from "../redis/redis.module";
import { UsersModule } from "../users/users.module";
import { ChatController } from "./chat.controller";
import { ChatGateway } from "./chat.gateway";
import { ChatRepository } from "./chat.repository";
import { ChatService } from "./chat.service";

@Module({
  imports: [AuthModule, UsersModule, RedisModule],
  controllers: [ChatController],
  providers: [ChatRepository, ChatService, ChatGateway],
  exports: [ChatService, ChatRepository],
})
export class ChatModule {}
