import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/src/modules/auth/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
