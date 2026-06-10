"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { cx } from "@/lib/cx";
import { Search as SearchIcon } from "@/icons";
import "./Header.css";

export interface HeaderProps extends HTMLAttributes<HTMLElement> {
  /** Left-side brand mark. Falls back to children. */
  logo?: ReactNode;
  /** Center slot (usually a HeaderSearch). */
  center?: ReactNode;
  /** Right-side actions. */
  actions?: ReactNode;
}

export function Header({
  logo,
  center,
  actions,
  className,
  children,
  ...rest
}: HeaderProps) {
  return (
    <header className={cx("kui-header", className)} {...rest}>
      <div className="kui-header__brand">{logo ?? children}</div>
      {center && <div className="kui-header__center">{center}</div>}
      {actions && <div className="kui-header__actions">{actions}</div>}
    </header>
  );
}

export interface HeaderSearchProps
  extends InputHTMLAttributes<HTMLInputElement> {
  /** Keyboard shortcut hint shown on the right. */
  kbd?: ReactNode;
}

export function HeaderSearch({
  kbd = "⌘ K",
  placeholder = "Search",
  ...rest
}: HeaderSearchProps) {
  return (
    <div className="kui-header__search">
      <span className="kui-header__search-icon" aria-hidden="true">
        <SearchIcon />
      </span>
      <input placeholder={placeholder} {...rest} />
      {kbd && <span className="kui-header__kbd">{kbd}</span>}
    </div>
  );
}

export function HeaderIconButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cx("kui-header__icon-btn", className)} {...rest}>
      {children}
    </button>
  );
}
