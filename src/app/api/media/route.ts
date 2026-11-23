import { NextResponse } from "next/server";
import { listMedia } from "@/src/modules/library/server/library";
import { parseMediaQuery } from "@/src/modules/library/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const cursor = searchParams.get("cursor") ?? undefined;
  const albumId = searchParams.get("albumId") ?? undefined;
  const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10);

  try {
    return NextResponse.json(await listMedia({ cursor, limit, albumId, query: parseMediaQuery(searchParams) }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to scan the media library.";
    return NextResponse.json({ error: message }, { status: message === "Album not found." ? 404 : 500 });
  }
}
