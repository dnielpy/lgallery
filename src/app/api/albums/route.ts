import { NextResponse } from "next/server";
import { listAlbumDestinations } from "@/src/modules/library/server/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ albums: await listAlbumDestinations() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load albums.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
