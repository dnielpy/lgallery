import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalleryContainer } from "@/src/modules/gallery/containers/gallery-container";
import { getAlbumById } from "@/src/modules/library/server/library";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Album · LGallery",
};

export default async function AlbumPage({ params }: PageProps<"/albums/[albumId]">) {
  const { albumId } = await params;
  const album = await getAlbumById(albumId);
  if (!album) notFound();
  return <GalleryContainer albumId={album.id} title={album.name} />;
}
