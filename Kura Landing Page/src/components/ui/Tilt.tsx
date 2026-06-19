"use client";

import { useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Subtle 3D tilt toward the cursor with a soft glare. Desktop fine-pointer
 * only; disabled for reduced-motion. Wrap a card/visual.
 */
export function Tilt({
  children,
  max = 6,
  className,
}: {
  children: ReactNode;
  /** Max tilt in degrees. */
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const enabled = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || !enabled()) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1100px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={cx("transition-transform duration-300 ease-[var(--ease-out)] will-change-transform [transform-style:preserve-3d]", className)}
    >
      {children}
    </div>
  );
}
