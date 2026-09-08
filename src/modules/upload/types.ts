export type UploadStatus = "queued" | "uploading" | "complete" | "error";

export type UploadResult = {
  fileName: string;
  folderName: string | null;
  size: number;
};

export type UploadResponse = UploadResult | { error: string };

export type UploadQueueItem = {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  storedFileName?: string;
};
