"use client";

import { useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Horizontal scroller you can grab and fling with the mouse (momentum decay),
 * like an editorial gallery. Touch keeps native momentum scroll. A drag past a
 * small threshold suppresses the click so cards don't fire mid-fling.
 */
export function DragScroller({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({
    down: false,
    startX: 0,
    startLeft: 0,
    lastX: 0,
    vel: 0,
    moved: false,
    raf: 0,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return; // touch = native scroll
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(state.current.raf);
    state.current.down = true;
    state.current.moved = false;
    state.current.startX = e.clientX;
    state.current.startLeft = el.scrollLeft;
    state.current.lastX = e.clientX;
    state.current.vel = 0;
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = state.current;
    const el = ref.current;
    if (!s.down || !el) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    el.scrollLeft = s.startLeft - dx;
    s.vel = e.clientX - s.lastX;
    s.lastX = e.clientX;
  };

  const endDrag = (e: React.PointerEvent) => {
    const s = state.current;
    const el = ref.current;
    if (!s.down || !el) return;
    s.down = false;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    let v = s.vel;
    const decay = () => {
      if (Math.abs(v) < 0.4) return;
      el.scrollLeft -= v;
      v *= 0.93;
      s.raf = requestAnimationFrame(decay);
    };
    decay();
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={(e) => {
        if (state.current.moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      className={cx(
        "flex gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none",
        "cursor-grab active:cursor-grabbing snap-x snap-mandatory md:snap-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
