"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export function BentoGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("grid grid-cols-2 gap-4 lg:grid-cols-6", className)}>
      {children}
    </div>
  );
}

type Tone = "default" | "tint" | "ink" | "brand";

const TONES: Record<Tone, string> = {
  default: "bg-surface ring-1 ring-[var(--hairline)] text-ink-900",
  tint: "bg-ink-25 ring-1 ring-[var(--hairline)] text-ink-900",
  ink: "bg-ink-950 text-white [--hairline:rgba(255,255,255,0.12)]",
  brand: "bg-gradient-to-br from-brand-700 via-brand-600 to-deep-500 text-white",
};

/** A bento cell. Pass Tailwind col/row span via `span` (e.g. "lg:col-span-4 lg:row-span-2"). */
export function BentoCard({
  children,
  span,
  tone = "default",
  href,
  className,
  padded = true,
}: {
  children: ReactNode;
  span?: string;
  tone?: Tone;
  href?: string;
  className?: string;
  padded?: boolean;
}) {
  const cls = cx(
    "relative overflow-hidden rounded-[var(--radius-lg)]",
    TONES[tone],
    padded && "p-6 sm:p-7",
    href &&
      "group/bento block transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)]",
    span,
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return <div className={cls}>{children}</div>;
}
