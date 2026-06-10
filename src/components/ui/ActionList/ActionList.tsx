"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import "./ActionList.css";

export interface ActionItem {
  label: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface ActionSection {
  title?: ReactNode;
  items: ActionItem[];
}

export interface ActionListProps {
  items?: ActionItem[];
  /** Grouped items with optional section titles. Overrides `items`. */
  sections?: ActionSection[];
  className?: string;
}

export function ActionList({ items, sections, className }: ActionListProps) {
  const groups: ActionSection[] = sections ?? (items ? [{ items }] : []);
  return (
    <div className={cx("kui-actionlist", className)} role="menu">
      {groups.map((group, gi) => (
        <div key={gi} className="kui-actionlist__section">
          {group.title && (
            <div className="kui-actionlist__title">{group.title}</div>
          )}
          {group.items.map((item, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cx(
                "kui-actionlist__item",
                item.destructive && "is-destructive",
              )}
              onClick={item.onClick}
            >
              {item.icon && (
                <span className="kui-actionlist__icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="kui-actionlist__label">{item.label}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
