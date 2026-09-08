// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaViewer } from "@/src/modules/viewer/media-viewer";
import { PhotoViewer } from "@/src/modules/viewer/components/photo-viewer";
import type { MediaItem } from "@/src/modules/library/types";

const media = (id: string): MediaItem => ({ id, kind: "image", fileName: `${id}.jpg`, mimeType: "image/jpeg", width: 1200, height: 800, modifiedAt: "2026-09-08T12:00:00Z", size: 100, durationSeconds: null, contentUrl: `/content/${id}`, thumbnailUrl: `/thumb/${id}` });

afterEach(cleanup);

describe("MediaViewer", () => {
  it("closes with Escape and navigates with arrow keys", () => {
    const close = vi.fn();
    const navigate = vi.fn();
    render(<MediaViewer items={[media("one"), media("two")]} index={0} onClose={close} onNavigate={navigate} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(navigate).toHaveBeenCalledWith(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(close).toHaveBeenCalledOnce();
  });

  it("exposes zoom and reset controls for photos", () => {
    render(<PhotoViewer media={media("photo")} />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("125%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
