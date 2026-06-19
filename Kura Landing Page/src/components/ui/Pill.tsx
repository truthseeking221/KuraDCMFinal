import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";

type Tone =
  | "neutral"
  | "brand"
  | "success"
  | "warn"
  | "danger"
  | "info"
  | "outline"
  | "inverse";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-50 text-success-600",
  warn: "bg-warn-50 text-warn-600",
  danger: "bg-danger-50 text-danger-600",
  info: "bg-info-100 text-info-600",
  outline: "ring-1 ring-inset ring-[var(--border-strong)] text-ink-600",
  inverse: "bg-white/10 text-white ring-1 ring-inset ring-white/15",
};

export function Pill({
  children,
  tone = "neutral",
  icon,
  dot,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: IconName;
  dot?: "success" | "warn" | "danger" | "brand";
  className?: string;
}) {
  const dotColor =
    dot === "success"
      ? "bg-success-500"
      : dot === "warn"
        ? "bg-warn-500"
        : dot === "danger"
          ? "bg-danger-500"
          : "bg-brand-500";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[0.75rem] font-medium leading-none",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className={cx("size-1.5 rounded-full", dotColor)} /> : null}
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}
