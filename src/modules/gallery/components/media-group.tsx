import { createJustifiedRows } from "@/src/modules/gallery/layout";
import { MediaTile } from "@/src/modules/gallery/components/media-tile";
import type { DateGroup } from "@/src/modules/gallery/date-groups";

export function MediaGroup({ group, containerWidth, onOpen }: { group: DateGroup; containerWidth: number; onOpen: (id: string) => void }) {
  const targetHeight = containerWidth < 640 ? 130 : containerWidth < 1024 ? 160 : 180;
  const rows = createJustifiedRows(group.items, containerWidth, targetHeight, 4);

  return (
    <section aria-labelledby={`date-${group.key}`}>
      <h2 id={`date-${group.key}`} className="mb-3 px-1 text-[15px] font-semibold tracking-[-0.015em] text-foreground sm:text-base">
        {group.label}
      </h2>
      <div className="space-y-1">
        {rows.map((row, rowIndex) => (
          <div key={`${group.key}-${rowIndex}`} className="flex gap-1 overflow-hidden" style={{ height: row.height }}>
            {row.items.map(({ media, width }) => (
              <MediaTile key={media.id} media={media} width={width} height={row.height} onOpen={() => onOpen(media.id)} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
