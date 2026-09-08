import { constants } from "node:fs";
import { access, copyFile, link, lstat, mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { getLibraryRoot } from "@/src/modules/library/server/library";
import type { UploadResult } from "@/src/modules/upload/types";

const MAX_NAME_BYTES = 240;
const MAX_COLLISION_ATTEMPTS = 10_000;

export class UploadError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "UploadError";
  }
}

function validateSegment(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") {
    throw new UploadError(`${label} is required.`);
  }
  if (/[\\/\u0000-\u001f\u007f]/.test(trimmed)) {
    throw new UploadError(`${label} contains unsupported characters.`);
  }
  if (Buffer.byteLength(trimmed, "utf8") > MAX_NAME_BYTES) {
    throw new UploadError(`${label} is too long.`);
  }
  return trimmed;
}

export function validateFileName(value: string) {
  return validateSegment(value, "File name");
}

export function validateFolderName(value: string | null | undefined) {
  if (value === null || value === undefined || value.trim() === "") return null;
  const folderName = validateSegment(value, "Folder name");
  if (folderName.startsWith(".")) {
    throw new UploadError("Folder name cannot start with a dot.");
  }
  return folderName;
}

async function getDestinationDirectory(folderName: string | null) {
  const root = getLibraryRoot();
  let rootStats;
  try {
    rootStats = await stat(root);
  } catch {
    throw new UploadError("The configured media library directory is unavailable.", 500);
  }
  if (!rootStats.isDirectory()) {
    throw new UploadError("MEDIA_LIBRARY_PATH must point to a directory.", 500);
  }

  try {
    await access(root, constants.W_OK);
  } catch {
    throw new UploadError("The media library is not writable.", 500);
  }

  if (!folderName) return root;
  const destination = path.join(root, folderName);
  try {
    await mkdir(destination);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }

  const destinationStats = await lstat(destination);
  if (!destinationStats.isDirectory() || destinationStats.isSymbolicLink()) {
    throw new UploadError("The selected folder name is not an available directory.");
  }
  return destination;
}

function candidateName(fileName: string, collisionIndex: number) {
  if (collisionIndex === 0) return fileName;
  const extension = path.extname(fileName);
  const stem = path.basename(fileName, extension);
  return `${stem} (${collisionIndex})${extension}`;
}

async function publishWithoutOverwrite(temporaryPath: string, directory: string, fileName: string) {
  for (let index = 0; index < MAX_COLLISION_ATTEMPTS; index += 1) {
    const storedName = candidateName(fileName, index);
    const destinationPath = path.join(directory, storedName);
    try {
      await link(temporaryPath, destinationPath);
      return storedName;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") continue;
      if (!["EPERM", "ENOSYS", "EOPNOTSUPP", "EXDEV"].includes(code ?? "")) throw error;
    }

    try {
      await copyFile(temporaryPath, destinationPath, constants.COPYFILE_EXCL);
      return storedName;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw error;
    }
  }
  throw new UploadError("Unable to choose an available file name.", 409);
}

export async function saveUpload({
  body,
  fileName: rawFileName,
  folderName: rawFolderName,
}: {
  body: ReadableStream<Uint8Array> | null;
  fileName: string;
  folderName?: string | null;
}): Promise<UploadResult> {
  const fileName = validateFileName(rawFileName);
  const folderName = validateFolderName(rawFolderName);
  const directory = await getDestinationDirectory(folderName);
  const temporaryPath = path.join(directory, `.lgallery-upload-${randomUUID()}.part`);

  try {
    if (body) {
      await pipeline(
        Readable.fromWeb(body as unknown as NodeReadableStream),
        createWriteStream(temporaryPath, { flags: "wx" }),
      );
    } else {
      await writeFile(temporaryPath, new Uint8Array(), { flag: "wx" });
    }

    const uploadedStats = await stat(temporaryPath);
    const storedName = await publishWithoutOverwrite(temporaryPath, directory, fileName);
    return { fileName: storedName, folderName, size: uploadedStats.size };
  } catch (error) {
    if (error instanceof UploadError) throw error;
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOSPC") throw new UploadError("There is not enough space to store this file.", 507);
    if (code === "EACCES" || code === "EPERM" || code === "EROFS") {
      throw new UploadError("The media library is not writable.", 500);
    }
    throw new UploadError("The file could not be stored.", 500);
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
}
