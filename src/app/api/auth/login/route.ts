import { NextResponse } from "next/server";
import {
  checkCredentials,
  createSessionToken,
  isAuthConfigured,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/src/modules/auth/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Slows down guessing the password.
const FAILURE_DELAY_MS = 1_000;

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "LGALLERY_PASSWORD is not configured on the server." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { username?: unknown; password?: unknown } | null;
  if (!checkCredentials(body?.username, body?.password)) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return NextResponse.json({ error: "Wrong user or password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    // LGallery is usually opened over plain HTTP on the LAN, where a secure cookie would never be sent.
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
