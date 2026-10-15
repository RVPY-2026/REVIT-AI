export const VIEW_LIMIT = 25 * 1024 * 1024;
export const DOWNLOAD_LIMIT = 100 * 1024 * 1024;
export const LEARNING_PRIMARY_BACKGROUND = "var(--primary-deep)";
export const LEARNING_STATUS_FOREGROUND = "var(--foreground)";
const types: Record<string, readonly string[]> = {
  pdf: ["application/pdf"], png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], webp: ["image/webp"],
  exe: ["application/vnd.microsoft.portable-executable", "application/x-msdownload", "application/octet-stream"],
  msi: ["application/x-msi", "application/x-msdownload", "application/octet-stream"],
  zip: ["application/zip", "application/x-zip-compressed"],
  rvt: ["application/octet-stream"], rfa: ["application/octet-stream"],
};
export function validateUpload(file: { filename: string; contentType: string; size: number; mode: "view" | "download" }): string | null {
  const extension = file.filename.split(".").pop()?.toLowerCase() ?? "";
  if (!types[extension]?.includes(file.contentType)) return "Loại tệp chưa được hỗ trợ. Bạn chọn đúng định dạng nhé.";
  if (file.mode === "view" && !["pdf", "png", "jpg", "jpeg", "webp"].includes(extension)) return "Tệp này chỉ được dùng với Cho tải.";
  const limit = file.mode === "view" ? VIEW_LIMIT : DOWNLOAD_LIMIT;
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > limit) return `Bạn chọn tệp lớn hơn 0 và không quá ${limit / 1024 / 1024} MB.`;
  return null;
}
export function normalizeYoutube(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1);
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split("/")[2];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}
export const AUDIENCE_LABELS = { trial: "Học thử", formal: "Chính thức", all: "Tất cả" };
export const PHASE_LABELS = { foundation: "Nền tảng", specialist: "Chuyên đề" };
