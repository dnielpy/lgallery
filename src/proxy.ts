import { NextResponse, type NextRequest } from "next/server";
import { isValidSessionToken, SESSION_COOKIE } from "@/src/modules/auth/server/session";

export function proxy(request: NextRequest) {
  if (isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in to LGallery first." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    // Everything but the login itself, Next's assets and the logo. Uploads check the session in their route:
    // through the proxy their bodies would be buffered and cut at 10 MB.
    "/((?!login|api/auth/|api/upload|_next/static|_next/image|favicon.ico|lgallery-logo.svg).*)",
  ],
};
