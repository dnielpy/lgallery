import { GalleryView } from "@/src/modules/gallery/gallery-view";
import { listMedia } from "@/src/modules/library/server/library";
import type { MediaPage } from "@/src/modules/library/types";

export async function GalleryContainer() {
  let page: MediaPage | null = null;
  let error: string | undefined;
  try {
    page = await listMedia();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unable to load the media library.";
  }

  return (
    <GalleryView
      error={error}
      initialItems={page?.items ?? []}
      initialCursor={page?.nextCursor ?? null}
    />
  );
}
