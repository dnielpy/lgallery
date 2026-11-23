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

export const MEDIA_SORTS = ["newest", "oldest", "largest", "smallest", "longest", "shortest"] as const;
export type MediaSort = (typeof MEDIA_SORTS)[number];

// Each filter is a range, or "any"
export const DATE_FILTERS = ["any", "week", "month", "year", "older"] as const;
export const SIZE_FILTERS = ["any", "small", "medium", "large"] as const;
export const DURATION_FILTERS = ["any", "short", "medium", "long"] as const;

export type MediaQuery = {
  sort: MediaSort;
  date: (typeof DATE_FILTERS)[number];
  size: (typeof SIZE_FILTERS)[number];
  duration: (typeof DURATION_FILTERS)[number];
};

export const DEFAULT_MEDIA_QUERY: MediaQuery = { sort: "newest", date: "any", size: "any", duration: "any" };

/** The query in a URL's search params, or a page's, with anything unknown back to its default. */
export function parseMediaQuery(params: URLSearchParams | Record<string, string | string[] | undefined>): MediaQuery {
  const pick = <T extends string>(name: string, allowed: readonly T[], fallback: T) => {
    const value = params instanceof URLSearchParams ? params.get(name) : params[name];
    return allowed.includes(value as T) ? (value as T) : fallback;
  };
  return {
    sort: pick("sort", MEDIA_SORTS, DEFAULT_MEDIA_QUERY.sort),
    date: pick("date", DATE_FILTERS, DEFAULT_MEDIA_QUERY.date),
    size: pick("size", SIZE_FILTERS, DEFAULT_MEDIA_QUERY.size),
    duration: pick("duration", DURATION_FILTERS, DEFAULT_MEDIA_QUERY.duration),
  };
}
