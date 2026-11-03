import { NextResponse, type NextRequest } from "next/server";
import { isValidSessionToken, SESSION_COOKIE } from "@/server/auth";

export async function proxy(request: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) {
    // Local development stays open; anything else must never run unprotected.
    if (process.env.NODE_ENV === "development") return NextResponse.next();
    return new NextResponse("Falta configurar APP_PASSCODE.", { status: 503 });
  }

  const { pathname } = request.nextUrl;
  const isSignedIn = await isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value, passcode);

  // Only these two go through without a session. Everything else stays closed,
  // including POST to /login: a server action can be invoked through any page.
  if (pathname === "/api/login" && request.method === "POST") return NextResponse.next();
  if (pathname === "/login" && request.method === "GET") {
    return isSignedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (isSignedIn) return NextResponse.next();
  if (request.method !== "GET") return new NextResponse("Sesión requerida.", { status: 401 });
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Left open: what the browser fetches to install the app, which holds no data.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|offline\\.html|icons/).*)"],
};
