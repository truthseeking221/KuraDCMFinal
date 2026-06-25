"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { X } from "@/icons";
import "./CalloutCard.css";

export interface CalloutCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  /** Image URL or custom node shown on the right. */
  illustration?: ReactNode;
  /** Primary action node (usually a Button). */
  primaryAction?: ReactNode;
  onDismiss?: () => void;
}

export function CalloutCard({
  title,
  illustration,
  primaryAction,
  onDismiss,
  className,
  children,
  ...rest
}: CalloutCardProps) {
  return (
    <div className={cx("kui-callout", className)} {...rest}>
      <div className="kui-callout__content">
        <h3 className="kui-callout__title">{title}</h3>
        {children && <div className="kui-callout__body">{children}</div>}
        {primaryAction && <div className="kui-callout__action">{primaryAction}</div>}
      </div>
      {illustration && (
        <div className="kui-callout__media" aria-hidden="true">
          {typeof illustration === "string" ? (
            // eslint-disable-next-line @next/next/no-img-element -- Callout illustrations can be arbitrary small decorative URLs.
            <img src={illustration} alt="" />
          ) : (
            illustration
          )}
        </div>
      )}
      {onDismiss && (
        <button
          type="button"
          className="kui-callout__close"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <X />
        </button>
      )}
    </div>
  );
}
