import type { IconProps } from "./types";

const templates = {
  "bulk": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M14.1667 7.99996C14.1667 8.46023 13.7936 8.83329 13.3333 8.83329H2.66667C2.20643 8.83329 1.83334 8.46023 1.83334 7.99996C1.83334 7.53969 2.20643 7.16663 2.66667 7.16663H13.3333C13.7936 7.16663 14.1667 7.53969 14.1667 7.99996Z" fill="currentColor"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M17.7083 10C17.7083 10.5754 17.242 11.0417 16.6667 11.0417H3.33333C2.75803 11.0417 2.29166 10.5754 2.29166 10C2.29166 9.42471 2.75803 8.95837 3.33333 8.95837H16.6667C17.242 8.95837 17.7083 9.42471 17.7083 10Z" fill="currentColor"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M21.25 12C21.25 12.6904 20.6904 13.25 20 13.25H4C3.30964 13.25 2.75 12.6904 2.75 12C2.75 11.3096 3.30964 10.75 4 10.75H20C20.6904 10.75 21.25 11.3096 21.25 12Z" fill="currentColor"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M24.7917 14C24.7917 14.8054 24.1388 15.4583 23.3333 15.4583H4.66666C3.86124 15.4583 3.20833 14.8054 3.20833 14C3.20833 13.1945 3.86124 12.5416 4.66666 12.5416H23.3333C24.1388 12.5416 24.7917 13.1945 24.7917 14Z" fill="currentColor"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M28.3333 16C28.3333 16.9206 27.5872 17.6667 26.6667 17.6667H5.33334C4.41286 17.6667 3.66667 16.9206 3.66667 16C3.66667 15.0795 4.41286 14.3334 5.33334 14.3334H26.6667C27.5872 14.3334 28.3333 15.0795 28.3333 16Z" fill="currentColor"/>
        </>
      )
    },
  },
  "solid": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M14.1667 7.99996C14.1667 8.46023 13.7936 8.83329 13.3333 8.83329H2.66667C2.20643 8.83329 1.83334 8.46023 1.83334 7.99996C1.83334 7.53969 2.20643 7.16663 2.66667 7.16663H13.3333C13.7936 7.16663 14.1667 7.53969 14.1667 7.99996Z" fill="currentColor"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M17.7083 10C17.7083 10.5754 17.242 11.0417 16.6667 11.0417H3.33333C2.75803 11.0417 2.29166 10.5754 2.29166 10C2.29166 9.42471 2.75803 8.95837 3.33333 8.95837H16.6667C17.242 8.95837 17.7083 9.42471 17.7083 10Z" fill="currentColor"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M21.25 12C21.25 12.6904 20.6904 13.25 20 13.25H4C3.30964 13.25 2.75 12.6904 2.75 12C2.75 11.3096 3.30964 10.75 4 10.75H20C20.6904 10.75 21.25 11.3096 21.25 12Z" fill="currentColor"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M24.7917 14C24.7917 14.8054 24.1388 15.4583 23.3333 15.4583H4.66666C3.86124 15.4583 3.20833 14.8054 3.20833 14C3.20833 13.1945 3.86124 12.5416 4.66666 12.5416H23.3333C24.1388 12.5416 24.7917 13.1945 24.7917 14Z" fill="currentColor"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M28.3333 16C28.3333 16.9206 27.5872 17.6667 26.6667 17.6667H5.33334C4.41286 17.6667 3.66667 16.9206 3.66667 16C3.66667 15.0795 4.41286 14.3334 5.33334 14.3334H26.6667C27.5872 14.3334 28.3333 15.0795 28.3333 16Z" fill="currentColor"/>
        </>
      )
    },
  },
  "stroke": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M13.3333 8H2.66666" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M16.6667 10H3.33334" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M20 12H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M23.3333 14H4.66667" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M26.6667 16H5.33333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
  "twotone 2": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path opacity="0.4" d="M13.3333 8H2.66666" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2.66666 8H8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path opacity="0.4" d="M16.6667 10H3.33334" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.33334 10H10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path opacity="0.4" d="M20 12H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path opacity="0.4" d="M23.3333 14H4.66667" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4.66667 14H14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path opacity="0.4" d="M26.6667 16H5.33333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5.33333 16H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
  "twotone": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path opacity="0.4" d="M13.3333 8H2.66666" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path opacity="0.4" d="M16.6667 10H3.33334" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path opacity="0.4" d="M20 12H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path opacity="0.4" d="M23.3333 14H4.66667" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path opacity="0.4" d="M26.6667 16H5.33333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
};

export const Minus = ({ size = 24, variant, ...props }: IconProps) => {
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

Minus.displayName = "Minus";
