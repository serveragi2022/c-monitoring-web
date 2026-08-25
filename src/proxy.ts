import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "cms_session";
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    /\.(png|jpg|jpeg|svg|ico|webp)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get(COOKIE_NAME)?.value);

  if (!hasSession && !pathname.startsWith("/login")) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
