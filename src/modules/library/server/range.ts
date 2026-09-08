export type ByteRange = { start: number; end: number };

export function parseByteRange(header: string | null, fileSize: number): ByteRange | null {
  if (fileSize <= 0) return null;
  if (!header) return { start: 0, end: fileSize - 1 };

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const startText = match[1] ?? "";
  const endText = match[2] ?? "";
  if (!startText && !endText) return null;

  if (!startText) {
    const suffixLength = Number.parseInt(endText, 10);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(0, fileSize - suffixLength), end: fileSize - 1 };
  }

  const start = Number.parseInt(startText, 10);
  const requestedEnd = endText ? Number.parseInt(endText, 10) : fileSize - 1;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= fileSize
  ) {
    return null;
  }

  return { start, end: Math.min(requestedEnd, fileSize - 1) };
}
