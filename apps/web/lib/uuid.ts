/**
 * `crypto.randomUUID()` is only exposed in secure contexts (HTTPS or
 * localhost). A phone opening the app over the LAN address
 * (`http://192.168.x.x:3000`) is an insecure context, so the native call is
 * `undefined` there. `crypto.getRandomValues` has no such restriction, so we
 * build the v4 identifier from it instead.
 */
export function createClientMessageId(): string {
  const webCrypto = globalThis.crypto;

  if (typeof webCrypto?.randomUUID === "function") {
    return webCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof webCrypto?.getRandomValues !== "function") {
    throw new Error("Web Crypto API is unavailable in this browser.");
  }
  webCrypto.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}
