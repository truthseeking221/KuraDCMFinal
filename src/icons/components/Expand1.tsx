import type { IconProps } from "./types";

const templates = {
  "stroke": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M4.66669 4L8.66669 8L4.66669 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M11.3333 4V12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M5.83331 5L10.8333 10L5.83331 15" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14.1667 5V15" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M7 6L13 12L7 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 6V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M8.16669 7L15.1667 14L8.16669 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19.8333 7V21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M9.33331 8L17.3333 16L9.33331 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22.6667 8V24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
};

export const Expand1 = ({ size = 24, variant, ...props }: IconProps) => {
  const availableVariants = Object.keys(templates);
  const selectedVariant = (variant && availableVariants.includes(variant) ? variant : availableVariants[0]) as keyof typeof templates;
  
  const variantTemplates = templates[selectedVariant];
  const availableSizes = Object.keys(variantTemplates).map(Number);
  
  // Find closest size
  const numSize = typeof size === "number" ? size : parseInt(String(size), 10);
  const targetSize = isNaN(numSize) ? 24 : numSize;
  const closestSize = availableSizes.reduce((prev, curr) => 
    Math.abs(curr - targetSize) < Math.abs(prev - targetSize) ? curr : prev
  , availableSizes[0]);
  
  const template = variantTemplates[closestSize as keyof typeof variantTemplates] || Object.values(variantTemplates)[0];
  
  return (
    <svg
      width={size}
      height={size}
      viewBox={template.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {template.children}
    </svg>
  );
};

Expand1.displayName = "Expand1";
