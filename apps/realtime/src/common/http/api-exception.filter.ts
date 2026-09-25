import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { z } from "zod";
import { failure } from "./response";
import { getValidationMessage } from "../validation";

interface NormalizedError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const normalized = this.normalize(exception);
    if (normalized.status >= 500) {
      this.logger.error("Unhandled HTTP exception");
    }
    const response = host.switchToHttp().getResponse<FastifyReply>();
    response.status(normalized.status).send(failure(normalized.code, normalized.message, normalized.details));
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof z.ZodError) {
      return {
        status: 400,
        code: "VALIDATION_ERROR",
        message: getValidationMessage(exception),
        details: exception.issues,
      };
    }
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const code = this.responseCode(response);
      return {
        status: exception.getStatus(),
        code,
        message: getValidationMessage(exception),
      };
    }
    return {
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan pada server",
    };
  }

  private responseCode(response: string | object): string {
    if (typeof response === "object" && response !== null && "code" in response && typeof response.code === "string") {
      return response.code;
    }
    return "HTTP_ERROR";
  }
}
