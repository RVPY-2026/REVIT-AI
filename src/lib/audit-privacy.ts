/** Sanitize before serialization, including the optional JSON view. */
const secretKey = /secret|token|password|passwd|authorization|credential|api.?key|cookie|chat.?id|link.?hash/i;
const contactKey = /phone|mobile|telephone|contact.?number|so.?dien.?thoai/i;
function maskedPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.length >= 7 ? `${digits.slice(0, 4)} *** ${digits.slice(-3)}` : "[Đã ẩn liên hệ]";
}
export function maskPrivateText(input: string): string {
  return input.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (email) => `${email[0]}***@${email.split("@")[1]}`)
    .replace(/(?<![\w-])\+?\d[\d ().-]{6,18}\d(?![\w-])/g, (candidate) => {
      const digits = candidate.replace(/\D/g, "");
      if (digits.length > 15) return "[Đã ẩn liên hệ]";
      return digits.length >= 9 ? maskedPhone(candidate) : candidate;
    })
    .replace(/\b(?:Bearer\s+\S+|sk-[\w-]+|eyJ[\w.-]+)\b/gi, "[Đã ẩn]")
    .replace(/(?:token|secret|password|api[_-]?key|authorization)["']?\s*[:=]\s*["']?[^\s,}"']+/gi, "[Đã ẩn]")
    .replace(/https?:\/\/\S+/gi, "[Đã ẩn đường dẫn]");
}
export function sanitizeAuditData(value: unknown, depth = 0, field = ""): unknown {
  if (depth > 8) return "[Đã rút gọn]";
  if (contactKey.test(field) && value !== null && value !== undefined) return typeof value === "string" || typeof value === "number" ? maskedPhone(String(value)) : "[Đã ẩn liên hệ]";
  if (typeof value === "string") return maskPrivateText(value).slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => sanitizeAuditData(v, depth + 1));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ([record.field, record.key, record.answerKey].some((key) => typeof key === "string" && secretKey.test(key))) return { field: "[Đã ẩn]" };
    const changedField = typeof record.field === "string" ? record.field : "";
    return Object.fromEntries(Object.entries(value).slice(0, 100)
      .filter(([key]) => !secretKey.test(key)).map(([key, v]) => [maskPrivateText(key), sanitizeAuditData(v, depth + 1,
        ["before", "after", "from", "to"].includes(key) && contactKey.test(changedField) ? changedField : key)]));
  }
  return value;
}
/** Delivery errors may contain arbitrary provider credentials: never expose raw text. */
export function safeZaloError(value: string | null) {
  return value ? "Chưa gửi được tin Zalo. Bạn kiểm tra kết nối rồi thử lại." : null;
}
