import type { PhoneMatch } from "@/server/phone-matches";

export function hasActivePhoneMatch(matches: PhoneMatch[]): boolean {
  return matches.some(match => "otherSource" in match || !match.archived);
}
