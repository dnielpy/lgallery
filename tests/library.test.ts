import { mkdtemp, mkdir, rm, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { clearLibraryCaches, createAlbumId, createMediaId, getAlbumById, listAlbumDestinations, listAlbums, listMedia, queryLibrary, scanLibrary } from "@/src/modules/library/server/library";
import { DEFAULT_MEDIA_QUERY, parseMediaQuery } from "@/src/modules/library/types";

let temporaryRoot: string | undefined;

afterEach(async () => {
  clearLibraryCaches();
  delete process.env.MEDIA_LIBRARY_PATH;
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  temporaryRoot = undefined;
});

async function makeLibrary() {
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "lgallery-test-"));
  process.env.MEDIA_LIBRARY_PATH = temporaryRoot;
  return temporaryRoot;
}

describe("media library", () => {
  it("requires a configured root", async () => {
    await expect(scanLibrary()).rejects.toThrow("MEDIA_LIBRARY_PATH is not configured");
  });

  it("recurses, filters extensions, ignores hidden entries and symlinks", async () => {
    const root = await makeLibrary();
    await mkdir(path.join(root, "trip"));
    await mkdir(path.join(root, ".private"));
    await writeFile(path.join(root, "trip", "photo.JPEG"), "not-a-real-photo");
    await writeFile(path.join(root, "movie.WEBM"), "not-a-real-video");
    await writeFile(path.join(root, "notes.txt"), "ignore");
    await writeFile(path.join(root, ".hidden.jpg"), "ignore");
    await writeFile(path.join(root, ".private", "secret.png"), "ignore");
    await symlink(path.join(root, "trip", "photo.JPEG"), path.join(root, "linked.jpg"));

    const files = await scanLibrary();
    expect(files.map((file) => file.relativePath).sort()).toEqual(["movie.WEBM", path.join("trip", "photo.JPEG")].sort());
    expect(files.map((file) => file.mimeType).sort()).toEqual(["image/jpeg", "video/webm"]);
  });

  it("sorts by modification date and paginates a stable snapshot", async () => {
    const root = await makeLibrary();
    const oldFile = path.join(root, "old.jpg");
    const newFile = path.join(root, "new.png");
    await writeFile(oldFile, "old");
    await writeFile(newFile, "new");
    await utimes(oldFile, new Date("2024-01-01"), new Date("2024-01-01"));
    await utimes(newFile, new Date("2025-01-01"), new Date("2025-01-01"));

    const first = await listMedia({ limit: 1 });
    expect(first.items[0].fileName).toBe("new.png");
    expect(first.nextCursor).toBeTruthy();

    await writeFile(path.join(root, "newest.webp"), "newest");
    const second = await listMedia({ cursor: first.nextCursor!, limit: 1 });
    expect(second.items[0].fileName).toBe("old.jpg");
    expect(second.nextCursor).toBeNull();
    expect(JSON.stringify(first.items[0])).not.toContain(root);
  });

  it("keeps its place when the snapshot behind a cursor is gone", async () => {
    const root = await makeLibrary();
    for (const [name, date] of [["a.jpg", "2025-03-01"], ["b.jpg", "2025-02-01"], ["c.jpg", "2025-01-01"]]) {
      await writeFile(path.join(root, name), name);
      await utimes(path.join(root, name), new Date(date), new Date(date));
    }

    const first = await listMedia({ limit: 2 });
    expect(first.items.map((item) => item.fileName)).toEqual(["a.jpg", "b.jpg"]);
    // An expired snapshot, or one an upload cleared, must not start the library over
    clearLibraryCaches();
    const second = await listMedia({ cursor: first.nextCursor!, limit: 2 });
    expect(second.items.map((item) => item.fileName)).toEqual(["c.jpg"]);
    expect(second.nextCursor).toBeNull();
  });

  it("filters by date and size, and sorts by size", async () => {
    const root = await makeLibrary();
    const now = Date.now();
    for (const [name, bytes, daysAgo] of [["new.jpg", 3, 1], ["big.jpg", 9, 20], ["old.jpg", 5, 400]] as const) {
      await writeFile(path.join(root, name), "x".repeat(bytes));
      const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      await utimes(path.join(root, name), date, date);
    }
    const names = async (query: Partial<typeof DEFAULT_MEDIA_QUERY>) =>
      (await queryLibrary(undefined, { ...DEFAULT_MEDIA_QUERY, ...query })).map((file) => file.fileName);

    expect(await names({})).toEqual(["new.jpg", "big.jpg", "old.jpg"]);
    expect(await names({ sort: "oldest" })).toEqual(["old.jpg", "big.jpg", "new.jpg"]);
    expect(await names({ sort: "largest" })).toEqual(["big.jpg", "old.jpg", "new.jpg"]);
    expect(await names({ date: "week" })).toEqual(["new.jpg"]);
    expect(await names({ date: "month", sort: "smallest" })).toEqual(["new.jpg", "big.jpg"]);
    expect(await names({ date: "older" })).toEqual(["old.jpg"]);
    expect(await names({ size: "large" })).toEqual([]);
    expect(await names({ size: "small" })).toHaveLength(3);
  });

  it("starts a different query at the top instead of continuing another one's cursor", async () => {
    const root = await makeLibrary();
    for (const [name, date] of [["a.jpg", "2025-03-01"], ["b.jpg", "2025-02-01"]]) {
      await writeFile(path.join(root, name), name);
      await utimes(path.join(root, name), new Date(date), new Date(date));
    }
    const first = await listMedia({ limit: 1 });
    const other = await listMedia({ cursor: first.nextCursor!, limit: 1, query: { ...DEFAULT_MEDIA_QUERY, sort: "oldest" } });
    expect(other.items.map((item) => item.fileName)).toEqual(["b.jpg"]);
    expect(other.nextCursor).toBeTruthy();
  });

  it("reads a query from search params, ignoring what it does not know", () => {
    expect(parseMediaQuery(new URLSearchParams("sort=largest&size=huge&duration=long"))).toEqual({
      ...DEFAULT_MEDIA_QUERY, sort: "largest", duration: "long",
    });
    expect(parseMediaQuery({ date: "week", sort: ["oldest"] })).toEqual({ ...DEFAULT_MEDIA_QUERY, date: "week" });
  });

  it("creates stable opaque identifiers", () => {
    expect(createMediaId("holiday/photo.jpg")).toBe(createMediaId("holiday/photo.jpg"));
    expect(createMediaId("holiday/photo.jpg")).not.toBe(createMediaId("other/photo.jpg"));
    expect(createMediaId("holiday/photo.jpg")).toMatch(/^[a-f0-9]{32}$/);
  });

  it("treats direct subfolders as albums and scopes their media", async () => {
    const root = await makeLibrary();
    await mkdir(path.join(root, "Beach", "nested"), { recursive: true });
    await mkdir(path.join(root, "Empty"));
    await mkdir(path.join(root, ".hidden"));
    await writeFile(path.join(root, "Beach", "cover.jpg"), "image");
    await writeFile(path.join(root, "Beach", "nested", "clip.mp4"), "video");
    await writeFile(path.join(root, ".hidden", "secret.jpg"), "ignore");
    await symlink(path.join(root, "Beach"), path.join(root, "Linked album"));

    const albums = await listAlbums();
    expect(albums.map((album) => ({ name: album.name, count: album.itemCount }))).toEqual([
      { name: "Beach", count: 2 },
      { name: "Empty", count: 0 },
    ]);
    expect(albums[0].id).toBe(createAlbumId("Beach"));
    expect(albums[0].cover?.fileName).toBeTruthy();
    expect(JSON.stringify(albums)).not.toContain(root);
    await expect(listAlbumDestinations()).resolves.toEqual([
      { id: createAlbumId("Beach"), name: "Beach" },
      { id: createAlbumId("Empty"), name: "Empty" },
    ]);

    const album = await getAlbumById(albums[0].id);
    expect(album).toEqual({ id: albums[0].id, name: "Beach" });
    const page = await listMedia({ albumId: albums[0].id });
    expect(page.items.map((item) => item.fileName).sort()).toEqual(["clip.mp4", "cover.jpg"]);
    await expect(listMedia({ albumId: "missing" })).rejects.toThrow("Album not found");
  });
});
