"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { formatDuration } from "@/lib/utils";
import type { MediaItem } from "@/src/modules/library/types";
import {
  FullscreenExitIcon,
  FullscreenIcon,
  PauseIcon,
  PlayIcon,
  ReplayIcon,
  SettingsIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMutedIcon,
} from "@/src/modules/viewer/components/player-icons";
import { ProgressBar } from "@/src/modules/viewer/components/progress-bar";
import { SettingsMenu } from "@/src/modules/viewer/components/settings-menu";

// The same player as LocalTube's, without its chapters and watch history. The arrow keys stay with the viewer,
// which uses them to move between items.

const VOLUME_KEY = "lgallery:volume";
const HIDE_AFTER_MS = 3000;
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

type Bezel = { id: number; kind: "play" | "pause" } | null;
type Toast = { id: number; text: string; side?: "left" | "right" } | null;

const time = (seconds: number) => formatDuration(seconds) ?? "0:00";

function readVolume(): { volume: number; muted: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? "null");
    if (saved && typeof saved.volume === "number") return saved;
  } catch {}
  return { volume: 1, muted: false };
}

export function VideoPlayer({ media }: { media: MediaItem }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(media.durationSeconds ?? 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bezel, setBezel] = useState<Bezel>(null);
  const [toast, setToast] = useState<Toast>(null);

  const el = () => videoRef.current;

  const flashToast = useCallback((text: string, side?: "left" | "right") => {
    setToast({ id: Date.now(), text, side });
  }, []);

  const togglePlay = useCallback(() => {
    const v = el();
    if (!v) return;
    if (v.paused || v.ended) {
      v.play().catch(() => {});
      setBezel({ id: Date.now(), kind: "play" });
    } else {
      v.pause();
      setBezel({ id: Date.now(), kind: "pause" });
    }
  }, []);

  const seekTo = useCallback((target: number) => {
    const v = el();
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.min(Math.max(target, 0), v.duration);
    setCurrent(v.currentTime);
  }, []);

  const seekBy = useCallback(
    (delta: number) => {
      const v = el();
      if (!v) return;
      seekTo(v.currentTime + delta);
      flashToast(`${Math.abs(delta)} seconds`, delta < 0 ? "left" : "right");
    },
    [seekTo, flashToast],
  );

  const applyVolume = useCallback((next: number, nextMuted: boolean) => {
    const v = el();
    const clamped = Math.min(Math.max(next, 0), 1);
    if (v) {
      v.volume = clamped;
      v.muted = nextMuted;
    }
    setVolume(clamped);
    setMuted(nextMuted);
    try {
      localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume: clamped, muted: nextMuted }));
    } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    if (muted || volume === 0) applyVolume(volume || 1, false);
    else applyVolume(volume, true);
  }, [muted, volume, applyVolume]);

  const changeRate = useCallback((next: number) => {
    const v = el();
    if (v) v.playbackRate = next;
    setRate(next);
  }, []);

  // The whole player goes full screen where the browser allows it; the iPhone only lets the video itself, with
  // its own controls.
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    const v = el() as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (container.requestFullscreen) {
      container.requestFullscreen().catch(() => {});
    } else {
      v?.webkitEnterFullscreen?.();
    }
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!el()?.paused) setControlsVisible(false);
    }, HIDE_AFTER_MS);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const showAll = !playing || settingsOpen || controlsVisible;

  useEffect(() => {
    const v = el();
    if (!v) return;
    const saved = readVolume();
    v.volume = saved.volume;
    v.muted = saved.muted;
    setVolume(saved.volume);
    setMuted(saved.muted);
  }, []);

  function onLoadedMetadata() {
    const v = el();
    if (!v) return;
    setDuration(Number.isFinite(v.duration) ? v.duration : 0);
    setError(false);
    v.playbackRate = rate;
    v.play().catch(() => {});
  }

  function onProgress() {
    const v = el();
    if (!v || v.buffered.length === 0) return;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= v.currentTime && v.currentTime <= v.buffered.end(i)) {
        setBuffered(v.buffered.end(i));
        return;
      }
    }
  }

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable=true]")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const v = el();
      if (!v) return;

      if (event.shiftKey) {
        if (event.key === ">" || event.key === "<") {
          const index = SPEEDS.indexOf(v.playbackRate);
          const next = SPEEDS[Math.min(Math.max(index + (event.key === ">" ? 1 : -1), 0), SPEEDS.length - 1)];
          changeRate(next);
          flashToast(`${next}x`);
          event.preventDefault();
        }
        return;
      }

      const handled = (() => {
        switch (event.key.toLowerCase()) {
          case " ":
          case "k":
            togglePlay();
            return true;
          case "j":
            seekBy(-10);
            return true;
          case "l":
            seekBy(10);
            return true;
          case "arrowup":
          case "arrowdown": {
            const next = Math.round((v.volume + (event.key === "ArrowUp" ? 0.05 : -0.05)) * 100) / 100;
            applyVolume(next, false);
            flashToast(`${Math.round(Math.min(Math.max(next, 0), 1) * 100)}%`);
            return true;
          }
          case "m":
            toggleMute();
            return true;
          case "f":
            toggleFullscreen();
            return true;
          case "home":
            seekTo(0);
            return true;
          case "end":
            seekTo(v.duration);
            return true;
          default:
            if (/^[0-9]$/.test(event.key)) {
              seekTo((Number(event.key) / 10) * v.duration);
              return true;
            }
            return false;
        }
      })();

      if (handled) {
        event.preventDefault();
        showControls();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, seekTo, applyVolume, toggleMute, toggleFullscreen, changeRate, flashToast, showControls]);

  // On touch screens a tap shows or hides the controls, and a double tap on a side jumps 10 seconds.
  const lastTap = useRef(0);
  function onSurfacePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    const now = Date.now();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    if (now - lastTap.current < 300 && (x < 0.35 || x > 0.65)) {
      seekBy(x < 0.5 ? -10 : 10);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    if (controlsVisible && playing) setControlsVisible(false);
    else showControls();
  }

  const volumeIcon =
    muted || volume === 0 ? <VolumeMutedIcon size={36} /> : volume < 0.5 ? <VolumeLowIcon size={36} /> : <VolumeHighIcon size={36} />;

  return (
    <div
      ref={containerRef}
      className={`group/player relative size-full overflow-hidden bg-black select-none ${showAll ? "" : "cursor-none"}`}
      onMouseMove={showControls}
      onMouseLeave={() => playing && !settingsOpen && setControlsVisible(false)}
    >
      <video
        ref={videoRef}
        src={media.contentUrl}
        poster={media.thumbnailUrl}
        preload="metadata"
        playsInline
        className="absolute inset-0 size-full object-contain"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onProgress={onProgress}
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
          showControls();
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setEnded(true);
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onRateChange={(event) => setRate(event.currentTarget.playbackRate)}
        onError={() => {
          setError(true);
          setPlaying(false);
        }}
      />

      <div
        className="absolute inset-0"
        onClick={(event) => {
          const pointer = (event.nativeEvent as globalThis.PointerEvent).pointerType;
          if (pointer && pointer !== "mouse") return;
          if (settingsOpen) setSettingsOpen(false);
          else togglePlay();
        }}
        onDoubleClick={toggleFullscreen}
        onPointerUp={onSurfacePointerUp}
      />

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/75 px-6 text-center text-sm text-white/75">
          This video can’t be played in this browser.
        </div>
      )}

      {waiting && playing && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2">
          <div className="size-full rounded-full border-4 border-white/25 border-t-white [animation:yt-spin_1s_linear_infinite]" />
        </div>
      )}

      {bezel && (
        <div
          key={bezel.id}
          className="pointer-events-none absolute top-1/2 left-1/2 flex size-[52px] items-center justify-center rounded-full bg-black/50 text-white [animation:yt-bezel_0.5s_linear_forwards]"
        >
          {bezel.kind === "play" ? <PlayIcon size={52} /> : <PauseIcon size={52} />}
        </div>
      )}

      {toast && (
        <div
          key={toast.id}
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white [animation:yt-fade_0.9s_linear_forwards] ${
            toast.side === "left" ? "left-[10%]" : toast.side === "right" ? "right-[10%]" : "top-[15%] left-1/2 -translate-x-1/2"
          }`}
          onAnimationEnd={() => setToast(null)}
        >
          {toast.side === "left" && "◀◀ "}
          {toast.text}
          {toast.side === "right" && " ▶▶"}
        </div>
      )}

      <div
        data-player-controls
        className={`absolute inset-x-0 bottom-0 pb-[env(safe-area-inset-bottom)] transition-opacity duration-200 ${
          showAll ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[98px] bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <SettingsMenu
          open={settingsOpen}
          rate={rate}
          speeds={SPEEDS}
          onRate={(next) => {
            changeRate(next);
            setSettingsOpen(false);
          }}
          onClose={() => setSettingsOpen(false)}
        />

        <div className="relative px-3">
          <ProgressBar current={current} duration={duration} buffered={buffered} onSeek={seekTo} />
          <div className="flex h-12 items-center text-white">
            <ControlButton label={ended ? "Replay" : playing ? "Pause (k)" : "Play (k)"} onClick={togglePlay}>
              {ended ? <ReplayIcon size={36} /> : playing ? <PauseIcon size={36} /> : <PlayIcon size={36} />}
            </ControlButton>

            <div className="group/volume flex items-center">
              <ControlButton label={muted ? "Unmute (m)" : "Mute (m)"} onClick={toggleMute}>
                {volumeIcon}
              </ControlButton>
              <div className="w-0 overflow-hidden transition-[width] duration-200 group-hover/volume:w-[60px] group-focus-within/volume:w-[60px]">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  aria-label="Volume"
                  onChange={(event) => applyVolume(Number(event.target.value), false)}
                  className="mx-1 h-1 w-[52px] cursor-pointer appearance-none rounded-full bg-white/30 accent-white [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  style={{
                    background: `linear-gradient(to right, #fff ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,.2) ${(muted ? 0 : volume) * 100}%)`,
                  }}
                />
              </div>
            </div>

            <div className="px-[5px] text-[13px] leading-[47px] whitespace-nowrap tabular-nums [text-shadow:0_0_2px_rgba(0,0,0,.5)]">
              <span>{time(current)}</span>
              <span className="px-1 text-white/70">/</span>
              <span className="text-white/90">{time(duration)}</span>
            </div>

            <div className="ml-auto flex shrink-0 items-center">
              <ControlButton
                label="Settings"
                onClick={() => setSettingsOpen((value) => !value)}
                className={settingsOpen ? "[&_svg]:rotate-[30deg]" : ""}
              >
                <SettingsIcon size={36} className="transition-transform duration-100" />
              </ControlButton>
              <ControlButton label={fullscreen ? "Exit full screen (f)" : "Full screen (f)"} onClick={toggleFullscreen}>
                {fullscreen ? <FullscreenExitIcon size={36} /> : <FullscreenIcon size={36} />}
              </ControlButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`group/btn relative flex h-12 w-12 shrink-0 items-center justify-center opacity-90 hover:opacity-100 ${className}`}
    >
      {children}
      <span className="pointer-events-none absolute bottom-[58px] left-1/2 hidden -translate-x-1/2 rounded bg-[rgba(28,28,28,0.9)] px-2 py-[5px] text-xs font-medium whitespace-nowrap text-[#eee] group-hover/btn:block">
        {label}
      </span>
    </button>
  );
}
