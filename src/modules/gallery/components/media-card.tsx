import { MediaThumbnail } from "@/src/components/common/media-thumbnail";
import { formatDateLabel } from "@/src/modules/gallery/date-groups";
import type { MediaItem } from "@/src/modules/library/types";
import { formatBytes } from "@/lib/utils";

/** A row of the list on a phone: the thumbnail beside the name; a card of the grid on a wider screen. */
export function MediaCard({ media, priority, onOpen }: { media: MediaItem; priority?: boolean; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-label={`Open ${media.kind === "video" ? "video" : "photo"} ${media.fileName}`}
        className="group flex w-full items-start gap-3 rounded-xl p-1.5 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-blue/70 sm:flex-col sm:gap-2 sm:p-2"
        onClick={onOpen}
      >
        <span className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg bg-media-tile sm:w-full sm:rounded-xl">
          <MediaThumbnail media={media} priority={priority} />
        </span>
        <span className="min-w-0 flex-1 py-0.5 sm:w-full sm:px-0.5">
          <span className="line-clamp-2 break-words text-sm font-medium leading-5 text-foreground">{media.fileName}</span>
          <span className="mt-1 block text-xs text-muted-foreground tabular-nums">
            {formatBytes(media.size)} · {formatDateLabel(new Date(media.modifiedAt))}
          </span>
        </span>
      </button>
    </li>
  );
}
