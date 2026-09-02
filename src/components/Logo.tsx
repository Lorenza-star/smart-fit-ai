import * as React from "react";

/** Minimal word‑mark logo – emerald on warm background, rounded shape. */
export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="50" cy="50" r="48" fill="#0E9488" stroke="#0E9488" strokeWidth="4" />
    <path
      d="M30 55 L45 40 L55 55 L70 40"
      stroke="white"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M30 70 L45 55 L55 70 L70 55" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
