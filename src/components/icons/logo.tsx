import type { SVGProps } from "react";

/** RVPY wordmark — four thin geometric letters (FRONTEND_RULES §3.6). Inherits `currentColor`. */
export function Logo({ title = "RVPY", ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 160 50"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="square"
      role="img"
      aria-label={title}
      {...props}
    >
      <path d="M4 47V4h20a11 11 0 0 1 0 22H4M20 26l14 21" />
      <path d="M46 4l14 43L74 4" />
      <path d="M90 47V4h20a11 11 0 0 1 0 22H90" />
      <path d="M124 4l15 21 15-21M139 25v22" />
    </svg>
  );
}
