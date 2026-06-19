import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Reveal } from "./Reveal";

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cx("eyebrow", className)}>{children}</p>;
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "left",
  tone = "default",
  className,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  tone?: "default" | "inverse";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center mx-auto max-w-2xl",
        align === "left" && "max-w-2xl",
        className,
      )}
    >
      {eyebrow ? (
        <Reveal>
          <Eyebrow className={tone === "inverse" ? "text-brand-200" : undefined}>
            {eyebrow}
          </Eyebrow>
        </Reveal>
      ) : null}
      <Reveal delay={1}>
        <h2
          className={cx(
            "text-h2 font-medium text-balance",
            tone === "inverse" ? "text-white" : "text-text-primary",
          )}
        >
          {title}
        </h2>
      </Reveal>
      {lead ? (
        <Reveal delay={2}>
          <p
            className={cx(
              "text-lead text-pretty",
              tone === "inverse" ? "text-white/70" : "text-text-secondary",
            )}
          >
            {lead}
          </p>
        </Reveal>
      ) : null}
      {children}
    </div>
  );
}
