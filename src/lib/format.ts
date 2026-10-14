// Display formats from FRONTEND_RULES §6. Data is stored raw (BACKEND_RULES §3).

const vnd = new Intl.NumberFormat("vi-VN");
const businessDate = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
});
const businessDateTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function businessParts(value: Date | string, formatter: Intl.DateTimeFormat) {
  // A date-only business value represents midnight in Vietnam, not a UTC instant.
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  const parts = formatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("day")}/${part("month")}/${part("year")}`, time: `${part("hour")}:${part("minute")}` };
}

/** 3600000 → "3.600.000đ" */
export function formatVnd(amount: number): string {
  return `${vnd.format(amount)}đ`;
}

/** → "09/10/2026" */
export function formatDate(date: Date | string): string {
  return businessParts(date, businessDate).date;
}

/** → "09/10/2026 20:00" */
export function formatDateTime(date: Date | string): string {
  const parts = businessParts(date, businessDateTime);
  return `${parts.date} ${parts.time}`;
}

/** "0901234567" → "0901 234 567" */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : phone;
}
