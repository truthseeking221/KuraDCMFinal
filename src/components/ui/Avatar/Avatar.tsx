"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { User } from "@/icons";
import "./Avatar.css";

export type AvatarTone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger";
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "none" | "online" | "away" | "busy";

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name?: string;
  src?: string;
  /** Explicit initials (otherwise derived from `name`). */
  initials?: string;
  /** Custom icon node (defaults to a solid person). */
  icon?: ReactNode;
  /** Force content type; otherwise auto: image › initials › icon. */
  content?: "icon" | "initials";
  /** Legacy API: all app avatars now render in the same neutral tone. */
  tone?: AvatarTone;
  size?: AvatarSize;
  status?: AvatarStatus;
}

function initialsOf(name?: string, explicit?: string): string {
  if (explicit) return explicit.slice(0, 2).toUpperCase();
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({
  name,
  src,
  initials,
  icon,
  content,
  tone,
  size = "md",
  status = "none",
  className,
  ...rest
}: AvatarProps) {
  const resolvedTone = tone ?? "neutral";
  const text = initialsOf(name, initials);
  const showInitials =
    content === "initials" || (content !== "icon" && text.length > 0);

  return (
    <span
      className={cx(
        "kui-avatar",
        `kui-avatar--${size}`,
        `kui-avatar--${resolvedTone}`,
        className,
      )}
      role={name ? "img" : undefined}
      aria-label={name || undefined}
      {...rest}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- Avatar accepts arbitrary app-provided URLs and has fixed CSS sizing.
        <img className="kui-avatar__img" src={src} alt={name ?? ""} />
      ) : showInitials ? (
        <span className="kui-avatar__initials" aria-hidden="true">
          {text}
        </span>
      ) : (
        <span className="kui-avatar__icon" aria-hidden="true">
          {icon ?? <User variant="bulk" />}
        </span>
      )}
      {status !== "none" && (
        <span className={cx("kui-avatar__status", `kui-avatar__status--${status}`)} />
      )}
    </span>
  );
}
