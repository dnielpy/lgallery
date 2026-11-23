import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  DEFAULT_MEDIA_QUERY,
  type Album,
  type AlbumSummary,
  type MediaItem,
  type MediaKind,
  type MediaPage,
  type MediaQuery,
} from "@/src/modules/library/types";

const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 60;
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;
const METADATA_CONCURRENCY = 4;
// Probing a video on the USB disk takes about a second, so what was read is kept across restarts
const METADATA_FILE = "metadata.json";
const METADATA_SAVE_DELAY_MS = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MB = 1024 * 1024;
const MINUTE = 60;

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
  // The album and query it lists; a cursor only continues the same listing
  key: string;
};

type CursorPayload = {
  snapshotId: string;
  offset: number;
};

type ListMediaOptions = {
  cursor?: string;
  limit?: number;
  albumId?: string;
  query?: MediaQuery;
};

type AlbumDirectory = Album & { absolutePath: string };

const snapshots = new Map<string, LibrarySnapshot>();
const metadataCache = new Map<string, MediaMetadata & { size: number; modifiedAtMs: number }>();
let metadataLoaded: Promise<void> | null = null;
let metadataSaveTimer: NodeJS.Timeout | null = null;
let warming: Promise<void> | null = null;

export function getLibraryRoot() {
  const configuredPath = process.env.MEDIA_LIBRARY_PATH?.trim();
  if (!configuredPath) throw new Error("MEDIA_LIBRARY_PATH is not configured.");
  return path.resolve(configuredPath);
}

export function getMediaCacheRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.MEDIA_CACHE_PATH?.trim() || ".lgallery-cache");
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
  const root = getLibraryRoot();
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

function snapshotKey(albumId: string | undefined, query: MediaQuery) {
  return JSON.stringify([albumId ?? null, query.sort, query.date, query.size, query.duration]);
}

function matchesDate(file: MediaFile, date: MediaQuery["date"], now: number) {
  const age = now - file.modifiedAtMs;
  if (date === "week") return age <= 7 * DAY_MS;
  if (date === "month") return age <= 30 * DAY_MS;
  if (date === "year") return age <= 365 * DAY_MS;
  if (date === "older") return age > 365 * DAY_MS;
  return true;
}

function matchesSize(file: MediaFile, size: MediaQuery["size"]) {
  if (size === "small") return file.size < 500 * MB;
  if (size === "medium") return file.size >= 500 * MB && file.size < 2048 * MB;
  if (size === "large") return file.size >= 2048 * MB;
  return true;
}

function matchesDuration(seconds: number | null, duration: MediaQuery["duration"]) {
  if (duration === "any") return true;
  if (seconds === null) return false;
  if (duration === "short") return seconds < 10 * MINUTE;
  if (duration === "medium") return seconds >= 10 * MINUTE && seconds < 30 * MINUTE;
  return seconds >= 30 * MINUTE;
}

/** The files of the library, or of an album, that match a query, in its order. */
export async function queryLibrary(albumId: string | undefined, query: MediaQuery = DEFAULT_MEDIA_QUERY) {
  const now = Date.now();
  // Newest first, from the scan
  let files = (await scanLibrary(albumId)).filter(
    (file) => matchesDate(file, query.date, now) && matchesSize(file, query.size),
  );
  if (query.sort === "oldest") files.reverse();
  if (query.sort === "largest") files.sort((first, second) => second.size - first.size);
  if (query.sort === "smallest") files.sort((first, second) => first.size - second.size);

  const byDuration = query.sort === "longest" || query.sort === "shortest";
  if (query.duration === "any" && !byDuration) {
    // Reads the rest in the background, so a filter or sort by duration later does not wait for all of them
    warmMetadata(files);
    return files;
  }
  const durations = new Map<string, number | null>();
  await mapWithConcurrency(files, METADATA_CONCURRENCY, async (file) => {
    durations.set(file.id, (await readMetadata(file)).durationSeconds);
  });
  files = files.filter((file) => matchesDuration(durations.get(file.id) ?? null, query.duration));
  if (byDuration) {
    const direction = query.sort === "longest" ? -1 : 1;
    // Without a duration (photos, broken videos) last; sort is stable, so ties stay newest first
    files.sort((first, second) => {
      const a = durations.get(first.id) ?? null;
      const b = durations.get(second.id) ?? null;
      if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
      return (a - b) * direction;
    });
  }
  return files;
}

