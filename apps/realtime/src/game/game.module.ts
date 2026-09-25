import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { GameController } from "./game.controller";
import { GameGateway } from "./game.gateway";
import { GameRepository } from "./game.repository";
import { GameService } from "./game.service";

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [GameController],
  providers: [GameRepository, GameService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
