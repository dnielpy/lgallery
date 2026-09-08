"use client";

import Image from "next/image";
import { ImageOff, Play } from "lucide-react";
import { useState } from "react";
import { formatDuration } from "@/lib/utils";
import type { MediaItem } from "@/src/modules/library/types";

export function MediaThumbnail({ media, priority = false }: { media: MediaItem; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const duration = formatDuration(media.durationSeconds);

  return (
    <div className="group relative size-full overflow-hidden bg-media-tile">
      {failed ? (
        <div className="grid size-full place-items-center text-muted-foreground">
          <ImageOff aria-hidden="true" className="size-7" />
        </div>
      ) : (
        <Image
          src={media.thumbnailUrl}
          alt=""
          fill
          priority={priority}
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 320px"
          className="object-cover transition duration-300 group-hover:scale-[1.025]"
          onError={() => setFailed(true)}
        />
      )}
      {media.kind === "video" && (
        <>
          <span className="absolute inset-0 grid place-items-center bg-black/5 transition group-hover:bg-black/15">
            <span className="grid size-11 place-items-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm">
              <Play aria-hidden="true" className="ml-0.5 size-5 fill-current" />
            </span>
          </span>
          {duration && <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">{duration}</span>}
        </>
      )}
    </div>
  );
}
