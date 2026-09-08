import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { AlbumCard } from "@/src/modules/albums/components/album-card";
import type { AlbumSummary } from "@/src/modules/library/types";

export function AlbumsView({ albums, error }: { albums: AlbumSummary[]; error?: string }) {
  if (error) return <AlbumsMessage title="Albums unavailable" message={error} retry />;
  if (albums.length === 0) return <AlbumsMessage title="No albums yet" message="Create a subfolder from Upload to see it here." />;

  return (
    <div className="mx-auto w-full max-w-[1800px] px-1">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">Library</p>
          <h1 className="mt-1 text-[28px] font-medium tracking-[-0.04em] text-foreground sm:text-[32px]">Albums</h1>
        </div>
        <span className="text-sm text-muted-foreground">{albums.length} {albums.length === 1 ? "album" : "albums"}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {albums.map((album, index) => <AlbumCard key={album.id} album={album} priority={index < 5} />)}
      </div>
    </div>
  );
}

function AlbumsMessage({ title, message, retry = false }: { title: string; message: string; retry?: boolean }) {
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-primary-blue"><FolderOpen className="size-7" /></span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        {retry && <Link href="/albums" className="mt-5 inline-block rounded-full bg-primary-blue px-5 py-2.5 text-sm font-semibold text-white hover:brightness-95">Try again</Link>}
      </div>
    </section>
  );
}
