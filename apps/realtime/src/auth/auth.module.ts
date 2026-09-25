import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { MailService } from "./mail.service";
import { SessionService } from "./session.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, MailService, SessionService],
  exports: [AuthGuard, AuthService, SessionService],
})
export class AuthModule {}
