/** Canonical Vietnamese phone digits shared by signup, CRM matching and search. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return /^84\d{9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
}

/** Mirrors normalizePhone for legacy rows without rewriting their stored phone. */
export const NORMALIZED_PHONE_SQL = "case when regexp_replace(phone, '[^0-9]', '', 'g') ~ '^84[0-9]{9}$' then '0' || substr(regexp_replace(phone, '[^0-9]', '', 'g'), 3) else regexp_replace(phone, '[^0-9]', '', 'g') end";
