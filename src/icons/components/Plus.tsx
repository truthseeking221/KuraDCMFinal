import type { IconProps } from "./types";

const templates = {
  "bulk": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M8.00008 1.83337C8.46035 1.83337 8.83341 2.20647 8.83341 2.66671V13.3334C8.83341 13.7936 8.46035 14.1667 8.00008 14.1667C7.53981 14.1667 7.16675 13.7936 7.16675 13.3334V2.66671C7.16675 2.20647 7.53981 1.83337 8.00008 1.83337Z" fill="currentColor"/>
          <path opacity="0.4" d="M2.66659 7.16663H13.3333C13.7935 7.16663 14.1666 7.53969 14.1666 7.99996C14.1666 8.46023 13.7935 8.83329 13.3333 8.83329H2.66659C2.20635 8.83329 1.83325 8.46023 1.83325 7.99996C1.83325 7.53969 2.20635 7.16663 2.66659 7.16663Z" fill="currentColor"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M9.99992 2.29163C10.5753 2.29163 11.0416 2.75799 11.0416 3.33329V16.6666C11.0416 17.242 10.5753 17.7083 9.99992 17.7083C9.42459 17.7083 8.95825 17.242 8.95825 16.6666V3.33329C8.95825 2.75799 9.42459 2.29163 9.99992 2.29163Z" fill="currentColor"/>
          <path opacity="0.4" d="M3.33341 8.95837H16.6667C17.2421 8.95837 17.7084 9.42471 17.7084 10C17.7084 10.5754 17.2421 11.0417 16.6667 11.0417H3.33341C2.75811 11.0417 2.29175 10.5754 2.29175 10C2.29175 9.42471 2.75811 8.95837 3.33341 8.95837Z" fill="currentColor"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M12 2.75C12.6904 2.75 13.25 3.30964 13.25 4V20C13.25 20.6904 12.6904 21.25 12 21.25C11.3096 21.25 10.75 20.6904 10.75 20V4C10.75 3.30964 11.3096 2.75 12 2.75Z" fill="currentColor"/>
          <path opacity="0.4" d="M4 10.75H20C20.6904 10.75 21.25 11.3096 21.25 12C21.25 12.6904 20.6904 13.25 20 13.25H4C3.30964 13.25 2.75 12.6904 2.75 12C2.75 11.3096 3.30964 10.75 4 10.75Z" fill="currentColor"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M14.0001 3.20837C14.8055 3.20837 15.4584 3.86129 15.4584 4.66671V23.3334C15.4584 24.1388 14.8055 24.7917 14.0001 24.7917C13.1946 24.7917 12.5417 24.1388 12.5417 23.3334V4.66671C12.5417 3.86129 13.1946 3.20837 14.0001 3.20837Z" fill="currentColor"/>
          <path opacity="0.4" d="M4.66659 12.5416H23.3333C24.1387 12.5416 24.7916 13.1945 24.7916 14C24.7916 14.8054 24.1387 15.4583 23.3333 15.4583H4.66659C3.86117 15.4583 3.20825 14.8054 3.20825 14C3.20825 13.1945 3.86117 12.5416 4.66659 12.5416Z" fill="currentColor"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M15.9999 3.66663C16.9205 3.66663 17.6666 4.41281 17.6666 5.33329V26.6666C17.6666 27.5872 16.9205 28.3333 15.9999 28.3333C15.0794 28.3333 14.3333 27.5872 14.3333 26.6666V5.33329C14.3333 4.41281 15.0794 3.66663 15.9999 3.66663Z" fill="currentColor"/>
          <path opacity="0.4" d="M5.33341 14.3334H26.6667C27.5873 14.3334 28.3334 15.0795 28.3334 16C28.3334 16.9206 27.5873 17.6667 26.6667 17.6667H5.33341C4.41293 17.6667 3.66675 16.9206 3.66675 16C3.66675 15.0795 4.41293 14.3334 5.33341 14.3334Z" fill="currentColor"/>
        </>
      )
    },
  },
  "duotone": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path opacity="0.4" d="M8.00008 2.66663V13.3333M13.3334 7.99996H2.66675" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path opacity="0.4" d="M9.99992 3.33337V16.6667M16.6666 10H3.33325" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path opacity="0.4" d="M12 4V20M20 12H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path opacity="0.4" d="M14.0001 4.66663V23.3333M23.3334 14H4.66675" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path opacity="0.4" d="M15.9999 5.33337V26.6667M26.6666 16H5.33325" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
  "solid": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M7.99992 1.83337C8.46019 1.83337 8.83325 2.20647 8.83325 2.66671V7.16671H13.3333C13.7935 7.16671 14.1666 7.53977 14.1666 8.00004C14.1666 8.46031 13.7935 8.83337 13.3333 8.83337H8.83325V13.3334C8.83325 13.7936 8.46019 14.1667 7.99992 14.1667C7.53965 14.1667 7.16658 13.7936 7.16658 13.3334V8.83337H2.66659C2.20635 8.83337 1.83325 8.46031 1.83325 8.00004C1.83325 7.53977 2.20635 7.16671 2.66659 7.16671H7.16658V2.66671C7.16658 2.20647 7.53965 1.83337 7.99992 1.83337Z" fill="currentColor"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M10.0001 2.29163C10.5754 2.29163 11.0417 2.75799 11.0417 3.33329V8.95829H16.6667C17.2421 8.95829 17.7084 9.42463 17.7084 9.99996C17.7084 10.5753 17.2421 11.0416 16.6667 11.0416H11.0417V16.6666C11.0417 17.242 10.5754 17.7083 10.0001 17.7083C9.42475 17.7083 8.95842 17.242 8.95842 16.6666V11.0416H3.33341C2.75811 11.0416 2.29175 10.5753 2.29175 9.99996C2.29175 9.42463 2.75811 8.95829 3.33341 8.95829H8.95842V3.33329C8.95842 2.75799 9.42475 2.29163 10.0001 2.29163Z" fill="currentColor"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2.75C12.6904 2.75 13.25 3.30964 13.25 4V10.75H20C20.6904 10.75 21.25 11.3096 21.25 12C21.25 12.6904 20.6904 13.25 20 13.25H13.25V20C13.25 20.6904 12.6904 21.25 12 21.25C11.3096 21.25 10.75 20.6904 10.75 20V13.25H4C3.30964 13.25 2.75 12.6904 2.75 12C2.75 11.3096 3.30964 10.75 4 10.75H10.75V4C10.75 3.30964 11.3096 2.75 12 2.75Z" fill="currentColor"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M13.9999 3.20837C14.8054 3.20837 15.4583 3.86129 15.4583 4.66671V12.5417H23.3333C24.1387 12.5417 24.7916 13.1946 24.7916 14C24.7916 14.8055 24.1387 15.4584 23.3333 15.4584H15.4583V23.3334C15.4583 24.1388 14.8054 24.7917 13.9999 24.7917C13.1945 24.7917 12.5416 24.1388 12.5416 23.3334V15.4584H4.66659C3.86117 15.4584 3.20825 14.8055 3.20825 14C3.20825 13.1946 3.86117 12.5417 4.66659 12.5417H12.5416V4.66671C12.5416 3.86129 13.1945 3.20837 13.9999 3.20837Z" fill="currentColor"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path fillRule="evenodd" clipRule="evenodd" d="M16.0001 3.66663C16.9206 3.66663 17.6667 4.41281 17.6667 5.33329V14.3333H26.6667C27.5873 14.3333 28.3334 15.0794 28.3334 16C28.3334 16.9205 27.5873 17.6666 26.6667 17.6666H17.6667V26.6666C17.6667 27.5872 16.9206 28.3333 16.0001 28.3333C15.0795 28.3333 14.3334 27.5872 14.3334 26.6666V17.6666H5.33341C4.41293 17.6666 3.66675 16.9205 3.66675 16C3.66675 15.0794 4.41293 14.3333 5.33341 14.3333H14.3334V5.33329C14.3334 4.41281 15.0795 3.66663 16.0001 3.66663Z" fill="currentColor"/>
        </>
      )
    },
  },
  "stroke": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M8.00008 2.66663V13.3333M13.3334 7.99996H2.66675" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M9.99992 3.33337V16.6667M16.6666 10H3.33325" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M12 4V20M20 12H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M14.0001 4.66663V23.3333M23.3334 14H4.66675" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M15.9999 5.33337V26.6667M26.6666 16H5.33325" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
  "twotone": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path opacity="0.4" d="M13.3334 8H2.66675" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 2.66663V13.3333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path opacity="0.4" d="M16.6666 10H3.33325" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 3.33337V16.6667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path opacity="0.4" d="M20 12H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 4V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path opacity="0.4" d="M23.3334 14H4.66675" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 4.66663V23.3333" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path opacity="0.4" d="M26.6666 16H5.33325" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 5.33337V26.6667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
};

export const Plus = ({ size = 24, variant, ...props }: IconProps) => {
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

Plus.displayName = "Plus";
