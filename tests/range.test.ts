import { describe, expect, it } from "vitest";
import { parseByteRange } from "@/src/modules/library/server/range";

describe("parseByteRange", () => {
  it("returns the complete file when no range is requested", () => {
    expect(parseByteRange(null, 100)).toEqual({ start: 0, end: 99 });
  });

  it("parses bounded, open, and suffix ranges", () => {
    expect(parseByteRange("bytes=10-19", 100)).toEqual({ start: 10, end: 19 });
    expect(parseByteRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
    expect(parseByteRange("bytes=-20", 100)).toEqual({ start: 80, end: 99 });
    expect(parseByteRange("bytes=-200", 100)).toEqual({ start: 0, end: 99 });
  });

  it("clamps an oversized end", () => {
    expect(parseByteRange("bytes=95-200", 100)).toEqual({ start: 95, end: 99 });
  });

  it("rejects empty files, multiple ranges, and invalid boundaries", () => {
    expect(parseByteRange(null, 0)).toBeNull();
    expect(parseByteRange("bytes=0-1,3-4", 100)).toBeNull();
    expect(parseByteRange("bytes=100-", 100)).toBeNull();
    expect(parseByteRange("bytes=20-10", 100)).toBeNull();
    expect(parseByteRange("bytes=-0", 100)).toBeNull();
    expect(parseByteRange("garbage", 100)).toBeNull();
  });
});
