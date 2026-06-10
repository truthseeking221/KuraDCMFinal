"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  icon?: ReactNode;
  shape?: "pill" | "rounded";
  size?: "sm" | "md";
  variant?: "primary";
};

export function Button({
  children,
  className,
  icon,
  shape = "pill",
  size = "sm",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx("button", `button-${variant}`, `button-${size}`, `button-${shape}`, className)}
      type={type}
      {...props}
    >
      {icon && <span className="button-icon">{icon}</span>}
      <span className="button-label">{children}</span>
    </button>
  );
}
