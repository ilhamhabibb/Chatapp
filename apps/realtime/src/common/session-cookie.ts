import { parse } from "cookie";

export function readSessionCookie(cookieHeader: string | undefined | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }
  return parse(cookieHeader)[name] ?? null;
}
