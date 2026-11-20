"use client";

import { useRef, useState, type PointerEvent } from "react";
import { formatDuration } from "@/lib/utils";

const time = (seconds: number) => formatDuration(seconds) ?? "0:00";

/** The player's seek bar, the same as LocalTube's: drag with a finger or the mouse, with a time bubble. */
export function ProgressBar({
  current,
  duration,
  buffered,
  onSeek,
}: {
  current: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  function fractionAt(clientX: number) {
    const rect = ref.current!.getBoundingClientRect();
    setWidth(rect.width);
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(fractionAt(event.clientX));
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const fraction = fractionAt(event.clientX);
    setHover(fraction);
    if (dragging !== null) setDragging(fraction);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragging === null) return;
    onSeek(fractionAt(event.clientX) * duration);
    setDragging(null);
  }

  const played = dragging ?? (duration ? current / duration : 0);
  const bufferedFraction = duration ? buffered / duration : 0;
  const bubble = dragging ?? hover;
  // Keeps the bubble inside the player.
  const margin = 24;
  const bubbleLeft = Math.min(Math.max((bubble ?? 0) * width, margin), Math.max(width - margin, margin));

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(current)}
      aria-valuetext={`${time(current)} of ${time(duration)}`}
      tabIndex={-1}
      className="group/progress relative h-[5px] cursor-pointer touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setHover(null)}
    >
      <div className="absolute inset-x-0 -top-2 -bottom-1" />
      <div className={`absolute inset-x-0 bottom-0 bg-white/20 transition-[height] duration-100 ${bubble !== null ? "h-[5px]" : "h-[3px]"}`}>
        <div className="absolute inset-y-0 left-0 bg-white/40" style={{ width: `${Math.min(bufferedFraction, 1) * 100}%` }} />
        {hover !== null && <div className="absolute inset-y-0 left-0 bg-white/50" style={{ width: `${hover * 100}%` }} />}
        <div className="absolute inset-y-0 left-0 bg-primary-blue" style={{ width: `${Math.min(played, 1) * 100}%` }} />
      </div>
      <div
        className={`absolute bottom-[-4px] size-[13px] -translate-x-1/2 rounded-full bg-primary-blue transition-transform duration-100 ${
          dragging !== null ? "scale-100" : "scale-0 group-hover/progress:scale-100"
        }`}
        style={{ left: `${played * 100}%` }}
      />
      {bubble !== null && (
        <div className="pointer-events-none absolute bottom-5 -translate-x-1/2" style={{ left: bubbleLeft }}>
          <span className="rounded bg-[rgba(28,28,28,0.9)] px-2 py-[3px] text-xs font-medium text-white">{time(bubble * duration)}</span>
        </div>
      )}
    </div>
  );
}
