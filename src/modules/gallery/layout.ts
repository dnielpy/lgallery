import type { MediaItem } from "@/src/modules/library/types";

export type JustifiedRow = {
  height: number;
  items: Array<{ media: MediaItem; width: number }>;
};

export function createJustifiedRows(media: MediaItem[], containerWidth: number, targetHeight: number, gap = 4) {
  if (containerWidth <= 0 || media.length === 0) return [];
  const rows: JustifiedRow[] = [];
  let current: MediaItem[] = [];
  let ratioSum = 0;

  const commit = (justify: boolean) => {
    if (!current.length) return;
    const availableWidth = Math.max(1, containerWidth - gap * (current.length - 1));
    const naturalHeight = availableWidth / ratioSum;
    const height = justify ? naturalHeight : Math.min(targetHeight, naturalHeight);
    rows.push({
      height,
      items: current.map((item) => ({ media: item, width: height * safeRatio(item) })),
    });
    current = [];
    ratioSum = 0;
  };

  for (const item of media) {
    current.push(item);
    ratioSum += safeRatio(item);
    const availableWidth = containerWidth - gap * (current.length - 1);
    if (availableWidth / ratioSum <= targetHeight) commit(true);
  }
  commit(false);
  return rows;
}

function safeRatio(media: Pick<MediaItem, "width" | "height">) {
  const ratio = media.width / media.height;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}
