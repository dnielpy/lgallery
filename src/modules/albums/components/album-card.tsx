import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { MediaThumbnail } from "@/src/components/common/media-thumbnail";
import type { AlbumSummary } from "@/src/modules/library/types";

export function AlbumCard({ album, priority = false }: { album: AlbumSummary; priority?: boolean }) {
  return (
    <Link href={`/albums/${album.id}`} className="group block rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-primary-blue/60">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-media-tile shadow-sm ring-1 ring-border/60 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        {album.cover ? (
          <MediaThumbnail media={album.cover} priority={priority} />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-primary-soft to-muted text-primary-blue">
            <FolderOpen className="size-12" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <h2 className="mt-3 truncate px-0.5 text-[15px] font-semibold tracking-[-0.015em] text-foreground" title={album.name}>{album.name}</h2>
      <p className="mt-0.5 px-0.5 text-sm text-muted-foreground">{album.itemCount} {album.itemCount === 1 ? "item" : "items"}</p>
    </Link>
  );
}
