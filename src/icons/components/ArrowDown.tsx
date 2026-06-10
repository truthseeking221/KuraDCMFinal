import type { IconProps } from "./types";

const templates = {
  "stroke": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M12 8.66667L8 12.6667L4 8.66667M8 12.3333V3.33334" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M15 10.8333L10 15.8333L5 10.8333M10 15.4167V4.16666" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M18 13L12 19L6 13M12 18.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M21 15.1667L14 22.1667L7 15.1667M14 21.5833V5.83334" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M24 17.3333L16 25.3333L8 17.3333M16 24.6667V6.66666" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
};

export const ArrowDown = ({ size = 24, variant, ...props }: IconProps) => {
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

ArrowDown.displayName = "ArrowDown";
