import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  async sendVerification(email: string, token: string): Promise<void> {
    const link = `${this.config.getOrThrow<string>("WEB_ORIGIN")}/verify-email?token=${token}`;
    if (this.config.getOrThrow<string>("EMAIL_PROVIDER") === "console") {
      console.log(`Verification link for ${email}: ${link}`);
      return;
    }
    throw new Error("Email provider belum dikonfigurasi");
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const link = `${this.config.getOrThrow<string>("WEB_ORIGIN")}/reset-password?token=${token}`;
    if (this.config.getOrThrow<string>("EMAIL_PROVIDER") === "console") {
      console.log(`Password reset link for ${email}: ${link}`);
      return;
    }
    throw new Error("Email provider belum dikonfigurasi");
  }
}
