import type { Metadata } from "next";
import { AlbumsContainer } from "@/src/modules/albums/containers/albums-container";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Albums · LGallery",
  description: "Browse folders in your local LGallery library.",
};

export default function AlbumsPage() {
  return <AlbumsContainer />;
}
