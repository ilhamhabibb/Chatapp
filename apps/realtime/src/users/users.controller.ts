import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, AuthGuard } from "../auth/auth.guard";
import { success } from "../common/http/response";
import { parseInput } from "../common/validation";
import { updateProfileSchema, userSearchQuerySchema, usernameParamsSchema } from "./user.schemas";
import { UsersService } from "./users.service";

@Controller("api/users")
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch("me")
  async updateMe(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const user = await this.users.updateProfile(request.user!.id, parseInput(updateProfileSchema, body));
    return success(user, "Profil berhasil diperbarui");
  }

  @Get()
  async search(@Query() query: unknown) {
    const { query: searchQuery } = parseInput(userSearchQuerySchema, query);
    return success(await this.users.search(searchQuery));
  }

  @Get(":username")
  async getProfile(@Param() params: unknown) {
    const { username } = parseInput(usernameParamsSchema, params);
    return success(await this.users.getByUsername(username));
  }
}
