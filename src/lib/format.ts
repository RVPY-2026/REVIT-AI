import { format } from "date-fns";
import { vi } from "date-fns/locale";

// Display formats from FRONTEND_RULES §6. Data is stored raw (BACKEND_RULES §3).

const vnd = new Intl.NumberFormat("vi-VN");

/** 3600000 → "3.600.000đ" */
export function formatVnd(amount: number): string {
  return `${vnd.format(amount)}đ`;
}

/** → "09/10/2026" */
export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy", { locale: vi });
}

/** → "09/10/2026 20:00" */
export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: vi });
}

/** "0901234567" → "0901 234 567" */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : phone;
}
