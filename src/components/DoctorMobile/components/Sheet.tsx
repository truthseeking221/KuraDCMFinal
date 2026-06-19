"use client";

/* Imperative bottom-sheet STACK (sheet-over-sheet). useSheets().open(render)
   pushes a sheet; the top sheet is dismissible by backdrop click, Esc, or
   swipe-down. <SheetHost /> renders the stack (mounted once by the shell). The
   <Sheet> shell (sticky header + scrollable body + optional sticky footer) is
   what you return from the render fn. Body scroll-locks while any sheet is open. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Close } from "@/icons/components";
import { cx } from "@/lib/cx";
import styles from "./Sheet.module.css";

type SheetEntry = { id: string; render: (close: () => void) => ReactNode };

export type SheetsApi = {
  open: (render: (close: () => void) => ReactNode) => void;
  close: () => void;
};

const SheetsContext = createContext<{
  entries: SheetEntry[];
  open: (render: (close: () => void) => ReactNode) => void;
  closeTop: () => void;
  closeById: (id: string) => void;
} | null>(null);

let sheetSeq = 0;

export function SheetsProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<SheetEntry[]>([]);

  const open = useCallback((render: (close: () => void) => ReactNode) => {
    sheetSeq += 1;
    const id = `sheet-${sheetSeq}`;
    setEntries((current) => [...current, { id, render }]);
  }, []);

  const closeTop = useCallback(() => {
    setEntries((current) => current.slice(0, -1));
  }, []);

  const closeById = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  /* scroll-lock the body while any sheet is open */
  useEffect(() => {
    if (entries.length === 0) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [entries.length]);

  /* Esc dismisses the top sheet */
  useEffect(() => {
    if (entries.length === 0) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entries.length, closeTop]);

  const value = useMemo(() => ({ entries, open, closeTop, closeById }), [entries, open, closeTop, closeById]);

  return <SheetsContext.Provider value={value}>{children}</SheetsContext.Provider>;
}

export function useSheets(): SheetsApi {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error("useSheets must be used inside <SheetsProvider>");
  return useMemo(() => ({ open: ctx.open, close: ctx.closeTop }), [ctx.open, ctx.closeTop]);
}

/* The host renders the whole stack. Only the topmost backdrop is interactive;
   lower sheets stay mounted behind it (sheet-over-sheet). */
export function SheetHost() {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error("<SheetHost /> must be used inside <SheetsProvider>");
  const { entries, closeById } = ctx;
  if (entries.length === 0) return null;

  return (
    <>
      {entries.map((entry, index) => (
        <SheetLayer key={entry.id} isTop={index === entries.length - 1} onClose={() => closeById(entry.id)}>
          {entry.render(() => closeById(entry.id))}
        </SheetLayer>
      ))}
    </>
  );
}

function SheetLayer({
  children,
  isTop,
  onClose,
}: {
  children: ReactNode;
  isTop: boolean;
  onClose: () => void;
}) {
  const dragRef = useRef<{ startY: number; offset: number } | null>(null);
  const [dragY, setDragY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const onBackdrop = useCallback(() => {
    if (isTop) onClose();
  }, [isTop, onClose]);

  /* swipe-down to dismiss — only when the sheet body is scrolled to the top */
  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = sheetRef.current?.querySelector(`.${styles.body}`) as HTMLElement | null;
    if (scroller && scroller.scrollTop > 0) return;
    dragRef.current = { startY: event.clientY, offset: 0 };
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = event.clientY - dragRef.current.startY;
    if (delta > 0) {
      dragRef.current.offset = delta;
      setDragY(delta);
    }
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragRef.current) return;
    const shouldClose = dragRef.current.offset > 96;
    dragRef.current = null;
    setDragY(0);
    if (shouldClose) onClose();
  }, [onClose]);

  return (
    <div
      className={cx(styles.overlay, !isTop && styles.overlayBehind)}
      role="presentation"
      onClick={onBackdrop}
    >
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className={styles.grip} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

/* The presentational shell used INSIDE a render fn: sticky header (title +
   close X), scrollable body, optional sticky footer. */
export function Sheet({
  title,
  footer,
  onClose,
  size = "auto",
  children,
}: {
  title?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  size?: "auto" | "full";
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <div className={cx(styles.shell, size === "full" && styles.shellFull)} aria-labelledby={title ? titleId : undefined}>
      {(title != null || onClose) && (
        <header className={styles.header}>
          {title != null ? (
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          ) : (
            <span />
          )}
          {onClose && (
            <button className={styles.close} type="button" aria-label="Close" onClick={onClose}>
              <Close size={18} variant="stroke" aria-hidden="true" />
            </button>
          )}
        </header>
      )}
      <div className={styles.body}>{children}</div>
      {footer != null && <footer className={styles.footer}>{footer}</footer>}
    </div>
  );
}
