// Single-user access: one passcode, and a signed cookie once it is entered.
// Uses Web Crypto so it has no dependencies. Changing APP_PASSCODE invalidates
// every session, because the passcode is the signing key.
export const SESSION_COOKIE = "avance_session";
export const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const encoder = new TextEncoder();

async function hmac(key: string, message: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

// Compares digests so the time taken does not depend on the candidate's length.
export async function passcodeMatches(candidate: string, passcode: string) {
  const [a, b] = await Promise.all([hmac(passcode, `check:${candidate}`), hmac(passcode, `check:${passcode}`)]);
  return constantTimeEqual(a, b);
}

export async function createSessionToken(passcode: string, now = Date.now()) {
  const expiresAt = String(now + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${toHex(await hmac(passcode, `session:${expiresAt}`))}`;
}

export async function isValidSessionToken(token: string | undefined, passcode: string, now = Date.now()) {
  if (!token) return false;
  const [expiresAt, signature, ...rest] = token.split(".");
  if (!expiresAt || !signature || rest.length > 0) return false;

  const expected = toHex(await hmac(passcode, `session:${expiresAt}`));
  if (!constantTimeEqual(encoder.encode(signature), encoder.encode(expected))) return false;
  return Number(expiresAt) > now;
}
