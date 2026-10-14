/** Unicode decomposition handles every Vietnamese tone mark; D-stroke needs explicit transliteration. */
export function studentSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
