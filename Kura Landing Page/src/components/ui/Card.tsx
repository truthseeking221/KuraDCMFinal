import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Tone = "default" | "tint" | "ink" | "outline";

const TONES: Record<Tone, string> = {
  default: "bg-surface ring-1 ring-[var(--hairline)] shadow-[var(--shadow-sm)]",
  tint: "bg-ink-25 ring-1 ring-[var(--hairline)]",
  ink: "bg-ink-800 text-white ring-1 ring-white/10",
  outline: "ring-1 ring-[var(--border-strong)]",
};

export function Card({
  children,
  tone = "default",
  hover = false,
  href,
  className,
  padded = true,
}: {
  children: ReactNode;
  tone?: Tone;
  hover?: boolean;
  href?: string;
  className?: string;
  padded?: boolean;
}) {
  const cls = cx(
    "relative rounded-[var(--radius-lg)]",
    TONES[tone],
    padded && "p-6 sm:p-7",
    hover &&
      "transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)]",
    href && "block",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cx(cls, "group/card")}>
        {children}
      </Link>
    );
  }
  return <div className={cls}>{children}</div>;
}
