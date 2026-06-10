import type { IconProps } from "./types";

const templates = {
  stroke: {
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path
            d="M18.5 20V17.9704C18.5 16.7281 17.9407 15.5099 16.8103 14.9946C15.4315 14.3661 13.7779 14 12 14C10.2221 14 8.5685 14.3661 7.18968 14.9946C6.05927 15.5099 5.5 16.7281 5.5 17.9704V20"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 11C13.933 11 15.5 9.433 15.5 7.5C15.5 5.567 13.933 4 12 4C10.067 4 8.5 5.567 8.5 7.5C8.5 9.433 10.067 11 12 11Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ),
    },
  },
  bulk: {
    24: {
      viewBox: "0 0 24 24",
      children: (
        <>
          <path
            opacity="0.4"
            d="M7.37859 14.3122C8.86094 13.6364 10.6214 13.25 12.5 13.25C14.3786 13.25 16.1391 13.6364 17.6214 14.3122C19.0996 14.986 19.75 16.5343 19.75 17.9704C19.7501 18.4032 19.7501 18.8744 19.7067 19.1972C19.6589 19.5527 19.5465 19.9284 19.2374 20.2374C18.9284 20.5465 18.5527 20.6589 18.1972 20.7067C17.8744 20.7501 17.4776 20.7501 17.0448 20.75H7.95526C7.52245 20.7501 7.12561 20.7501 6.8028 20.7067C6.44732 20.6589 6.07159 20.5465 5.76257 20.2374C5.45355 19.9284 5.3411 19.5527 5.29331 19.1972C5.24991 18.8744 5.24996 18.4032 5.25001 17.9704C5.25001 16.5343 5.9004 14.986 7.37859 14.3122Z"
            fill="currentColor"
          />
          <path
            d="M8.25 7.5C8.25 5.15279 10.1528 3.25 12.5 3.25C14.8472 3.25 16.75 5.15279 16.75 7.5C16.75 9.84721 14.8472 11.75 12.5 11.75C10.1528 11.75 8.25 9.84721 8.25 7.5Z"
            fill="currentColor"
          />
        </>
      ),
    },
  },
};

export const User = ({ size = 24, variant, ...props }: IconProps) => {
  const availableVariants = Object.keys(templates);
  const selectedVariant = (
    variant && availableVariants.includes(variant) ? variant : availableVariants[0]
  ) as keyof typeof templates;

  const variantTemplates = templates[selectedVariant];
  const availableSizes = Object.keys(variantTemplates).map(Number);
  const numSize = typeof size === "number" ? size : parseInt(String(size), 10);
  const targetSize = isNaN(numSize) ? 24 : numSize;
  const closestSize = availableSizes.reduce(
    (prev, curr) =>
      Math.abs(curr - targetSize) < Math.abs(prev - targetSize) ? curr : prev,
    availableSizes[0],
  );
  const template =
    variantTemplates[closestSize as keyof typeof variantTemplates] ||
    Object.values(variantTemplates)[0];

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

User.displayName = "User";
