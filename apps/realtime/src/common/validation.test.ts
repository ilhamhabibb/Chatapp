import { describe, expect, it } from "vitest";
import { messageSendSchema } from "../chat/chat.schemas";
import { createPublicConversationSchema } from "../chat/chat.schemas";
import { registerSchema } from "../auth/auth.schemas";
import { userSearchQuerySchema } from "../users/user.schemas";
import { getValidationMessage, parseInput } from "./validation";

const message = (body: string) => parseInput(messageSendSchema, {
  conversationId: "0f8fad5b-d9cb-469f-a165-70867728950e",
  clientMessageId: "0f8fad5b-d9cb-469f-a165-70867728950f",
  body,
});

const failWith = (input: string) => {
  try {
    message(input);
  } catch (error) {
    return getValidationMessage(error);
  }
  throw new Error("d_EXPECTED_VALIDATION_ERROR");
};

describe("user-facing validation messages", () => {
  it("never leaks Zod's English default wording", () => {
    const messages = [
      failWith("y".repeat(2001)),
      failWith(" "),
      failWith(""),
    ];
    for (const text of messages) {
      expect(text).not.toMatch(/expected|received|characters|Too (big|small)|string|number/i);
    }
  });

  it("describes length limits in plain Indonesian", () => {
    expect(failWith("y".repeat(2001))).toBe("Maksimal 2000 karakter");
    expect(failWith(" ")).toBe("Minimal 1 karakter");
    expect(failWith("")).toBe("Minimal 1 karakter");
  });

  it("flags missing required fields without naming a JS type", () => {
    let message = "";
    try {
      parseInput(messageSendSchema, {});
    } catch (error) {
      message = getValidationMessage(error);
    }
    expect(message).toContain("Wajib diisi");
    expect(message).not.toMatch(/undefined|string|object/i);
  });

  it("translates format failures", () => {
    const uuidMessage = (() => {
      try {
        parseInput(messageSendSchema, { conversationId: "not-a-uuid", clientMessageId: "x", body: "hi" });
      } catch (error) {
        return getValidationMessage(error);
      }
      return "";
    })();
    expect(uuidMessage).toContain("ID tidak valid");
    expect(uuidMessage).not.toMatch(/uuid/i);
  });

  it("keeps a message written on the validator itself", () => {
    let message = "";
    try {
      parseInput(registerSchema, {
        email: "bunga@demo.local",
        username: "nama tidak valid!",
        displayName: "Bunga",
        password: "password123",
      });
    } catch (error) {
      message = getValidationMessage(error);
    }
    expect(message).toBe("Username hanya boleh berisi huruf, angka, dan underscore");
  });

  it("covers the other request schemas too", () => {
    const cases: [() => unknown, RegExp][] = [
      [() => parseInput(createPublicConversationSchema, { name: "a" }), /Minimal 2 karakter/],
      [() => parseInput(createPublicConversationSchema, { name: "x".repeat(81) }), /Maksimal 80 karakter/],
      [() => parseInput(registerSchema, { email: "bukan-email", username: "bunga", displayName: "Bunga", password: "password123" }), /Format email tidak valid/],
      [() => parseInput(registerSchema, { email: "b@demo.local", username: "bunga", displayName: "B", password: "password123" }), /Minimal 2 karakter/],
      [() => parseInput(registerSchema, { email: "b@demo.local", username: "bunga", displayName: "Bunga", password: "pendek" }), /Minimal 8 karakter/],
    ];
    for (const [run, expected] of cases) {
      let message = "";
      try {
        run();
      } catch (error) {
        message = getValidationMessage(error);
      }
      expect(message).toMatch(expected);
      expect(message).not.toMatch(/expected|received|characters/i);
    }
  });

  it("does not break the user search query schema", () => {
    expect(parseInput(userSearchQuerySchema, { query: "bung" }).query).toBe("bung");
  });
});
