import type { SVGProps } from "react";

export const KuraLogomark = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="24"
      height="20"
      viewBox="0 0 219 182"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Bottom vertical arm (dark blue) */}
      <path
        d="M108.739 109.317V175.771C108.739 179.104 106.032 181.811 102.698 181.811H78.535C75.201 181.811 72.4941 179.104 72.4941 175.771V109.317H108.739Z"
        fill="#10069F"
      />
      {/* Bottom right diagonal leg (bright blue) */}
      <path
        d="M211.952 181.811H181.229L108.734 109.317H154.043L216.229 171.503C220.032 175.306 217.338 181.807 211.961 181.807H211.947L211.952 181.811Z"
        fill="#268CFF"
      />
      {/* Top right diagonal arm (bright blue) */}
      <path
        d="M216.221 10.3087L154.035 72.4945H108.727L181.235 0H211.958C217.344 0 220.038 6.50551 216.225 10.3087H216.221Z"
        fill="#268CFF"
      />
      {/* Left arm and top arm (light blue/cyan) */}
      <path
        d="M108.739 6.04083V72.4945L72.4945 108.739H6.04083C2.70687 108.739 0 106.033 0 102.699V78.5353C0 75.2013 2.70687 72.4945 6.04083 72.4945H72.4945V6.04083C72.4945 2.70687 75.2013 0 78.5353 0H102.699C106.033 0 108.739 2.70687 108.739 6.04083Z"
        fill="#60CDFF"
      />
    </svg>
  );
};

KuraLogomark.displayName = "KuraLogomark";