async function createSnapshot(albumId?: string, query: MediaQuery = DEFAULT_MEDIA_QUERY) {
  cleanupSnapshots();
  const snapshot: LibrarySnapshot = {
    id: randomUUID(),
    createdAt: Date.now(),
    files: await queryLibrary(albumId, query),
    key: snapshotKey(albumId, query),
  };
  snapshots.set(snapshot.id, snapshot);
  return snapshot;
}

function metadataFile() {
  return path.join(getMediaCacheRoot(), METADATA_FILE);
}

function loadMetadata() {
  metadataLoaded ??= (async () => {
    try {
      const saved = JSON.parse(await readFile(metadataFile(), "utf8")) as Record<string, MediaMetadata & { size: number; modifiedAtMs: number }>;
      for (const [id, metadata] of Object.entries(saved)) {
        if (!metadataCache.has(id)) metadataCache.set(id, metadata);
      }
    } catch {
      // Nothing saved yet, or a file that cannot be read: it is probed again
    }
  })();
  return metadataLoaded;
}

function saveMetadataSoon() {
  if (metadataSaveTimer) return;
  metadataSaveTimer = setTimeout(async () => {
    metadataSaveTimer = null;
    const target = metadataFile();
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(temporary, JSON.stringify(Object.fromEntries(metadataCache)));
      await rename(temporary, target);
    } catch {
      // The cache is only a speed-up
    }
  }, METADATA_SAVE_DELAY_MS);
  metadataSaveTimer.unref?.();
}

function warmMetadata(files: MediaFile[]) {
  if (warming) return;
  warming = (async () => {
    // One at a time, so it does not slow down the pages and thumbnails being asked for
    for (const file of files) await readMetadata(file).catch(() => undefined);
  })().finally(() => { warming = null; });
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
  await loadMetadata();
  const cached = metadataCache.get(file.id);
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

  metadataCache.set(file.id, { ...metadata, size: file.size, modifiedAtMs: file.modifiedAtMs });
  saveMetadataSoon();
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
    contentUrl: `/api/media/${file.id}/content?v=${version}`,
    thumbnailUrl: `/api/media/${file.id}/thumbnail?v=${version}`,
  };
}

export async function listMedia({ cursor, limit = PAGE_SIZE, albumId, query = DEFAULT_MEDIA_QUERY }: ListMediaOptions = {}): Promise<MediaPage> {
  cleanupSnapshots();
  const safeLimit = Math.min(Math.max(Math.floor(limit) || PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const decoded = cursor ? decodeCursor(cursor) : null;
  let snapshot = decoded ? snapshots.get(decoded.snapshotId) : undefined;
  let offset = decoded?.offset ?? 0;
  const key = snapshotKey(albumId, query);
  if (!snapshot || snapshot.key !== key) {
    // A cursor whose snapshot expired, or was cleared by an upload, keeps its place in a fresh one, so the next page
    // does not start the library over and show what is already on screen again. Another listing starts at the top.
    if (snapshot) offset = 0;
    snapshot = await createSnapshot(albumId, query);
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
  for (const snapshot of snapshots.values()) {
    const match = snapshot.files.find((file) => file.id === mediaId);
    if (match) return match;
  }
  const snapshot = await createSnapshot();
  return snapshot.files.find((file) => file.id === mediaId) ?? null;
}

export function getThumbnailCachePath(file: MediaFile) {
  const version = `${file.id}-${file.size}-${Math.floor(file.modifiedAtMs)}`;
  return path.join(getMediaCacheRoot(), `${version}.${file.kind === "image" ? "webp" : "jpg"}`);
}

export function clearLibraryCaches() {
  snapshots.clear();
  metadataCache.clear();
  metadataLoaded = null;
  if (metadataSaveTimer) clearTimeout(metadataSaveTimer);
  metadataSaveTimer = null;
}
