import Link from "next/link";
import { FolderX } from "lucide-react";

export default function AlbumNotFound() {
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-primary-blue"><FolderX className="size-7" /></span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Album not found</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">This folder may have been renamed or removed.</p>
        <Link href="/albums" className="mt-5 inline-block rounded-full bg-primary-blue px-5 py-2.5 text-sm font-semibold text-white hover:brightness-95">Back to albums</Link>
      </div>
    </section>
  );
}
