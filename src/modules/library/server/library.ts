import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { parseHomeServerIdentity } from "@home-server/contracts";
import { headers } from "next/headers";
import type { Album, AlbumSummary, MediaItem, MediaKind, MediaPage } from "@/src/modules/library/types";

const PAGE_SIZE = 60;
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;
const METADATA_CONCURRENCY = 4;

const MEDIA_TYPES = new Map<string, { kind: MediaKind; mimeType: string }>([
  [".jpg", { kind: "image", mimeType: "image/jpeg" }],
  [".jpeg", { kind: "image", mimeType: "image/jpeg" }],
  [".png", { kind: "image", mimeType: "image/png" }],
  [".webp", { kind: "image", mimeType: "image/webp" }],
  [".gif", { kind: "image", mimeType: "image/gif" }],
  [".mp4", { kind: "video", mimeType: "video/mp4" }],
  [".webm", { kind: "video", mimeType: "video/webm" }],
]);

export type MediaFile = {
  id: string;
  absolutePath: string;
  relativePath: string;
  fileName: string;
  kind: MediaKind;
  mimeType: string;
  size: number;
  modifiedAtMs: number;
};

type MediaMetadata = {
  width: number;
  height: number;
  durationSeconds: number | null;
};

type LibrarySnapshot = {
  id: string;
  createdAt: number;
  files: MediaFile[];
  albumId: string | null;
  root: string;
};

type CursorPayload = {
  snapshotId: string;
  offset: number;
};

type ListMediaOptions = {
  cursor?: string;
  limit?: number;
  albumId?: string;
};

type AlbumDirectory = Album & { absolutePath: string };

const snapshots = new Map<string, LibrarySnapshot>();
const metadataCache = new Map<string, MediaMetadata & { size: number; modifiedAtMs: number }>();

export async function getLibraryRoot() {
  const configuredPath = process.env.MEDIA_LIBRARY_PATH?.trim();
  if (configuredPath) return path.resolve(configuredPath);
  let identity = null;
  try {
    identity = parseHomeServerIdentity(await headers());
  } catch {
    // Server utilities can also run without a request in tests and maintenance jobs.
  }
  if (identity) return path.join(path.resolve(process.env.HOME_SERVER_DATA_PATH?.trim() || "/data"), identity.workspaceFolder, "lgallery");
  throw new Error("MEDIA_LIBRARY_PATH is not configured.");
}

export async function getMediaCacheRoot() {
  return path.join(await getLibraryRoot(), ".cache");
}

export function createMediaId(relativePath: string) {
  return createHash("sha256").update(relativePath).digest("hex").slice(0, 32);
}

export function createAlbumId(relativePath: string) {
  return createHash("sha256").update(`album:${relativePath}`).digest("hex").slice(0, 32);
}

function encodeCursor(payload: CursorPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorPayload;
    if (
      typeof payload.snapshotId !== "string" ||
      !Number.isInteger(payload.offset) ||
      payload.offset < 0
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function cleanupSnapshots() {
  const now = Date.now();
  for (const [id, snapshot] of snapshots) {
    if (now - snapshot.createdAt > SNAPSHOT_TTL_MS) snapshots.delete(id);
  }
}

async function walkDirectory(root: string, directory: string, files: MediaFile[]) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(root, absolutePath, files);
      continue;
    }

    const mediaType = MEDIA_TYPES.get(path.extname(entry.name).toLowerCase());
    if (!entry.isFile() || !mediaType) continue;

    try {
      const fileStats = await stat(absolutePath);
      const relativePath = path.relative(root, absolutePath);
      files.push({
        id: createMediaId(relativePath),
        absolutePath,
        relativePath,
        fileName: entry.name,
        kind: mediaType.kind,
        mimeType: mediaType.mimeType,
        size: fileStats.size,
        modifiedAtMs: fileStats.mtimeMs,
      });
    } catch {
      // Files can disappear or become unreadable while a scan is running.
    }
  }
}

