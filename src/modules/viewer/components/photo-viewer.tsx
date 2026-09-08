"use client";

import Image from "next/image";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { MediaItem } from "@/src/modules/library/types";

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export function PhotoViewer({ media }: { media: MediaItem }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [interacting, setInteracting] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastDrag = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistance = useRef<number | null>(null);

  const updateScale = (next: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    setScale(clamped);
    if (clamped === 1) setOffset({ x: 0, y: 0 });
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    updateScale(scale * (event.deltaY > 0 ? 0.88 : 1.12));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteracting(true);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastDrag.current = { x: event.clientX, y: event.clientY };
    if (pointers.current.size === 2) lastPinchDistance.current = pointerDistance(pointers.current);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const distance = pointerDistance(pointers.current);
      if (lastPinchDistance.current) updateScale(scale * distance / lastPinchDistance.current);
      lastPinchDistance.current = distance;
      return;
    }
    if (scale > 1 && lastDrag.current) {
      setOffset((current) => ({
        x: current.x + event.clientX - lastDrag.current!.x,
        y: current.y + event.clientY - lastDrag.current!.y,
      }));
      lastDrag.current = { x: event.clientX, y: event.clientY };
    }
  };

  const releasePointer = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) setInteracting(false);
    lastDrag.current = null;
    lastPinchDistance.current = null;
  };

  return (
    <div
      className={`relative flex size-full items-center justify-center overflow-hidden touch-none ${scale > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onDoubleClick={() => updateScale(scale === 1 ? 2 : 1)}
    >
      <Image
        key={media.id}
        src={media.contentUrl}
        alt={media.fileName}
        width={media.width}
        height={media.height}
        unoptimized
        priority
        draggable={false}
        className="max-h-full max-w-full select-none object-contain shadow-2xl"
        style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`, transition: interacting ? "none" : "transform 120ms ease-out" }}
      />
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/65 p-1.5 text-white shadow-lg backdrop-blur-md">
        <Control label="Zoom out" onClick={() => updateScale(scale / 1.25)} disabled={scale <= MIN_SCALE}><Minus /></Control>
        <span className="w-12 text-center text-xs font-medium tabular-nums">{Math.round(scale * 100)}%</span>
        <Control label="Zoom in" onClick={() => updateScale(scale * 1.25)} disabled={scale >= MAX_SCALE}><Plus /></Control>
        <Control label="Reset zoom" onClick={() => updateScale(1)} disabled={scale === 1}><RotateCcw /></Control>
      </div>
    </div>
  );
}

function Control({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={(event) => { event.stopPropagation(); onClick(); }} className="grid size-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-35 [&_svg]:size-4">{children}</button>;
}

function pointerDistance(pointers: Map<number, { x: number; y: number }>) {
  const [first, second] = [...pointers.values()];
  if (!first || !second) return 0;
  return Math.hypot(second.x - first.x, second.y - first.y);
}
