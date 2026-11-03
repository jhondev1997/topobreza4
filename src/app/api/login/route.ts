import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, passcodeMatches, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/server/auth";

// A plain form post, not a server action: see the note in src/proxy.ts.
export async function POST(request: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  const candidate = (await request.formData().catch(() => null))?.get("passcode");

  if (!passcode || typeof candidate !== "string" || !(await passcodeMatches(candidate, passcode))) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(SESSION_COOKIE, await createSessionToken(passcode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
