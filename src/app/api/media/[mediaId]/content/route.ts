import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getMediaFileById } from "@/src/modules/library/server/library";
import { parseByteRange } from "@/src/modules/library/server/range";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContentContext = { params: Promise<{ mediaId: string }> };

function contentDisposition(fileName: string) {
  const asciiName = fileName.replace(/[^ -~]/g, "_").replace(/"/g, "'");
  return `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

async function handleContent(request: Request, context: ContentContext, includeBody: boolean) {
  const { mediaId } = await context.params;
  const media = await getMediaFileById(mediaId);
  if (!media) return new Response("Media not found", { status: 404 });

  let fileStats;
  try {
    fileStats = await stat(media.absolutePath);
  } catch {
    return new Response("Media not found", { status: 404 });
  }

  const headers = new Headers({
    "Cache-Control": "private, max-age=0, must-revalidate",
    "Content-Disposition": contentDisposition(media.fileName),
    "Content-Type": media.mimeType,
  });

  if (media.kind === "image") {
    headers.set("Content-Length", String(fileStats.size));
    if (!includeBody) return new Response(null, { status: 200, headers });
    const stream = createReadStream(media.absolutePath);
    return new Response(Readable.toWeb(stream) as ReadableStream, { status: 200, headers });
  }

  headers.set("Accept-Ranges", "bytes");
  if (fileStats.size === 0) {
    headers.set("Content-Range", "bytes */0");
    return new Response("Media is empty", { status: 416, headers });
  }

  const requestedRange = request.headers.get("range");
  const range = parseByteRange(requestedRange, fileStats.size);
  if (!range) {
    headers.set("Content-Range", `bytes */${fileStats.size}`);
    return new Response("Invalid range", { status: 416, headers });
  }

  const partial = Boolean(requestedRange);
  headers.set("Content-Length", String(range.end - range.start + 1));
  if (partial) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${fileStats.size}`);
  if (!includeBody) return new Response(null, { status: partial ? 206 : 200, headers });

  const stream = createReadStream(media.absolutePath, { start: range.start, end: range.end });
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: partial ? 206 : 200,
    headers,
  });
}

export function GET(request: Request, context: ContentContext) {
  return handleContent(request, context, true);
}

export function HEAD(request: Request, context: ContentContext) {
  return handleContent(request, context, false);
}
