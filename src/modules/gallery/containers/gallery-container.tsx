import { GalleryView } from "@/src/modules/gallery/gallery-view";
import { listMedia } from "@/src/modules/library/server/library";
import { DEFAULT_MEDIA_QUERY, type MediaPage, type MediaQuery } from "@/src/modules/library/types";

export async function GalleryContainer({
  albumId,
  title = "Photos",
  query = DEFAULT_MEDIA_QUERY,
}: {
  albumId?: string;
  title?: string;
  query?: MediaQuery;
} = {}) {
  let page: MediaPage | null = null;
  let error: string | undefined;
  try {
    page = await listMedia({ albumId, query });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unable to load the media library.";
  }

  return (
    <GalleryView
      error={error}
      initialItems={page?.items ?? []}
      initialCursor={page?.nextCursor ?? null}
      initialQuery={query}
      albumId={albumId}
      title={title}
    />
  );
}
