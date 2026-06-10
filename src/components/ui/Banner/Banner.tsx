"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Info, CheckCircle, AlertTriangle, AlertCircle, Sparkles, X } from "@/icons";
import "./Banner.css";

export type BannerTone = "info" | "success" | "warning" | "danger" | "ai";

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: BannerTone;
  title?: ReactNode;
  /** Override the default tone icon. */
  icon?: ReactNode;
  /** Footer action buttons. */
  actions?: ReactNode;
  onDismiss?: () => void;
}

const TONE_ICON: Record<BannerTone, ReactNode> = {
  info: <Info />,
  success: <CheckCircle />,
  warning: <AlertTriangle />,
  danger: <AlertCircle />,
  ai: <Sparkles />,
};

export function Banner({
  tone = "info",
  title,
  icon,
  actions,
  onDismiss,
  className,
  children,
  ...rest
}: BannerProps) {
  return (
    <div className={cx("kui-banner", `kui-banner--${tone}`, className)} role="status" {...rest}>
      <div className="kui-banner__header">
        <span className="kui-banner__icon" aria-hidden="true">
          {icon ?? TONE_ICON[tone]}
        </span>
        {title && <span className="kui-banner__title">{title}</span>}
        {onDismiss && (
          <button
            type="button"
            className="kui-banner__close"
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <X />
          </button>
        )}
      </div>
      {(children || actions) && (
        <div className="kui-banner__body">
          {children && <div className="kui-banner__message">{children}</div>}
          {actions && <div className="kui-banner__actions">{actions}</div>}
        </div>
      )}
    </div>
  );
}
