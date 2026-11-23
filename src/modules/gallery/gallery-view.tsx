"use client";

import Link from "next/link";
import { ArrowLeft, Images, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MediaCard } from "@/src/modules/gallery/components/media-card";
import { MediaFilters } from "@/src/modules/gallery/components/media-filters";
import { DEFAULT_MEDIA_QUERY, type MediaItem, type MediaPage, type MediaQuery } from "@/src/modules/library/types";
import { MediaViewer } from "@/src/modules/viewer/media-viewer";

type GalleryViewProps = {
  initialItems: MediaItem[];
  initialCursor: string | null;
  initialQuery?: MediaQuery;
  error?: string;
  albumId?: string;
  title?: string;
};

const PAGE_SIZE = "10";

function mediaUrl(query: MediaQuery, cursor: string | null, albumId?: string) {
  const params = new URLSearchParams({ limit: PAGE_SIZE });
  if (cursor) params.set("cursor", cursor);
  if (albumId) params.set("albumId", albumId);
  for (const [name, value] of Object.entries(query)) {
    if (value !== DEFAULT_MEDIA_QUERY[name as keyof MediaQuery]) params.set(name, value);
  }
  return `/api/media?${params}`;
}

/** Keeps the filters in the address, so a reload or a shared link shows the same, without asking the server again. */
function syncAddress(query: MediaQuery) {
  const params = new URLSearchParams(window.location.search);
  for (const [name, value] of Object.entries(query)) {
    if (value === DEFAULT_MEDIA_QUERY[name as keyof MediaQuery]) params.delete(name);
    else params.set(name, value);
  }
  const search = params.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
}

async function fetchPage(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? "Unable to load more photos.");
  }
  return await response.json() as MediaPage;
}

/**
 * The library, ten at a time, loading more on reaching the bottom: a list on a phone, a grid on a wider screen.
 */
export function GalleryView({ initialItems, initialCursor, initialQuery = DEFAULT_MEDIA_QUERY, error, albumId, title = "Photos" }: GalleryViewProps) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  // A new filter makes the pages still on their way stale
  const requestRef = useRef(0);
  const selectedIndex = selectedId ? items.findIndex((item) => item.id === selectedId) : -1;
  const filtered = Object.entries(query).some(([name, value]) => value !== DEFAULT_MEDIA_QUERY[name as keyof MediaQuery]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingRef.current) return;
    const request = requestRef.current;
    loadingRef.current = true;
    setIsLoading(true);
    setLoadError(null);
    try {
      const page = await fetchPage(mediaUrl(query, nextCursor, albumId));
      if (request !== requestRef.current) return;
      // A page can overlap what is shown when the library changed in between
      setItems((current) => {
        const shown = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !shown.has(item.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (caught) {
      if (request === requestRef.current) setLoadError(caught instanceof Error ? caught.message : "Unable to load more photos.");
    } finally {
      if (request === requestRef.current) {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [albumId, nextCursor, query]);

  const applyQuery = useCallback(async (next: MediaQuery) => {
    const request = ++requestRef.current;
    setQuery(next);
    syncAddress(next);
    loadingRef.current = true;
    setIsLoading(true);
    setIsFiltering(true);
    setLoadError(null);
    try {
      const page = await fetchPage(mediaUrl(next, null, albumId));
      if (request !== requestRef.current) return;
      setItems(page.items);
      setNextCursor(page.nextCursor);
      window.scrollTo({ top: 0 });
    } catch (caught) {
      if (request === requestRef.current) setLoadError(caught instanceof Error ? caught.message : "Unable to load the photos.");
    } finally {
      if (request === requestRef.current) {
        loadingRef.current = false;
        setIsLoading(false);
        setIsFiltering(false);
      }
    }
  }, [albumId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor || isFiltering) return;
    // Close to the bottom, not a screen ahead, so only ten come at a time
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    }, { rootMargin: "200px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isFiltering, loadMore, nextCursor]);

  const openMedia = useCallback((id: string) => {
    setSelectedId(id);
    const nextIndex = items.findIndex((item) => item.id === id);
    if (nextIndex >= items.length - 3 && nextCursor) void loadMore();
  }, [items, loadMore, nextCursor]);

  const navigateViewer = useCallback((index: number) => {
    setSelectedId(items[index]?.id ?? null);
    if (index >= items.length - 3 && nextCursor) void loadMore();
  }, [items, loadMore, nextCursor]);

  if (error) return <GalleryMessage title={albumId ? "Album unavailable" : "Photo library unavailable"} message={error} retry />;
  if (items.length === 0 && !filtered && !isFiltering) return <GalleryMessage title={albumId ? "This album is empty" : "No photos or videos yet"} message={albumId ? "Upload supported photos or videos to this folder, then refresh the page." : "Add supported media to MEDIA_LIBRARY_PATH, then refresh this page."} />;

  const byDuration = query.duration !== "any" || query.sort === "longest" || query.sort === "shortest";

  return (
    <>
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-4 flex items-end justify-between gap-4 px-1">
          <div>
            {albumId ? (
              <Link href="/albums" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue hover:underline"><ArrowLeft className="size-3.5" /> Albums</Link>
            ) : (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">Library</p>
            )}
            <h1 className="mt-1 text-[28px] font-medium tracking-[-0.04em] text-foreground sm:text-[32px]">{title}</h1>
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">{items.length}{nextCursor ? "+" : ""} items</span>
        </div>
        <MediaFilters query={query} onChange={(next) => void applyQuery(next)} />
        {isFiltering && (
          <p className="mb-3 flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            {byDuration ? "Reading how long each video is… the first time it can take a minute." : "Loading…"}
          </p>
        )}
        {items.length === 0 && !isFiltering ? (
          <p className="grid min-h-48 place-items-center px-4 text-center text-sm text-muted-foreground">Nothing matches these filters.</p>
        ) : (
          <ul className={`flex flex-col gap-1 transition-opacity sm:grid sm:grid-cols-2 sm:gap-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${isFiltering ? "opacity-50" : ""}`}>
            {items.map((media, index) => <MediaCard key={media.id} media={media} priority={index < 4} onOpen={() => openMedia(media.id)} />)}
          </ul>
        )}
        <div ref={sentinelRef} className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
          {isLoading && !isFiltering && <span className="flex items-center gap-2"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Loading more…</span>}
          {loadError && <button type="button" onClick={() => void (nextCursor && items.length > 0 ? loadMore() : applyQuery(query))} className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium text-foreground hover:bg-muted"><RefreshCw className="size-4" />{loadError} Try again.</button>}
          {!nextCursor && !isLoading && !loadError && items.length > 0 && <span>You’ve reached the end of your library.</span>}
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
