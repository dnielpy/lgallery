"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, type TouchEvent } from "react";
import type { MediaItem } from "@/src/modules/library/types";
import { PhotoViewer } from "@/src/modules/viewer/components/photo-viewer";
import { VideoPlayer } from "@/src/modules/viewer/components/video-player";

type MediaViewerProps = {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function MediaViewer({ items, index, onClose, onNavigate }: MediaViewerProps) {
  const media = items[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = originalOverflow;
      previousFocus.current?.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); onNavigate(index - 1); }
      if (event.key === "ArrowRight" && index < items.length - 1) { event.preventDefault(); onNavigate(index + 1); }
      if (event.key === "Tab") trapFocus(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, items.length, onClose, onNavigate]);

  useEffect(() => {
    for (const candidate of [items[index - 1], items[index + 1]]) {
      if (candidate?.kind === "image") {
        const image = new window.Image();
        image.src = candidate.contentUrl;
      }
    }
  }, [index, items]);

  if (!media) return null;
  const canGoPrevious = index > 0;
  const canGoNext = index < items.length - 1;

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 1) touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    else touchStart.current = null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current;
    const end = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !end) return;
    const x = end.clientX - start.x;
    const y = end.clientY - start.y;
    if (Math.abs(x) > 70 && Math.abs(x) > Math.abs(y) * 1.4) {
      if (x > 0 && canGoPrevious) onNavigate(index - 1);
      if (x < 0 && canGoNext) onNavigate(index + 1);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Viewing ${media.fileName}`} data-media-viewer className="fixed inset-0 z-50 flex flex-col bg-[#0e0f11] text-white" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="relative z-20 flex h-16 shrink-0 items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 sm:px-5">
        <button ref={closeRef} type="button" aria-label="Close viewer" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [&_svg]:size-5"><X /></button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{media.fileName}</p>
          <p className="mt-0.5 text-xs text-white/65">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(media.modifiedAt))}</p>
        </div>
        <span className="ml-auto pr-2 text-xs tabular-nums text-white/60">{index + 1} / {items.length}</span>
      </header>
      <main className="relative min-h-0 flex-1 px-0 pb-0 sm:px-16 sm:pb-4">
        <div className="size-full overflow-hidden sm:rounded-xl">
          {media.kind === "image" ? <PhotoViewer key={media.id} media={media} /> : <VideoPlayer key={media.id} media={media} />}
        </div>
        <NavButton direction="previous" disabled={!canGoPrevious} onClick={() => onNavigate(index - 1)} />
        <NavButton direction="next" disabled={!canGoNext} onClick={() => onNavigate(index + 1)} />
      </main>
    </div>
  );
}

function NavButton({ direction, disabled, onClick }: { direction: "previous" | "next"; disabled: boolean; onClick: () => void }) {
  const previous = direction === "previous";
  return (
    <button type="button" aria-label={`${previous ? "Previous" : "Next"} item`} disabled={disabled} onClick={onClick} className={`absolute top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:hidden sm:grid ${previous ? "left-2" : "right-2"}`}>
      {previous ? <ChevronLeft /> : <ChevronRight />}
    </button>
  );
}

function trapFocus(event: KeyboardEvent) {
  const dialog = document.querySelector<HTMLElement>("[data-media-viewer]");
  const focusable = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (!focusable?.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
