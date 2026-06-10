"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type FilterIconProps = {
  src: string;
  size?: number;
  className?: string;
};

function Icon({ src, size = 16, className = "" }: FilterIconProps) {
  return (
    <span
      aria-hidden
      className={cx("mask-icon", className)}
      style={
        {
          "--icon-size": `${size}px`,
          "--mask-url": `url(${src})`,
        } as CSSProperties
      }
    />
  );
}

type CountProps = {
  children: ReactNode;
  selected?: boolean;
  className?: string;
};

function Count({ children, selected = false, className }: CountProps) {
  return <span className={cx("filter-count", selected && "selected", className)}>{children}</span>;
}

type TriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  count?: number | string;
  expanded: boolean;
  label?: string;
  state?: "rest" | "hover" | "active";
};

function Trigger({ count, expanded, label = "Filters", state = "rest", className, ...props }: TriggerProps) {
  return (
    <button
      aria-expanded={expanded}
      aria-haspopup="dialog"
      className={cx("filter-button", className)}
      data-state={state}
      type="button"
      {...props}
    >
      <Icon src="/figma/icon-filter.svg" />
      <span className="filter-button-label">{label}</span>
      {count !== undefined && <span className="filter-button-count">{count}</span>}
      <Icon src="/figma/icon-caret.svg" />
    </button>
  );
}

type CheckboxProps = {
  checked?: boolean;
  className?: string;
};

function Checkbox({ checked = false, className }: CheckboxProps) {
  return (
    <span className={cx("filter-checkbox", checked && "checked", className)} aria-hidden>
      {checked && <Icon src="/figma/icon-check.svg" size={12} />}
    </span>
  );
}

type OptionProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  count: number | string;
  label: string;
  selected?: boolean;
};

function Option({ count, label, selected = false, className, ...props }: OptionProps) {
  return (
    <button className={cx("filter-option", selected && "selected", className)} type="button" {...props}>
      <span className="filter-option-left">
        <Checkbox checked={selected} />
        <span>{label}</span>
      </span>
      <Count selected={selected}>{count}</Count>
    </button>
  );
}

type CategoryRowProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  count?: number | string;
  label: string;
};

function CategoryRow({ count = 2, label, className, ...props }: CategoryRowProps) {
  return (
    <button className={cx("category-row", className)} type="button" {...props}>
      <span>{label}</span>
      <span className="category-row-right">
        <Count>{count}</Count>
        <Icon src="/figma/icon-chevron-right.svg" />
      </span>
    </button>
  );
}

type ActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

function Action({ children, className, type = "button", ...props }: ActionProps) {
  return (
    <button className={cx("filter-action-button", className)} type={type} {...props}>
      {children}
    </button>
  );
}

export const FilterPrimitives = {
  Action,
  CategoryRow,
  Checkbox,
  Count,
  Icon,
  Option,
  Trigger,
};
