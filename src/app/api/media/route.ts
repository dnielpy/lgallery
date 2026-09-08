import { NextResponse } from "next/server";
import { listMedia } from "@/src/modules/library/server/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Number.parseInt(searchParams.get("limit") ?? "60", 10);

  try {
    return NextResponse.json(await listMedia({ cursor, limit }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to scan the media library.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
