/** Reference curriculum only; no student identities or private resource links. */
const topics: [number[], string, number][] = [
  [[1], "Bluebeam Revu PDF", 1],
  [[2], "CAD trong Revit", 1],
  [[3], "Dựng hình Model Project", 2],
  [[4, 5], "Family Revit", 5],
  [[6], "Material và Render Enscape", 2],
  [[7, 8], "Massing Revit", 4],
  [[9], "Chuyên đề Nhôm Kính", 2],
  [[10], "Chuyên đề Beam System", 2],
  [[11], "Chuyên đề Stair", 2],
  [[12], "Series Hồ Sơ", 3],
  [[13], "View Template", 3],
  [[14], "Schedule", 3],
  [[15], "3D Section và Xung đột", 2],
  [[16], "Chuyên đề nâng cao: Cài đặt ban đầu", 2],
  [[17], "Chuyên đề nâng cao: Khởi tạo dự án", 2],
  [[18], "Chuyên đề nâng cao: Dựng hình Project", 2],
  [[19], "Chuyên đề nâng cao: Dựng hình Family", 2],
  [[20], "Chuyên đề làm việc nhóm và phối hợp các bộ môn", 2],
  [[21], "Chuyên đề quản lý dự án", 2],
  [[22], "Chuyên đề quản lý thể hiện hồ sơ", 2],
  [[23], "Chi tiết các lệnh Revit và xây dựng template cá nhân", 2],
  [[24, 25], "Tổng kết", 2],
];

export const FOUNDATION_LESSONS = topics.map(([lessonNumbers, title, baseDays], index) => ({
  phase: "foundation" as const, lessonNumbers, title, baseDays, sortOrder: index + 1,
  trialOrder: lessonNumbers.length === 1 ? ({ 2: 1, 13: 2, 14: 3 } as Record<number, number>)[lessonNumbers[0]] ?? null : null,
}));
