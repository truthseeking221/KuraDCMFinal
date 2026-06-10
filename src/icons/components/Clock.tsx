import type { IconProps } from "./types";

const templates = {
  "solid": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M15.168 7.99999C15.168 11.9581 11.9593 15.1667 8.00133 15.1667C4.04326 15.1667 0.834633 11.9581 0.834633 7.99999C0.834633 4.04195 4.04326 0.833328 8.00133 0.833328C11.9593 0.833328 15.168 4.04195 15.168 7.99999ZM8.00133 3.33319C7.63313 3.33319 7.33467 3.63167 7.33467 3.99986V7.99986C7.33467 8.23913 7.46287 8.45993 7.6706 8.57866L10.0039 9.91199C10.3236 10.0947 10.7307 9.98359 10.9134 9.66393C11.0961 9.34426 10.9851 8.93713 10.6653 8.75439L8.668 7.61246V3.99986C8.668 3.63167 8.36947 3.33319 8.00133 3.33319Z" fill="currentColor"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M18.96 10C18.96 14.9476 14.9492 18.9583 10.0017 18.9583C5.05408 18.9583 1.0433 14.9476 1.0433 10C1.0433 5.05245 5.05408 1.04167 10.0017 1.04167C14.9492 1.04167 18.96 5.05245 18.96 10ZM10.0017 4.16651C9.54142 4.16651 9.16834 4.53961 9.16834 4.99984V9.99984C9.16834 10.2989 9.32859 10.5749 9.58826 10.7233L12.5049 12.39C12.9045 12.6183 13.4134 12.4795 13.6418 12.0799C13.8701 11.6803 13.7313 11.1714 13.3317 10.943L10.835 9.51559V4.99984C10.835 4.53961 10.4618 4.16651 10.0017 4.16651Z" fill="currentColor"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M22.752 12C22.752 17.9371 17.939 22.75 12.002 22.75C6.06489 22.75 1.25195 17.9371 1.25195 12C1.25195 6.06294 6.06489 1.25 12.002 1.25C17.939 1.25 22.752 6.06294 22.752 12ZM12.002 4.9998C11.4497 4.9998 11.002 5.44752 11.002 5.9998V11.9998C11.002 12.3587 11.1943 12.6899 11.5059 12.868L15.0059 14.868C15.4854 15.142 16.0961 14.9754 16.3701 14.4959C16.6441 14.0164 16.4776 13.4057 15.998 13.1316L13.002 11.4187V5.9998C13.002 5.44752 12.5542 4.9998 12.002 4.9998Z" fill="currentColor"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M26.544 14C26.544 20.9266 20.9288 26.5417 14.0023 26.5417C7.07571 26.5417 1.46062 20.9266 1.46062 14C1.46062 7.07343 7.07571 1.45833 14.0023 1.45833C20.9288 1.45833 26.544 7.07343 26.544 14ZM14.0023 5.8331C13.358 5.8331 12.8357 6.35544 12.8357 6.99976V13.9998C12.8357 14.4185 13.06 14.8049 13.4236 15.0127L17.5069 17.346C18.0663 17.6657 18.7788 17.4713 19.0985 16.9119C19.4181 16.3525 19.2239 15.64 18.6643 15.3202L15.169 13.3218V6.99976C15.169 6.35544 14.6466 5.8331 14.0023 5.8331Z" fill="currentColor"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M30.336 16C30.336 23.9161 23.9187 30.3333 16.0027 30.3333C8.08652 30.3333 1.66927 23.9161 1.66927 16C1.66927 8.08392 8.08652 1.66667 16.0027 1.66667C23.9187 1.66667 30.336 8.08392 30.336 16ZM16.0027 6.66641C15.2663 6.66641 14.6693 7.26336 14.6693 7.99974V15.9997C14.6693 16.4783 14.9257 16.9199 15.3412 17.1573L20.0079 19.824C20.6472 20.1893 21.4615 19.9672 21.8268 19.3279C22.1921 18.6885 21.9701 17.8743 21.3307 17.5088L17.336 15.2249V7.99974C17.336 7.26336 16.7389 6.66641 16.0027 6.66641Z" fill="currentColor"/>
        </>
      )
    },
  },
  "stroke": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 7.99999C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33334 4.3181 1.33334 7.99999C1.33334 11.6819 4.3181 14.6667 8 14.6667Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 3.99985V7.99987L10.3333 9.33321" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39762 1.66667 1.66666 5.39763 1.66666 10C1.66666 14.6024 5.39762 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 4.9998V9.99983L12.9167 11.6665" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 5.99976V11.9998L15.5 13.9998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M14 25.6667C20.4433 25.6667 25.6667 20.4433 25.6667 14C25.6667 7.55667 20.4433 2.33333 14 2.33333C7.55667 2.33333 2.33333 7.55667 2.33333 14C2.33333 20.4433 7.55667 25.6667 14 25.6667Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 6.99973V13.9998L18.0833 16.3331" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M16 29.3333C23.3638 29.3333 29.3333 23.3638 29.3333 16C29.3333 8.63621 23.3638 2.66667 16 2.66667C8.63621 2.66667 2.66667 8.63621 2.66667 16C2.66667 23.3638 8.63621 29.3333 16 29.3333Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 7.99968V15.9997L20.6667 18.6664" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
  "twotone 2": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 7.99999C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33334 4.3181 1.33334 7.99999C1.33334 11.6819 4.3181 14.6667 8 14.6667Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 3.99985V7.99987L10.3333 9.33321" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39762 1.66667 1.66666 5.39763 1.66666 10C1.66666 14.6024 5.39762 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 4.9998V9.99983L12.9167 11.6665" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 5.99976V11.9998L15.5 13.9998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M14 25.6667C20.4433 25.6667 25.6667 20.4433 25.6667 14C25.6667 7.55667 20.4433 2.33333 14 2.33333C7.55667 2.33333 2.33333 7.55667 2.33333 14C2.33333 20.4433 7.55667 25.6667 14 25.6667Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 6.99973V13.9998L18.0833 16.3331" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M16 29.3333C23.3638 29.3333 29.3333 23.3638 29.3333 16C29.3333 8.63621 23.3638 2.66667 16 2.66667C8.63621 2.66667 2.66667 8.63621 2.66667 16C2.66667 23.3638 8.63621 29.3333 16 29.3333Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 7.99968V15.9997L20.6667 18.6664" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
  "twotone": {
    16: {
      viewBox: "0 0 16 16",
      children: (
        <>
          <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33334 8 1.33334C4.3181 1.33334 1.33334 4.3181 1.33334 8C1.33334 11.6819 4.3181 14.6667 8 14.6667Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <path opacity="0.4" d="M8 3.99984V7.99987L10.3333 9.3332" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    20: {
      viewBox: "0 0 20 20",
      children: (
        <>
          <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39762 14.6024 1.66666 10 1.66666C5.39762 1.66666 1.66666 5.39762 1.66666 10C1.66666 14.6024 5.39762 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path opacity="0.4" d="M10 4.9998V9.99983L12.9167 11.6665" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path opacity="0.4" d="M12 5.99976V11.9998L15.5 13.9998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    28: {
      viewBox: "0 0 28 28",
      children: (
        <>
          <path d="M14 25.6667C20.4433 25.6667 25.6667 20.4433 25.6667 14C25.6667 7.55668 20.4433 2.33334 14 2.33334C7.55667 2.33334 2.33333 7.55668 2.33333 14C2.33333 20.4433 7.55667 25.6667 14 25.6667Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <path opacity="0.4" d="M14 6.99972V13.9998L18.0833 16.3331" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
    32: {
      viewBox: "0 0 32 32",
      children: (
        <>
          <path d="M16 29.3333C23.3638 29.3333 29.3333 23.3638 29.3333 16C29.3333 8.6362 23.3638 2.66666 16 2.66666C8.63621 2.66666 2.66667 8.6362 2.66667 16C2.66667 23.3638 8.63621 29.3333 16 29.3333Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path opacity="0.4" d="M16 7.99968V15.9997L20.6667 18.6664" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )
    },
  },
};

export const Clock = ({ size = 24, variant, ...props }: IconProps) => {
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

Clock.displayName = "Clock";