async function validateLibraryRoot() {
  const root = await getLibraryRoot();
  try {
    const rootStats = await stat(root);
    if (!rootStats.isDirectory()) throw new Error("MEDIA_LIBRARY_PATH must point to a directory.");
  } catch (error) {
    if (error instanceof Error && error.message === "MEDIA_LIBRARY_PATH must point to a directory.") {
      throw error;
    }
    throw new Error("The configured media library directory is unavailable.");
  }
  return root;
}

async function getAlbumDirectories(): Promise<AlbumDirectory[]> {
  const root = await validateLibraryRoot();
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    throw new Error("The configured media library directory is unavailable.");
  }
  return entries
    .filter((entry) => !entry.name.startsWith(".") && entry.isDirectory())
    .map((entry) => ({
      id: createAlbumId(entry.name),
      name: entry.name,
      absolutePath: path.join(root, entry.name),
    }))
    .sort((first, second) => first.name.localeCompare(second.name, "en", { sensitivity: "base" }) || first.name.localeCompare(second.name));
}

export async function getAlbumById(albumId: string): Promise<Album | null> {
  const album = (await getAlbumDirectories()).find((candidate) => candidate.id === albumId);
  return album ? { id: album.id, name: album.name } : null;
}

export async function listAlbumDestinations(): Promise<Album[]> {
  return (await getAlbumDirectories()).map(({ id, name }) => ({ id, name }));
}

export async function scanLibrary(albumId?: string) {
  const root = await validateLibraryRoot();
  let scanRoot = root;
  if (albumId) {
    const album = (await getAlbumDirectories()).find((candidate) => candidate.id === albumId);
    if (!album) throw new Error("Album not found.");
    scanRoot = album.absolutePath;
  }

  const files: MediaFile[] = [];
  await walkDirectory(root, scanRoot, files);
  return files.sort((first, second) => {
    if (second.modifiedAtMs !== first.modifiedAtMs) return second.modifiedAtMs - first.modifiedAtMs;
    return first.relativePath.localeCompare(second.relativePath);
  });
}

async function createSnapshot(albumId?: string) {
  cleanupSnapshots();
  const root = await getLibraryRoot();
  const snapshot: LibrarySnapshot = {
    id: randomUUID(),
    createdAt: Date.now(),
    files: await scanLibrary(albumId),
    albumId: albumId ?? null,
    root,
  };
  snapshots.set(snapshot.id, snapshot);
  return snapshot;
}

function runCommand(command: string, args: string[]) {
  return new Promise<string>((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"] });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.on("error", () => resolve(""));
    child.on("close", (exitCode) => resolve(exitCode === 0 ? output.trim() : ""));
  });
}

