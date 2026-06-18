"use client";

import type { MouseEventHandler, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { ChevronRight } from "@/icons";
import "./Breadcrumb.css";

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  onClick?: MouseEventHandler;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cx("kui-breadcrumb", className)} aria-label="Breadcrumb">
      <ol className="kui-breadcrumb__list">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          const interactive = !last && (item.href || item.onClick);
          return (
            <li key={i} className="kui-breadcrumb__item">
              {interactive && item.href ? (
                <a
                  className="kui-breadcrumb__link"
                  href={item.href}
                  onClick={item.onClick}
                >
                  {item.label}
                </a>
              ) : interactive ? (
                <button
                  className="kui-breadcrumb__link"
                  type="button"
                  onClick={item.onClick as MouseEventHandler<HTMLButtonElement>}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className="kui-breadcrumb__current"
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!last && (
                <span className="kui-breadcrumb__sep" aria-hidden="true">
                  <ChevronRight />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
