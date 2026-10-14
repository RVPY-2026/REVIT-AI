import "server-only";

import { randomInt } from "node:crypto";

const LINK_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LINK_CODE_PATTERN = /^[A-Z]\d{7}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/** Create a short, human-friendly one-time code while keeping the student ID visible. */
export function createZaloLinkCode(studentCode: string): string {
  if (!/^[A-Z]\d{7}$/.test(studentCode)) throw new RangeError("Invalid student code");
  const suffix = Array.from({ length: 8 }, () => LINK_CODE_ALPHABET[randomInt(LINK_CODE_ALPHABET.length)]).join("");
  return `${studentCode}-${suffix.slice(0, 4)}-${suffix.slice(4)}`;
}

/** Zalo messages may change casing, so hash a canonical uppercase representation. */
export function normalizeZaloLinkCode(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return LINK_CODE_PATTERN.test(normalized) ? normalized : null;
}
