import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { getAllowedOrigins } from "./config/env";
import { ApiExceptionFilter } from "./common/http/api-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ bodyLimit: 1_048_576 }));
  const config = app.get(ConfigService);
  app.useGlobalFilters(new ApiExceptionFilter());
  const webOrigin = config.getOrThrow<string>("WEB_ORIGIN");
  app.enableCors({ origin: getAllowedOrigins(webOrigin), credentials: true });
  app.enableShutdownHooks();

  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    return payload;
  });

  const port = config.getOrThrow<number>("PORT");
  await app.listen(port, "0.0.0.0");
  console.log(`Realtime service listening on ${port}`);
}

void bootstrap();
