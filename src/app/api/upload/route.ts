import { NextResponse } from "next/server";
import { clearLibraryCaches } from "@/src/modules/library/server/library";
import { saveUpload, UploadError } from "@/src/modules/upload/server/save-upload";
import { isValidSessionToken, sessionFromCookieHeader } from "@/src/modules/auth/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decodeHeader(value: string, label: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new UploadError(`${label} is invalid.`);
  }
}

export async function POST(request: Request) {
  // Not behind the proxy (see src/proxy.ts), so it checks the session itself.
  if (!isValidSessionToken(sessionFromCookieHeader(request.headers.get("cookie")))) {
    return NextResponse.json({ error: "Sign in to LGallery first." }, { status: 401 });
  }

  const encodedFileName = request.headers.get("x-file-name");
  if (!encodedFileName) {
    return NextResponse.json({ error: "File name is required." }, { status: 400 });
  }

  try {
    const encodedFolderName = request.headers.get("x-folder-name");
    const result = await saveUpload({
      body: request.body,
      fileName: decodeHeader(encodedFileName, "File name"),
      folderName: encodedFolderName ? decodeHeader(encodedFolderName, "Folder name") : null,
    });
    clearLibraryCaches();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const status = error instanceof UploadError ? error.status : 500;
    const message = error instanceof Error ? error.message : "The file could not be stored.";
    return NextResponse.json({ error: message }, { status });
  }
}
