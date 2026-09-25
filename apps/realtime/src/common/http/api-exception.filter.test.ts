import { BadRequestException, ArgumentsHost } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ApiExceptionFilter } from "./api-exception.filter";

describe("ApiExceptionFilter", () => {
  it("returns the standard API error shape", () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
    const filter = new ApiExceptionFilter();

    filter.catch(new BadRequestException("Input salah"), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "HTTP_ERROR",
        message: "Input salah",
      },
    });
  });
});
