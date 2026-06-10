import type { SVGProps } from "react";

export type IconStyle = "bulk" | "bulk 2" | "duotone" | "solid" | "stroke" | "stroke 2" | "twotone" | "twotone 2";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number | string;
  variant?: IconStyle;
}