async function readMetadata(file: MediaFile): Promise<MediaMetadata> {
  const cached = metadataCache.get(file.absolutePath);
  if (cached && cached.size === file.size && cached.modifiedAtMs === file.modifiedAtMs) return cached;

  let metadata: MediaMetadata = { width: 1, height: 1, durationSeconds: null };
  if (file.kind === "image") {
    try {
      const image = await sharp(file.absolutePath, { animated: false }).metadata();
      const swapsAxes = image.orientation !== undefined && image.orientation >= 5 && image.orientation <= 8;
      metadata = {
        width: Math.max(1, swapsAxes ? image.height ?? 1 : image.width ?? 1),
        height: Math.max(1, swapsAxes ? image.width ?? 1 : image.height ?? 1),
        durationSeconds: null,
      };
    } catch {
      // Corrupt media remains visible with a neutral aspect ratio and fallback preview.
    }
  } else {
    const output = await runCommand("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height:format=duration",
      "-of", "json",
      file.absolutePath,
    ]);
    try {
      const parsed = JSON.parse(output) as {
        streams?: Array<{ width?: number; height?: number }>;
        format?: { duration?: string };
      };
      const stream = parsed.streams?.[0];
      const duration = Number.parseFloat(parsed.format?.duration ?? "");
      metadata = {
        width: Math.max(1, stream?.width ?? 16),
        height: Math.max(1, stream?.height ?? 9),
        durationSeconds: Number.isFinite(duration) ? duration : null,
      };
    } catch {
      metadata = { width: 16, height: 9, durationSeconds: null };
    }
  }

  metadataCache.set(file.absolutePath, { ...metadata, size: file.size, modifiedAtMs: file.modifiedAtMs });
  return metadata;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function serializeMedia(file: MediaFile): Promise<MediaItem> {
  const metadata = await readMetadata(file);
  const version = `${file.size}-${Math.floor(file.modifiedAtMs)}`;
  return {
    id: file.id,
    kind: file.kind,
    fileName: file.fileName,
    mimeType: file.mimeType,
    width: metadata.width,
    height: metadata.height,
    modifiedAt: new Date(file.modifiedAtMs).toISOString(),
    size: file.size,
    durationSeconds: metadata.durationSeconds,
    contentUrl: `/lgallery/api/media/${file.id}/content?v=${version}`,
    thumbnailUrl: `/lgallery/api/media/${file.id}/thumbnail?v=${version}`,
  };
}

export async function listMedia({ cursor, limit = PAGE_SIZE, albumId }: ListMediaOptions = {}): Promise<MediaPage> {
  cleanupSnapshots();
  const safeLimit = Math.min(Math.max(Math.floor(limit) || PAGE_SIZE, 1), PAGE_SIZE);
  const decoded = cursor ? decodeCursor(cursor) : null;
  let snapshot = decoded ? snapshots.get(decoded.snapshotId) : undefined;
  let offset = decoded?.offset ?? 0;
  if (!snapshot || (albumId !== undefined && snapshot.albumId !== albumId)) {
    snapshot = await createSnapshot(albumId);
    offset = 0;
  }

  const files = snapshot.files.slice(offset, offset + safeLimit);
  const items = await mapWithConcurrency(files, METADATA_CONCURRENCY, serializeMedia);
  const nextOffset = offset + files.length;
  return {
    items,
    nextCursor: nextOffset < snapshot.files.length
      ? encodeCursor({ snapshotId: snapshot.id, offset: nextOffset })
      : null,
  };
}

export async function listAlbums(): Promise<AlbumSummary[]> {
  const root = await validateLibraryRoot();
  const albums = await getAlbumDirectories();
  return mapWithConcurrency(albums, METADATA_CONCURRENCY, async (album) => {
    const files: MediaFile[] = [];
    await walkDirectory(root, album.absolutePath, files);
    files.sort((first, second) => {
      if (second.modifiedAtMs !== first.modifiedAtMs) return second.modifiedAtMs - first.modifiedAtMs;
      return first.relativePath.localeCompare(second.relativePath);
    });
    return {
      id: album.id,
      name: album.name,
      itemCount: files.length,
      cover: files[0] ? await serializeMedia(files[0]) : null,
    };
  });
}

export async function getMediaFileById(mediaId: string) {
  cleanupSnapshots();
  const root = await getLibraryRoot();
  for (const snapshot of snapshots.values()) {
    if (snapshot.root !== root) continue;
    const match = snapshot.files.find((file) => file.id === mediaId);
    if (match) return match;
  }
  const snapshot = await createSnapshot();
  return snapshot.files.find((file) => file.id === mediaId) ?? null;
}

export async function getThumbnailCachePath(file: MediaFile) {
  const version = `${file.id}-${file.size}-${Math.floor(file.modifiedAtMs)}`;
  return path.join(await getMediaCacheRoot(), `${version}.${file.kind === "image" ? "webp" : "jpg"}`);
}

export function clearLibraryCaches() {
  snapshots.clear();
  metadataCache.clear();
}
