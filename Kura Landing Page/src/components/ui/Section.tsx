import type { ElementType, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Width = "default" | "wide" | "narrow";

const WIDTHS: Record<Width, string> = {
  default: "container-kura",
  wide: "container-wide",
  narrow: "container-narrow",
};

export function Container({
  width = "default",
  className,
  children,
}: {
  width?: Width;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx(WIDTHS[width], className)}>{children}</div>;
}

type Tone = "default" | "tint" | "ink" | "deep";

const TONES: Record<Tone, string> = {
  default: "bg-surface text-text-primary",
  tint: "bg-ink-25 text-text-primary",
  ink: "bg-ink-900 text-white [--hairline:rgba(255,255,255,0.1)] selection:bg-white/20",
  deep: "bg-ink-950 text-white [--hairline:rgba(255,255,255,0.1)] selection:bg-white/20",
};

export function Section({
  as: As = "section",
  tone = "default",
  width = "default",
  pad = true,
  bleed = false,
  id,
  className,
  innerClassName,
  children,
}: {
  as?: ElementType;
  tone?: Tone;
  width?: Width;
  /** Apply the standard vertical section rhythm. */
  pad?: boolean;
  /** Skip the inner container (full-bleed content). */
  bleed?: boolean;
  id?: string;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <As
      id={id}
      className={cx("relative", TONES[tone], pad && "section-y", className)}
    >
      {bleed ? (
        children
      ) : (
        <Container width={width} className={innerClassName}>
          {children}
        </Container>
      )}
    </As>
  );
}
