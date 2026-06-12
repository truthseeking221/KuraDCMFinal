"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Close } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./Drawer.css";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /* small line under the title — context, not instructions */
  subtitle?: ReactNode;
  /* pinned action row; page content scrolls behind it */
  footer?: ReactNode;
  width?: number;
  children: ReactNode;
  className?: string;
}

/* Right-hand contextual drawer — clinical actions happen here without
   leaving the patient record. Esc / overlay click / ✕ all close. */
export function Drawer({ open, onClose, title, subtitle, footer, width = 440, children, className }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    /* move focus into the dialog so Esc + tabbing work immediately */
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("input, textarea, select, button:not(.kui-drawer__close)");
    (first ?? panel)?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="kui-drawer-root">
      <div aria-hidden className="kui-drawer__overlay" onClick={onClose} />
      <div
        aria-label={typeof title === "string" ? title : undefined}
        aria-modal="true"
        className={cx("kui-drawer", className)}
        ref={panelRef}
        role="dialog"
        style={{ width }}
        tabIndex={-1}
      >
        <header className="kui-drawer__head">
          <div className="kui-drawer__titles">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button aria-label="Close" className="kui-drawer__close" onClick={onClose} type="button">
            <Close size={16} variant="stroke" />
          </button>
        </header>
        <div className="kui-drawer__body">{children}</div>
        {footer && <footer className="kui-drawer__foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
