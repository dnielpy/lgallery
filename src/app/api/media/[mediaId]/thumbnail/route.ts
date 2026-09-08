import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink } from "node:fs/promises";
import sharp from "sharp";
import {
  getMediaCacheRoot,
  getMediaFileById,
  getThumbnailCachePath,
  type MediaFile,
} from "@/src/modules/library/server/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ThumbnailContext = { params: Promise<{ mediaId: string }> };

function fallbackThumbnail(kind: MediaFile["kind"]) {
  const label = kind === "video" ? "Video preview unavailable" : "Preview unavailable";
  const icon = kind === "video"
    ? '<path d="M278 142v76l68-38z" fill="#9aa0a6"/>'
    : '<path d="M232 214l48-52 34 34 22-24 72 72H232z" fill="#9aa0a6"/><circle cx="348" cy="134" r="18" fill="#9aa0a6"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#202124"/>${icon}<text x="320" y="278" fill="#bdc1c6" font-family="Arial,sans-serif" font-size="17" text-anchor="middle">${label}</text></svg>`;
  return new Response(svg, {
    headers: { "Cache-Control": "no-store", "Content-Type": "image/svg+xml; charset=utf-8" },
  });
}

function generateVideoThumbnail(inputPath: string, outputPath: string) {
  return new Promise<boolean>((resolve) => {
    const child = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-ss", "0.5", "-i", inputPath,
      "-frames:v", "1", "-vf", "scale='min(960,iw)':-2", "-q:v", "4", "-y", outputPath,
    ], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

async function generateThumbnail(media: MediaFile, outputPath: string) {
  if (media.kind === "video") return generateVideoThumbnail(media.absolutePath, outputPath);
  try {
    await sharp(media.absolutePath, { animated: false })
      .rotate()
      .resize({ width: 960, height: 960, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, alphaQuality: 90 })
      .toFile(outputPath);
    return true;
  } catch {
    return false;
  }
}

export async function GET(_request: Request, context: ThumbnailContext) {
  const { mediaId } = await context.params;
  const media = await getMediaFileById(mediaId);
  if (!media) return new Response("Media not found", { status: 404 });

  const cachePath = getThumbnailCachePath(media);
  const contentType = media.kind === "image" ? "image/webp" : "image/jpeg";
  try {
    const cached = await readFile(cachePath);
    return new Response(new Uint8Array(cached), {
      headers: { "Cache-Control": "public, max-age=31536000, immutable", "Content-Type": contentType },
    });
  } catch {
    // Generate below.
  }

  await mkdir(getMediaCacheRoot(), { recursive: true });
  const extension = media.kind === "image" ? "webp" : "jpg";
  const temporaryPath = `${cachePath}.${randomUUID()}.tmp.${extension}`;

  try {
    const generated = await generateThumbnail(media, temporaryPath);
    if (!generated) {
      await unlink(temporaryPath).catch(() => undefined);
      return fallbackThumbnail(media.kind);
    }

    await rename(temporaryPath, cachePath).catch(async () => {
      await unlink(temporaryPath).catch(() => undefined);
    });
    const image = await readFile(cachePath);
    return new Response(new Uint8Array(image), {
      headers: { "Cache-Control": "public, max-age=31536000, immutable", "Content-Type": contentType },
    });
  } catch {
    await unlink(temporaryPath).catch(() => undefined);
    return fallbackThumbnail(media.kind);
  }
}
