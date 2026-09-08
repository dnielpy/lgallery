import type { MediaItem } from "@/src/modules/library/types";

export type DateGroup = { key: string; label: string; items: MediaItem[] };

export function groupMediaByDate(items: MediaItem[], now = new Date()): DateGroup[] {
  const groups = new Map<string, MediaItem[]>();
  for (const item of items) {
    const date = new Date(item.modifiedAt);
    const key = localDateKey(date);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return [...groups].map(([key, groupItems]) => ({
    key,
    label: formatDateLabel(new Date(groupItems[0].modifiedAt), now),
    items: groupItems,
  }));
}

export function formatDateLabel(date: Date, now = new Date()) {
  const today = localDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const key = localDateKey(date);
  if (key === today) return "Today";
  if (key === localDateKey(yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat("en", {
    weekday: "long", month: "long", day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
