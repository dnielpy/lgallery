import { mkdtemp, mkdir, rm, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { clearLibraryCaches, createMediaId, listMedia, scanLibrary } from "@/src/modules/library/server/library";

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

  it("creates stable opaque identifiers", () => {
    expect(createMediaId("holiday/photo.jpg")).toBe(createMediaId("holiday/photo.jpg"));
    expect(createMediaId("holiday/photo.jpg")).not.toBe(createMediaId("other/photo.jpg"));
    expect(createMediaId("holiday/photo.jpg")).toMatch(/^[a-f0-9]{32}$/);
  });
});
