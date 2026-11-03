import { describe, expect, it } from "vitest";
import { createSessionToken, isValidSessionToken, passcodeMatches } from "./auth";

const PASSCODE = "clave-de-prueba";

describe("passcode", () => {
  it("matches only the exact passcode", async () => {
    expect(await passcodeMatches(PASSCODE, PASSCODE)).toBe(true);
    expect(await passcodeMatches("otra", PASSCODE)).toBe(false);
    expect(await passcodeMatches("", PASSCODE)).toBe(false);
    expect(await passcodeMatches(`${PASSCODE} `, PASSCODE)).toBe(false);
  });
});

describe("session token", () => {
  it("accepts a token it created", async () => {
    expect(await isValidSessionToken(await createSessionToken(PASSCODE), PASSCODE)).toBe(true);
  });

  it("rejects a missing or malformed token", async () => {
    for (const token of [undefined, "", "nada", "123", ".", "1.2.3"]) {
      expect(await isValidSessionToken(token, PASSCODE)).toBe(false);
    }
  });

  it("rejects a token signed with another passcode", async () => {
    expect(await isValidSessionToken(await createSessionToken("otra"), PASSCODE)).toBe(false);
  });

  it("rejects a token with a tampered expiry", async () => {
    const [, signature] = (await createSessionToken(PASSCODE)).split(".");
    expect(await isValidSessionToken(`${Date.now() + 10 ** 12}.${signature}`, PASSCODE)).toBe(false);
  });

  it("rejects an expired token", async () => {
    const token = await createSessionToken(PASSCODE, 0);
    expect(await isValidSessionToken(token, PASSCODE, 1000)).toBe(true);
    expect(await isValidSessionToken(token, PASSCODE, Date.now())).toBe(false);
  });
});
