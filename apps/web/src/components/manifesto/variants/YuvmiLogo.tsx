"use client";

import { useId } from "react";

type YuvmiLogoProps = {
  size?: number;
  className?: string;
};

export function YuvmiLogo({ size = 32, className = "" }: YuvmiLogoProps) {
  const gradId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="24" x2="26" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c6bf0" />
          <stop offset="0.45" stopColor="#ffb8a8" />
          <stop offset="1" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
      <path
        d="M8 21.5 C11 14.5 14 11 16 10.5 C18 11 21 14.5 24 21.5"
        stroke={`url(#${gradId})`}
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M10 19 Q16 13.5 22 19"
        stroke={`url(#${gradId})`}
        strokeWidth="1.25"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      <circle cx="8" cy="21.5" r="3.25" fill="#7c6bf0" />
      <circle cx="8" cy="21.5" r="1.35" fill="#f5f2ef" opacity="0.9" />
      <circle cx="24" cy="21.5" r="3.25" fill="#ffb8a8" />
      <circle cx="24" cy="21.5" r="1.35" fill="#f5f2ef" opacity="0.9" />
    </svg>
  );
}
