import type { ReactNode } from "react";
import { type IconProps } from "./components";

/** Factory for stroke icons on a 24x24 grid, inheriting `currentColor`. */
function make(children: ReactNode, name: string, opts?: { fill?: boolean }) {
  const Icon = ({ size = 16, ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={opts?.fill ? "currentColor" : "none"}
      stroke={opts?.fill ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
  Icon.displayName = name;
  return Icon;
}

// Export all compiled icons
export * from "./components";

// Aliases for compatibility
export { Close as X } from "./components";
export { Delete as Trash } from "./components";
export { More as MoreHorizontal } from "./components";
export { Warning as AlertTriangle } from "./components";
export { Setting as Settings } from "./components";

// Manually defined icons (no compiled equivalent in raw SVGs)
export const AlertCircle = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </>,
  "AlertCircle",
);

export const Sparkles = make(
  <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3zM19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />,
  "Sparkles",
  { fill: true },
);

// `User` now comes from ./components (compiled, stroke + bulk variants) via `export * from "./components"`.

export const Star = make(
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  "Star",
);

export const Users = make(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>,
  "Users",
);

export const Book = make(
  <>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </>,
  "Book",
);

export const Download = make(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>,
  "Download",
);

// Brand Logo Assets
export { KuraLogo } from "./brand/KuraLogo";
export { KuraLogomark } from "./brand/KuraLogomark";

