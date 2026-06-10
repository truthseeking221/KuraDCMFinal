import type { IconProps } from "./types";

const templates = {
  "stroke": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M11.6667 9.99998V4.33331H6.00004M11.381 4.61905L4.33337 11.6666" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M14.5834 12.5V5.41669H7.50008M14.2262 5.77385L5.41675 14.5834" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M17.5 15V6.5H9M17.0714 6.9286L6.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M20.4167 17.5V7.58331H10.5M19.9166 8.08335L7.58337 20.4166" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M23.3334 20V8.66669H12.0001M22.7619 9.23815L8.66675 23.3334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
};

export const ArrowUpRight = ({ size = 24, variant, ...props }: IconProps) => {
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

ArrowUpRight.displayName = "ArrowUpRight";
