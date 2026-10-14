import { ImageResponse } from "next/og";

export const alt = "RVPY · Khoá học Revit BIM cho người đã đi làm";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const EYEBROW = "KHOÁ HỌC REVIT BIM · OCEAN STUDIO";
const TITLE_LIGHT = "Dựng cả công trình trong Revit,";
const TITLE_STRONG = "từ móng đến bàn giao.";
const FOOT = "3 buổi học thử miễn phí · Lộ trình 1 kèm 1 · Cộng đồng Zalo";

/**
 * Lexend (the heading font) subset to just the characters drawn here: the default OG font has
 * no Vietnamese diacritics. Falls back to that font if Google Fonts cannot be reached at build.
 */
async function lexend(weight: 300 | 500) {
  const text = encodeURIComponent(EYEBROW + TITLE_LIGHT + TITLE_STRONG + FOOT);
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Lexend:wght@${weight}&text=${text}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return { name: "Lexend", data: await (await fetch(url)).arrayBuffer(), weight } as const;
  } catch {
    return null;
  }
}

// Link preview for Zalo / Facebook shares, in the dark "Magenta Night" palette of the hero.
export default async function OpenGraphImage() {
  const fonts = (await Promise.all([lexend(300), lexend(500)])).filter((f) => f !== null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#ffffff",
          fontFamily: "Lexend",
          background: "linear-gradient(120deg, #160a24 0%, #3b0d36 58%, #7d1048 100%)",
        }}
      >
        <svg width="160" height="50" viewBox="0 0 160 50" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="square">
          <path d="M4 47V4h20a11 11 0 0 1 0 22H4M20 26l14 21" />
          <path d="M46 4l14 43L74 4" />
          <path d="M90 47V4h20a11 11 0 0 1 0 22H90" />
          <path d="M124 4l15 21 15-21M139 25v22" />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 24, letterSpacing: 2, color: "#ff3d84", fontWeight: 500 }}>{EYEBROW}</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 68, lineHeight: 1.12, fontWeight: 300 }}>
            <span>{TITLE_LIGHT}</span>
            <span style={{ fontWeight: 500 }}>{TITLE_STRONG}</span>
          </div>
        </div>

        <div style={{ fontSize: 26, fontWeight: 300, color: "rgba(255,255,255,.8)" }}>{FOOT}</div>
      </div>
    ),
    { ...size, fonts },
  );
}
