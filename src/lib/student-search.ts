/** Unicode decomposition handles every Vietnamese tone mark; D-stroke needs explicit transliteration. */
export function studentSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

/** Codes and names containing digits must not also search the phone column. */
export function isPhoneSearch(value: string): boolean {
  return /\d/.test(value) && /^[+\d\s().-]+$/.test(value);
}
