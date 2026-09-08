import { describe, expect, it } from "vitest";
import { createJustifiedRows } from "@/src/modules/gallery/layout";
import type { MediaItem } from "@/src/modules/library/types";

function media(id: string, width: number, height: number): MediaItem {
  return { id, width, height, kind: "image", fileName: `${id}.jpg`, mimeType: "image/jpeg", modifiedAt: new Date().toISOString(), size: 1, durationSeconds: null, contentUrl: "", thumbnailUrl: "" };
}

describe("createJustifiedRows", () => {
  it("fills completed rows while preserving aspect ratios", () => {
    const rows = createJustifiedRows([media("a", 4, 3), media("b", 4, 3), media("c", 4, 3)], 600, 180, 4);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.items.reduce((sum, item) => sum + item.width, 0) + 8).toBeCloseTo(600);
    expect(row.items[0].width / row.height).toBeCloseTo(4 / 3);
  });

  it("does not stretch the final incomplete row above target height", () => {
    const rows = createJustifiedRows([media("a", 1, 1), media("b", 1, 1)], 800, 180, 4);
    expect(rows[0].height).toBe(180);
    expect(rows[0].items[0].width).toBe(180);
  });

  it("uses a safe aspect ratio for broken metadata", () => {
    const rows = createJustifiedRows([media("a", 0, 0)], 200, 100);
    expect(rows[0].items[0].width).toBe(100);
  });
});
