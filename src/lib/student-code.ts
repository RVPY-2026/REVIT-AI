/** Code periods use the Vietnamese business month, including at UTC boundaries. */
export function studentCodeMonth(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit",
  }).formatToParts(at);
  const year = parts.find((part) => part.type === "year")!.value;
  const month = parts.find((part) => part.type === "month")!.value;
  return `${year.slice(-2)}${month}`;
}

export function formatStudentCode(source: string, month: string, seq: number): string {
  if (!/^[A-Z]$/.test(source) || !/^\d{2}(0[1-9]|1[0-2])$/.test(month)
    || !Number.isInteger(seq) || seq < 1 || seq > 999) {
    throw new RangeError("Invalid source, month, or three-digit sequence");
  }
  return `${source}${month}${String(seq).padStart(3, "0")}`;
}
