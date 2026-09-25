import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthUser } from "../common/auth-user";
import { SessionService } from "./session.service";

export interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly session: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.session.resolveFromCookie(request.headers.cookie);
    if (!user) {
      throw new UnauthorizedException("Session tidak valid");
    }
    request.user = user;
    return true;
  }
}
