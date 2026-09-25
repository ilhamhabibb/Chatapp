import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, AuthGuard } from "../auth/auth.guard";
import { success } from "../common/http/response";
import { parseInput } from "../common/validation";
import { createGameRoomSchema, gameRoomParamsSchema } from "./game.schemas";
import { GameService } from "./game.service";

@Controller("api/game/rooms")
@UseGuards(AuthGuard)
export class GameController {
  constructor(private readonly game: GameService) {}

  @Get()
  async list() {
    return success(await this.game.listRooms());
  }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const input = parseInput(createGameRoomSchema, body);
    return success(await this.game.createRoom(request.user!.id, input), "Game room berhasil dibuat");
  }

  @Get(":code")
  async get(@Req() request: AuthenticatedRequest, @Param() params: unknown) {
    const { code } = parseInput(gameRoomParamsSchema, params);
    return success(await this.game.getState(code, request.user!.id));
  }

  @Get(":code/results")
  async results(@Req() request: AuthenticatedRequest, @Param() params: unknown) {
    const { code } = parseInput(gameRoomParamsSchema, params);
    return success(await this.game.getResults(code, request.user!.id));
  }
}
