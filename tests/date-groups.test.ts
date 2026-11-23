import { describe, expect, it } from "vitest";
import { formatDateLabel } from "@/src/modules/gallery/date-groups";

describe("date labels", () => {
  it("names today and yesterday", () => {
    const now = new Date("2026-09-08T16:00:00");
    expect(formatDateLabel(new Date("2026-09-08T08:00:00"), now)).toBe("Today");
    expect(formatDateLabel(new Date("2026-09-07T22:00:00"), now)).toBe("Yesterday");
  });

  it("includes the year only when it differs", () => {
    const now = new Date("2026-09-08T12:00:00");
    expect(formatDateLabel(new Date("2025-01-03T12:00:00"), now)).toContain("2025");
    expect(formatDateLabel(new Date("2026-01-03T12:00:00"), now)).not.toContain("2026");
  });
});
