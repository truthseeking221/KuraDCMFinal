import type { SVGProps } from "react";

export type MedIconName =
  | "general"
  | "std"
  | "cancer"
  | "hpv"
  | "nipt"
  | "ancestry"
  | "hepatitis"
  | "vitamin"
  | "allergy"
  | "parasite"
  | "diabetes"
  | "lipids"
  | "heart"
  | "liver"
  | "kidney"
  | "thyroid"
  | "reproductive"
  | "ovary"
  | "premarital"
  | "bone"
  | "joint"
  | "food"
  | "gestational"
  | "preeclampsia"
  | "pregnancy"
  | "preg-infection"
  | "fever"
  | "uti"
  | "fitness"
  | "substance"
  | "respiratory"
  | "brain";

/* Simple, recognizable monoline medical glyphs (24-grid, 1.6 stroke). */
const PATHS: Record<MedIconName, React.ReactNode> = {
  general: (
    <>
      <path d="M6 3v5a4 4 0 0 0 8 0V3" />
      <path d="M10 16v1a4 4 0 0 0 8 0v-2" />
      <circle cx="18" cy="13" r="2" />
    </>
  ),
  std: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M9 12v5M6.5 15.5h5" />
      <circle cx="16" cy="16" r="3" />
      <path d="M18 14l3-3M21 11h-3.5M21 11v3.5" />
    </>
  ),
  cancer: (
    <>
      <path d="M9 21c2.5-5 4-8 4-11a2 2 0 1 0-4 0c0 3 1.5 6 4 11" />
      <path d="M15 21c-2.5-5-4-8-4-11a2 2 0 1 1 4 0c0 3-1.5 6-4 11" />
    </>
  ),
  hpv: (
    <>
      <path d="M8 4c0 4 1 6 4 7 3-1 4-3 4-7" />
      <path d="M12 11v6M9 20h6" />
    </>
  ),
  nipt: (
    <>
      <path d="M7 3c0 4 10 6 10 9s-10 5-10 9M17 3c0 4-10 6-10 9" />
      <path d="M8.5 6h7M9.5 9.5h5M9.5 14.5h5M8.5 18h7" />
    </>
  ),
  ancestry: (
    <>
      <path d="M7 3c0 4 10 6 10 9s-10 5-10 9M17 3c0 4-10 6-10 9" />
      <path d="M9 6h6M9 18h6" />
    </>
  ),
  hepatitis: (
    <>
      <path d="M4 7c4-2 8 1 11 0 2-.6 4-1 5 0 .6 5-2 12-9 12-5 0-8-4-8-8 0-2 .4-3 1-4Z" />
      <path d="M9 11c1.2 1.2 3 1.2 4.5 0" />
    </>
  ),
  vitamin: (
    <>
      <rect x="4" y="8" width="16" height="8" rx="4" transform="rotate(-30 12 12)" />
      <path d="M9.5 14.5 14.5 9.5" />
    </>
  ),
  allergy: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
    </>
  ),
  parasite: (
    <>
      <ellipse cx="12" cy="12" rx="5" ry="6.5" />
      <path d="M12 8v8M9.5 10.5h5M9.5 13.5h5M12 5.5V3M12 18.5V21M7 9 4.5 7.5M17 9l2.5-1.5M7 15l-2.5 1.5M17 15l2.5 1.5" />
    </>
  ),
  diabetes: (
    <>
      <path d="M12 3s5 5.5 5 9.5A5 5 0 0 1 7 12.5C7 8.5 12 3 12 3Z" />
      <path d="M10.5 12.5h3v3h-3z" />
    </>
  ),
  lipids: (
    <>
      <path d="M6 3v8a6 6 0 0 0 12 0V3" />
      <path d="M9 12.5s1.5 1 3 1 3-1 3-1" />
      <circle cx="12" cy="9" r="1" />
    </>
  ),
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" />,
  liver: (
    <>
      <path d="M3 8c5-2.5 11-1 16-1 1.5 0 2 1 2 2.5 0 4.5-3.5 8-8 8-5 0-8-3.5-8-7 0-1.4.4-2 -2-2.5Z" />
      <path d="M9 11c1.5 1.3 3.5 1.3 5 0" />
    </>
  ),
  kidney: (
    <>
      <path d="M9 4C5.5 4 4 7 4 11s2 8 5 8c2.5 0 3.5-2.5 3.5-5 0-1.5 1-2.5 2.5-2.5" />
      <path d="M15 8.5c2.2 0 3.5 1.5 3.5 4M12.5 13.5v3.5" />
    </>
  ),
  thyroid: (
    <>
      <path d="M9 4c-1 3-3 4-3 8 0 2.5 1.5 4 3.5 4S12 14 12 12c0 2 .5 4 2.5 4S18 14.5 18 12c0-4-2-5-3-8" />
      <path d="M12 8v5" />
    </>
  ),
  reproductive: (
    <>
      <circle cx="8" cy="9" r="4" />
      <path d="M16 21c-3-3-1-7 1-9 1.4-1.4 1.4-3 0-4.5" />
      <path d="M14 6l3-1M17 5l-1 3" />
    </>
  ),
  ovary: (
    <>
      <path d="M12 4c-3 0-5 2.5-5 6 0 4 2.5 6.5 5 9 2.5-2.5 5-5 5-9 0-3.5-2-6-5-6Z" />
      <circle cx="12" cy="11" r="2.5" />
      <path d="M7 9c-1.5.5-2.5 2-2.5 3.5M17 9c1.5.5 2.5 2 2.5 3.5" />
    </>
  ),
  premarital: (
    <>
      <circle cx="9" cy="13" r="5" />
      <circle cx="15" cy="13" r="5" />
      <path d="M7 6l2 2 2-2M13 6l2 2 2-2" />
    </>
  ),
  bone: (
    <>
      <path d="M7 17a2 2 0 1 1-2-2 2 2 0 1 1 2-2l8 8a2 2 0 1 1 2 2 2 2 0 1 1-2 2Z" />
    </>
  ),
  joint: (
    <>
      <path d="M8 3v5a3 3 0 0 0 3 3" />
      <path d="M16 21v-5a3 3 0 0 0-3-3" />
      <path d="M9 13.5l1.5 1.5M11 12l1.5 1.5" />
    </>
  ),
  food: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M5 5l14 14" />
    </>
  ),
  gestational: (
    <>
      <path d="M10 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
      <path d="M10 9v6c0 2 1.5 3.5 3.5 3.5" />
      <path d="M15 12s2 2.2 2 3.6a2 2 0 0 1-4 0c0-1.4 2-3.6 2-3.6Z" />
    </>
  ),
  preeclampsia: (
    <>
      <path d="M10 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
      <path d="M10 9v6c0 2 1.5 3.5 3.5 3.5" />
      <path d="M12 13h2l1.5-3 2 6 1.5-3H22" />
    </>
  ),
  pregnancy: (
    <>
      <circle cx="11" cy="5" r="2.5" />
      <path d="M11 7.5v4c3 .5 5 2.5 5 5.5h-2c0-2-1.5-3.5-3.5-3.5V21" />
    </>
  ),
  "preg-infection": (
    <>
      <path d="M9 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
      <path d="M9 8v5c0 2 1.5 3.5 3.5 3.5" />
      <circle cx="17" cy="15" r="3" />
      <path d="M17 11v-1.5M17 20.5V19M21 15h-1.5M14.5 15H13" />
    </>
  ),
  fever: (
    <>
      <path d="M12 14V5a2 2 0 0 0-4 0v9a4 4 0 1 0 4 0Z" />
      <path d="M10 14V9" />
      <path d="M15 5h4M15 8h3" />
    </>
  ),
  uti: (
    <>
      <path d="M6 9c0-1 1-2 2.5-2S11 8 12 8s2-1 3.5-1S18 8 18 9c0 4-2.5 9-6 9S6 13 6 9Z" />
      <path d="M12 12v3" />
    </>
  ),
  fitness: (
    <>
      <path d="M6.5 9v6M4 10v4M17.5 9v6M20 10v4M6.5 12h11" />
    </>
  ),
  substance: (
    <>
      <path d="M14 4l6 6M17 7l-9 9-4 1 1-4 9-9" />
      <path d="M5 19l-1 1" />
    </>
  ),
  respiratory: (
    <>
      <path d="M12 3v8" />
      <path d="M12 7c-1 3-4 2-5 5-1 2.5 0 6 2.5 6S12 16 12 13" />
      <path d="M12 7c1 3 4 2 5 5 1 2.5 0 6-2.5 6S12 16 12 13" />
    </>
  ),
  brain: (
    <>
      <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 4 3 3 0 0 0 3 2.5V4Z" />
      <path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 4 3 3 0 0 1-3 2.5V4Z" />
    </>
  ),
};

type Props = SVGProps<SVGSVGElement> & { name: MedIconName; size?: number };

export function MedIcon({ name, size = 28, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
