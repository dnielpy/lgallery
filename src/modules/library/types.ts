export type MediaKind = "image" | "video";

export type MediaItem = {
  id: string;
  kind: MediaKind;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  modifiedAt: string;
  size: number;
  durationSeconds: number | null;
  contentUrl: string;
  thumbnailUrl: string;
};

export type MediaPage = {
  items: MediaItem[];
  nextCursor: string | null;
};

export type AlbumSummary = {
  id: string;
  name: string;
  itemCount: number;
  cover: MediaItem | null;
};

export type Album = Pick<AlbumSummary, "id" | "name">;
