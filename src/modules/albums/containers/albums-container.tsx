import { AlbumsView } from "@/src/modules/albums/albums-view";
import { listAlbums } from "@/src/modules/library/server/library";
import type { AlbumSummary } from "@/src/modules/library/types";

export async function AlbumsContainer() {
  let albums: AlbumSummary[] = [];
  let error: string | undefined;
  try {
    albums = await listAlbums();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unable to load albums.";
  }
  return <AlbumsView albums={albums} error={error} />;
}
