"use client";

import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/utils";
import type { MediaItem } from "@/src/modules/library/types";

const HIDE_DELAY = 2800;

export function VideoPlayer({ media }: { media: MediaItem }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | null>(null);
  const lastVolume = useRef(1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.durationSeconds ?? 0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState(false);

  const revealControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (videoRef.current && !videoRef.current.paused) {
      hideTimer.current = window.setTimeout(() => setShowControls(false), HIDE_DELAY);
    }
  }, []);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || error) return;
    if (video.paused) await video.play().catch(() => setPlaying(false));
    else video.pause();
  }, [error]);

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.duration || Infinity, Math.max(0, video.currentTime + seconds));
    setCurrentTime(video.currentTime);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted || video.volume === 0) {
      video.muted = false;
      video.volume = lastVolume.current || 1;
    } else {
      lastVolume.current = video.volume;
      video.muted = true;
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && ["INPUT", "BUTTON"].includes(target.tagName)) return;
      if (event.code === "Space") { event.preventDefault(); void togglePlay(); }
      if (event.key.toLowerCase() === "m") { event.preventDefault(); toggleMute(); }
      if (event.key.toLowerCase() === "j") { event.preventDefault(); seekBy(-5); }
      if (event.key.toLowerCase() === "l") { event.preventDefault(); seekBy(5); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [seekBy, toggleMute, togglePlay]);

  const progress = duration > 0 ? Math.min(100, currentTime / duration * 100) : 0;

  return (
    <div ref={frameRef} className="group relative flex size-full items-center justify-center overflow-hidden bg-black" onMouseMove={revealControls} onPointerDown={revealControls} onMouseLeave={() => playing && setShowControls(false)}>
      <video
        ref={videoRef}
        key={media.id}
        src={media.contentUrl}
        poster={media.thumbnailUrl}
        playsInline
        preload="metadata"
        className="max-h-full max-w-full"
        onClick={() => void togglePlay()}
        onLoadedMetadata={(event) => { setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0); setError(false); }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => { setPlaying(true); revealControls(); }}
        onPause={() => { setPlaying(false); setShowControls(true); }}
        onEnded={() => { setPlaying(false); setShowControls(true); }}
        onVolumeChange={(event) => { setVolume(event.currentTarget.volume); setMuted(event.currentTarget.muted || event.currentTarget.volume === 0); }}
        onError={() => { setError(true); setPlaying(false); setShowControls(true); }}
      />
      {error && <div className="absolute inset-0 grid place-items-center bg-black/75 px-6 text-center text-sm text-white/75">This video can’t be played in this browser.</div>}
      {!playing && !error && <button type="button" aria-label="Play video" onClick={() => void togglePlay()} className="absolute grid size-16 place-items-center rounded-full bg-black/55 text-white shadow-xl backdrop-blur-sm transition hover:scale-105 hover:bg-black/70"><Play className="ml-1 size-8 fill-current" /></button>}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-4 pb-3 pt-16 text-white transition-opacity duration-200 sm:px-6 ${showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <input
          aria-label="Video progress"
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => { const next = Number(event.currentTarget.value); if (videoRef.current) videoRef.current.currentTime = next; setCurrentTime(next); }}
          className="video-progress-range h-5 w-full cursor-pointer"
          style={{ background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,.35) ${progress}%) center / 100% 3px no-repeat` }}
        />
        <div className="flex h-10 items-center gap-2">
          <PlayerButton label={playing ? "Pause" : "Play"} onClick={() => void togglePlay()}>{playing ? <Pause /> : <Play className="fill-current" />}</PlayerButton>
          <PlayerButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>{muted ? <VolumeX /> : <Volume2 />}</PlayerButton>
          <input aria-label="Volume" type="range" min="0" max="1" step="0.02" value={muted ? 0 : volume} onChange={(event) => { const next = Number(event.currentTarget.value); const video = videoRef.current; if (!video) return; video.volume = next; video.muted = next === 0; if (next > 0) lastVolume.current = next; }} className="video-volume-range hidden h-5 w-20 cursor-pointer sm:block" style={{ background: `linear-gradient(to right, #fff ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,.35) ${(muted ? 0 : volume) * 100}%) center / 100% 3px no-repeat` }} />
          <span className="ml-1 text-xs font-medium tabular-nums text-white/90">{formatDuration(currentTime) ?? "0:00"} / {formatDuration(duration) ?? "0:00"}</span>
          <div className="ml-auto"><PlayerButton label="Full screen" onClick={() => void frameRef.current?.requestFullscreen()}><Maximize /></PlayerButton></div>
        </div>
      </div>
    </div>
  );
}

function PlayerButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-9 place-items-center rounded-full hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 [&_svg]:size-5">{children}</button>;
}
