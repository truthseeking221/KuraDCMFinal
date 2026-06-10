"use client";

import { cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { KuraLogomark } from "@/icons/brand/KuraLogomark";
import "./Sidebar.css";


export interface SidebarItem {
  label: ReactNode;
  icon: ReactNode;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}

export interface SidebarProps {
  /** Top brand mark. Defaults to a "Kura" wordmark. */
  logo?: ReactNode;
  items: SidebarItem[];
  /** Items pinned to the bottom (e.g. Settings). */
  bottomItems?: SidebarItem[];
  /** Footer node below the bottom items (e.g. an Avatar). */
  footer?: ReactNode;
  className?: string;
}

function RailItem({ item }: { item: SidebarItem }) {
  // Default state → stroke icons; active state → filled "bulk" icons. Size 24.
  const icon = isValidElement(item.icon)
    ? cloneElement(
        item.icon as ReactElement<{ variant?: string; size?: number }>,
        { variant: item.active ? "bulk" : "stroke", size: 24 },
      )
    : item.icon;
  const inner = (
    <>
      <span className="kui-sidebar__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="kui-sidebar__label">{item.label}</span>
    </>
  );
  const cls = cx("kui-sidebar__item", item.active && "is-active");
  return item.href ? (
    <a
      href={item.href}
      className={cls}
      onClick={item.onClick}
      aria-current={item.active ? "page" : undefined}
    >
      {inner}
    </a>
  ) : (
    <button
      type="button"
      className={cls}
      onClick={item.onClick}
      aria-current={item.active ? "page" : undefined}
    >
      {inner}
    </button>
  );
}

export function Sidebar({
  logo,
  items,
  bottomItems,
  footer,
  className,
}: SidebarProps) {
  return (
    <nav className={cx("kui-sidebar", className)}>
      <div className="kui-sidebar__logo">
        {logo ?? <KuraLogomark />}
      </div>
      <div className="kui-sidebar__list">
        {items.map((item, i) => (
          <RailItem key={i} item={item} />
        ))}
      </div>
      <div className="kui-sidebar__spacer" />
      {(bottomItems?.length || footer) && (
        <div className="kui-sidebar__bottom">
          {bottomItems?.map((item, i) => (
            <RailItem key={i} item={item} />
          ))}
          {footer}
        </div>
      )}
    </nav>
  );
}
