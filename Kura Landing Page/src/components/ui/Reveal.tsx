"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Scroll-reveal wrapper. Fades + lifts its children into place the first time
 * they enter the viewport. Respects prefers-reduced-motion (the CSS for
 * `.reveal` disables the transform there).
 */
export function Reveal({
  children,
  as: As = "div",
  delay = 0,
  className,
  once = true,
}: {
  children: ReactNode;
  as?: ElementType;
  /** Stagger step 0–5 (maps to ~80ms increments). */
  delay?: 0 | 1 | 2 | 3 | 4 | 5;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setShown(true), 0);
      return () => window.clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) io.disconnect();
          } else if (!once) {
            setShown(false);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <As
      ref={ref}
      className={cx("reveal", className)}
      data-revealed={shown ? "true" : "false"}
      data-delay={delay || undefined}
    >
      {children}
    </As>
  );
}
