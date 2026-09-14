"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DestinationDialog, type UploadDestination } from "@/src/modules/upload/components/destination-dialog";
import { UploadDropzone } from "@/src/modules/upload/components/upload-dropzone";
import { formatBytes, UploadList } from "@/src/modules/upload/components/upload-list";
import type { UploadQueueItem, UploadResponse, UploadResult } from "@/src/modules/upload/types";
import type { Album } from "@/src/modules/library/types";

const UPLOAD_CONCURRENCY = 3;

export function createUploadQueueId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function UploadView() {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [destination, setDestination] = useState<UploadDestination>("root");
  const [folderName, setFolderName] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [albumsError, setAlbumsError] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [uploads, setUploads] = useState<UploadQueueItem[]>([]);
  const requests = useRef(new Map<string, XMLHttpRequest>());

  useEffect(() => () => {
    for (const request of requests.current.values()) request.abort();
  }, []);

  const loadAlbums = async () => {
    setAlbumsLoading(true);
    setAlbumsError(null);
    try {
      const response = await fetch("/lgallery/api/albums", { cache: "no-store" });
      const body = await response.json() as { albums?: Album[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to load albums.");
      const nextAlbums = body.albums ?? [];
      setAlbums(nextAlbums);
      setSelectedAlbumId((current) => nextAlbums.some((album) => album.id === current) ? current : nextAlbums[0]?.id ?? "");
    } catch (error) {
      setAlbums([]);
      setSelectedAlbumId("");
      setAlbumsError(error instanceof Error ? error.message : "Unable to load albums.");
    } finally {
      setAlbumsLoading(false);
    }
  };

  const chooseFiles = (files: File[]) => {
    if (files.length === 0) return;
    setDestination("root");
    setFolderName("");
    setPendingFiles(files);
    void loadAlbums();
  };

  const updateUpload = (id: string, patch: Partial<UploadQueueItem>) => {
    setUploads((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const uploadFile = (item: UploadQueueItem, selectedFolder: string | null) => new Promise<void>((resolve) => {
    const request = new XMLHttpRequest();
    requests.current.set(item.id, request);
    updateUpload(item.id, { status: "uploading" });
    request.open("POST", "/lgallery/api/upload");
    request.setRequestHeader("X-File-Name", encodeURIComponent(item.file.name));
    if (selectedFolder) request.setRequestHeader("X-Folder-Name", encodeURIComponent(selectedFolder));
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) updateUpload(item.id, { progress: Math.min(99, Math.round((event.loaded / event.total) * 100)) });
    });
    request.addEventListener("load", () => {
      requests.current.delete(item.id);
      let response: UploadResponse;
      try {
        response = JSON.parse(request.responseText) as UploadResponse;
      } catch {
        response = { error: "The server returned an invalid response." };
      }
      if (request.status >= 200 && request.status < 300 && "fileName" in response) {
        updateUpload(item.id, { status: "complete", progress: 100, storedFileName: (response as UploadResult).fileName });
      } else {
        updateUpload(item.id, { status: "error", error: "error" in response ? response.error : "Upload failed." });
      }
      resolve();
    });
    request.addEventListener("error", () => {
      requests.current.delete(item.id);
      updateUpload(item.id, { status: "error", error: "The connection was interrupted." });
      resolve();
    });
    request.addEventListener("abort", () => resolve());
    request.send(item.file);
  });

  const startUploads = () => {
    const files = pendingFiles;
    const selectedFolder = destination === "folder"
      ? folderName.trim()
      : destination === "album"
        ? albums.find((album) => album.id === selectedAlbumId)?.name ?? null
        : null;
    const queued = files.map<UploadQueueItem>((file) => ({
      id: createUploadQueueId(),
      file,
      progress: 0,
      status: "queued",
    }));
    setPendingFiles([]);
    setUploads((current) => [...queued, ...current]);

    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < queued.length) {
        const item = queued[nextIndex];
        nextIndex += 1;
        await uploadFile(item, selectedFolder);
      }
    };
    void Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queued.length) }, worker));
  };

  const pendingSize = pendingFiles.reduce((total, file) => total + file.size, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-1 sm:px-2">
      <div className="mb-6 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">Library</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Upload files</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Add files from this device to LGallery.</p>
        </div>
        <Link href="/" className="hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary-blue transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex">
          <ArrowLeft className="size-4" /> View photos
        </Link>
      </div>

      <UploadDropzone onFiles={chooseFiles} />
      <UploadList items={uploads} onClearCompleted={() => setUploads((current) => current.filter((item) => item.status === "uploading" || item.status === "queued"))} />
      <DestinationDialog
        open={pendingFiles.length > 0}
        fileCount={pendingFiles.length}
        totalSize={formatBytes(pendingSize)}
        destination={destination}
        folderName={folderName}
        albums={albums}
        albumsLoading={albumsLoading}
        albumsError={albumsError}
        selectedAlbumId={selectedAlbumId}
        onDestinationChange={setDestination}
        onFolderNameChange={setFolderName}
        onSelectedAlbumChange={setSelectedAlbumId}
        onCancel={() => setPendingFiles([])}
        onConfirm={startUploads}
      />
    </div>
  );
}
