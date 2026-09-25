import { Controller, Get } from "@nestjs/common";
import { success } from "../common/http/response";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return success({ status: "ok" });
  }
}
