import { describe, expect, it } from "vitest";
import { formatDateLabel, groupMediaByDate } from "@/src/modules/gallery/date-groups";
import type { MediaItem } from "@/src/modules/library/types";

const item = (id: string, modifiedAt: string): MediaItem => ({ id, modifiedAt, kind: "image", fileName: id, mimeType: "image/jpeg", width: 1, height: 1, size: 1, durationSeconds: null, contentUrl: "", thumbnailUrl: "" });

describe("date groups", () => {
  it("keeps adjacent media from the same local day together", () => {
    const groups = groupMediaByDate([
      item("a", "2026-09-08T14:00:00"),
      item("b", "2026-09-08T08:00:00"),
      item("c", "2026-09-07T22:00:00"),
    ], new Date("2026-09-08T16:00:00"));
    expect(groups.map((group) => [group.label, group.items.length])).toEqual([["Today", 2], ["Yesterday", 1]]);
  });

  it("includes the year only when it differs", () => {
    const now = new Date("2026-09-08T12:00:00");
    expect(formatDateLabel(new Date("2025-01-03T12:00:00"), now)).toContain("2025");
    expect(formatDateLabel(new Date("2026-01-03T12:00:00"), now)).not.toContain("2026");
  });
});
