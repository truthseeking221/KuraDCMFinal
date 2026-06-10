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
  /** Tone tint; defaults to a tone hashed from `name`. */
  tone?: AvatarTone;
  size?: AvatarSize;
  status?: AvatarStatus;
}

const TONES: AvatarTone[] = [
  "neutral",
  "brand",
  "info",
  "success",
  "warning",
  "danger",
];

function initialsOf(name?: string, explicit?: string): string {
  if (explicit) return explicit.slice(0, 2).toUpperCase();
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function hashTone(name?: string): AvatarTone {
  if (!name) return "neutral";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return TONES[Math.abs(hash) % TONES.length];
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
  const resolvedTone = tone ?? hashTone(name);
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
