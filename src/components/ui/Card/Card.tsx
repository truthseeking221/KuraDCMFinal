"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import "./Card.css";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  /** Right-aligned header actions. */
  actions?: ReactNode;
  /** Apply body padding. Set false for flush content (tables, media). */
  padded?: boolean;
}

export function Card({
  title,
  actions,
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div className={cx("kui-card", className)} {...rest}>
      {(title || actions) && (
        <div className="kui-card__header">
          {title && <h3 className="kui-card__title">{title}</h3>}
          {actions && <div className="kui-card__actions">{actions}</div>}
        </div>
      )}
      <div className={cx("kui-card__body", !padded && "kui-card__body--flush")}>
        {children}
      </div>
    </div>
  );
}

export interface CardSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
}

/** A divided sub-section inside a Card. */
export function CardSection({
  title,
  className,
  children,
  ...rest
}: CardSectionProps) {
  return (
    <div className={cx("kui-card__section", className)} {...rest}>
      {title && <div className="kui-card__section-title">{title}</div>}
      {children}
    </div>
  );
}
