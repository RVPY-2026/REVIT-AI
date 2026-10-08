import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// 180×180 home-screen icon generated from the logo (FRONTEND_RULES §3.6).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(120deg, #160a24 0%, #3b0d36 58%, #7d1048 100%)",
        }}
      >
        <svg width="132" height="42" viewBox="0 0 160 50" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="square">
          <path d="M4 47V4h20a11 11 0 0 1 0 22H4M20 26l14 21" />
          <path d="M46 4l14 43L74 4" />
          <path d="M90 47V4h20a11 11 0 0 1 0 22H90" />
          <path d="M124 4l15 21 15-21M139 25v22" />
        </svg>
      </div>
    ),
    size,
  );
}
