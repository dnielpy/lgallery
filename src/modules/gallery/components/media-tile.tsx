import { MediaThumbnail } from "@/src/components/common/media-thumbnail";
import type { MediaItem } from "@/src/modules/library/types";

export function MediaTile({ media, width, height, onOpen }: { media: MediaItem; width: number; height: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Open ${media.kind === "video" ? "video" : "photo"} ${media.fileName}`}
      className="relative shrink-0 overflow-hidden rounded-[7px] bg-media-tile text-left focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-blue/70"
      style={{ width, height }}
      onClick={onOpen}
    >
      <MediaThumbnail media={media} />
    </button>
  );
}
