"use client";

import { Images, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { groupMediaByDate } from "@/src/modules/gallery/date-groups";
import { MediaGroup } from "@/src/modules/gallery/components/media-group";
import type { MediaItem, MediaPage } from "@/src/modules/library/types";
import { MediaViewer } from "@/src/modules/viewer/media-viewer";

type GalleryViewProps = {
  initialItems: MediaItem[];
  initialCursor: string | null;
  error?: string;
};

export function GalleryView({ initialItems, initialCursor, error }: GalleryViewProps) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const groups = useMemo(() => groupMediaByDate(items), [items]);
  const selectedIndex = selectedId ? items.findIndex((item) => item.id === selectedId) : -1;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setContainerWidth(Math.floor(node.getBoundingClientRect().width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ cursor: nextCursor, limit: "60" });
      const response = await fetch(`/api/media?${params}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to load more photos.");
      }
      const page = await response.json() as MediaPage;
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Unable to load more photos.");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    }, { rootMargin: "800px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  const openMedia = useCallback((id: string) => {
    setSelectedId(id);
    const nextIndex = items.findIndex((item) => item.id === id);
    if (nextIndex >= items.length - 5 && nextCursor) void loadMore();
  }, [items, loadMore, nextCursor]);

  const navigateViewer = useCallback((index: number) => {
    setSelectedId(items[index]?.id ?? null);
    if (index >= items.length - 5 && nextCursor) void loadMore();
  }, [items, loadMore, nextCursor]);

  if (error) return <GalleryMessage title="Photo library unavailable" message={error} retry />;
  if (items.length === 0) return <GalleryMessage title="No photos or videos yet" message="Add supported media to MEDIA_LIBRARY_PATH, then refresh this page." />;

  return (
    <>
      <div ref={containerRef} className="mx-auto max-w-[1800px]">
        <div className="mb-7 flex items-end justify-between px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">Library</p>
            <h1 className="mt-1 text-[28px] font-medium tracking-[-0.04em] text-foreground sm:text-[32px]">Photos</h1>
          </div>
          <span className="text-sm text-muted-foreground">{items.length}{nextCursor ? "+" : ""} items</span>
        </div>
        {containerWidth > 0 && <div className="space-y-8">{groups.map((group) => <MediaGroup key={group.key} group={group} containerWidth={containerWidth} onOpen={openMedia} />)}</div>}
        <div ref={sentinelRef} className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
          {isLoading && <span>Loading more…</span>}
          {loadError && <button type="button" onClick={() => void loadMore()} className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium text-foreground hover:bg-muted"><RefreshCw className="size-4" />{loadError} Try again.</button>}
          {!nextCursor && !isLoading && <span>You’ve reached the end of your library.</span>}
        </div>
      </div>
      {selectedIndex >= 0 && (
        <MediaViewer
          items={items}
          index={selectedIndex}
          onClose={() => setSelectedId(null)}
          onNavigate={navigateViewer}
        />
      )}
    </>
  );
}

function GalleryMessage({ title, message, retry = false }: { title: string; message: string; retry?: boolean }) {
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-primary-blue"><Images className="size-7" /></span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        {retry && <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-full bg-primary-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue/90">Try again</button>}
      </div>
    </section>
  );
}
