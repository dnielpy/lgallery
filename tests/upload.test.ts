import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/src/app/api/upload/route";
import { clearLibraryCaches } from "@/src/modules/library/server/library";
import { saveUpload, validateFolderName } from "@/src/modules/upload/server/save-upload";

let temporaryRoot: string;

beforeEach(async () => {
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "lgallery-upload-test-"));
  process.env.MEDIA_LIBRARY_PATH = temporaryRoot;
});

afterEach(async () => {
  clearLibraryCaches();
  delete process.env.MEDIA_LIBRARY_PATH;
  await rm(temporaryRoot, { recursive: true, force: true });
});

function body(contents: string) {
  return new Blob([contents]).stream();
}

describe("uploads", () => {
  it("streams files into the library root without overwriting a duplicate", async () => {
    const first = await saveUpload({ body: body("first"), fileName: "photo.jpg" });
    const second = await saveUpload({ body: body("second"), fileName: "photo.jpg" });

    expect(first.fileName).toBe("photo.jpg");
    expect(second.fileName).toBe("photo (1).jpg");
    await expect(readFile(path.join(temporaryRoot, first.fileName), "utf8")).resolves.toBe("first");
    await expect(readFile(path.join(temporaryRoot, second.fileName), "utf8")).resolves.toBe("second");
  });

  it("creates one safe subfolder and stores arbitrary file types", async () => {
    const result = await saveUpload({ body: body("notes"), fileName: "notes.txt", folderName: "Family trip" });

    expect(result).toEqual({ fileName: "notes.txt", folderName: "Family trip", size: 5 });
    await expect(stat(path.join(temporaryRoot, "Family trip"))).resolves.toMatchObject({});
    await expect(readFile(path.join(temporaryRoot, "Family trip", "notes.txt"), "utf8")).resolves.toBe("notes");
  });

  it("rejects hidden or path-like subfolder names", () => {
    expect(() => validateFolderName("../outside")).toThrow("unsupported characters");
    expect(() => validateFolderName("nested/folder")).toThrow("unsupported characters");
    expect(() => validateFolderName(".hidden")).toThrow("cannot start with a dot");
  });

  it("accepts uploads from a LAN URL even when the container has an internal URL", async () => {
    const request = new Request("http://0.0.0.0:3000/api/upload", {
      method: "POST",
      headers: {
        host: "192.168.20.188:3000",
        origin: "http://192.168.20.188:3000",
        "x-file-name": "from-lan.txt",
      },
      body: "LAN upload",
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    await expect(readFile(path.join(temporaryRoot, "from-lan.txt"), "utf8")).resolves.toBe("LAN upload");
  });
});
