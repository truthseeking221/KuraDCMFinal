import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "soft";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-[var(--shadow-sm)] hover:bg-brand-600 hover:shadow-[var(--shadow-brand)] active:bg-brand-700",
  secondary: "bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950",
  outline:
    "bg-transparent text-ink-800 ring-1 ring-inset ring-[var(--border-strong)] hover:bg-ink-25 hover:ring-ink-300",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem] gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-11 px-5 text-[0.9375rem] gap-2 rounded-[var(--radius-md)]",
  lg: "h-[3.25rem] px-7 text-base gap-2.5 rounded-[var(--radius-md)]",
};

const base =
  "group/btn inline-flex items-center justify-center font-medium whitespace-nowrap transition-[background,box-shadow,transform,color] duration-200 ease-[var(--ease-out)] select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  iconRight?: IconName;
  iconLeft?: IconName;
  full?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonProps =
  | (CommonProps & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">)
  | (CommonProps & { href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">);

function inner(children: ReactNode, iconLeft?: IconName, iconRight?: IconName) {
  return (
    <>
      {iconLeft ? <Icon name={iconLeft} size={18} /> : null}
      <span>{children}</span>
      {iconRight ? (
        <Icon
          name={iconRight}
          size={18}
          className="transition-transform duration-200 ease-[var(--ease-out)] group-hover/btn:translate-x-0.5"
        />
      ) : null}
    </>
  );
}

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    iconRight,
    iconLeft,
    full,
    className,
    children,
    href,
    ...rest
  } = props as CommonProps & { href?: string } & Record<string, unknown>;

  const cls = cx(base, VARIANTS[variant], SIZES[size], full && "w-full", className);

  if (typeof href === "string") {
    return (
      <Link
        href={href}
        className={cls}
        {...(rest as Omit<ComponentProps<typeof Link>, "href" | "className">)}
      >
        {inner(children, iconLeft, iconRight)}
      </Link>
    );
  }

  return (
    <button className={cls} {...(rest as ComponentProps<"button">)}>
      {inner(children, iconLeft, iconRight)}
    </button>
  );
}
