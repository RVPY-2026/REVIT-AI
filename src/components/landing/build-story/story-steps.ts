/** Curriculum steps told through the building (client sheet "Lộ trình học Revit BIM toàn diện"). */
export interface StoryStep {
  module: string;
  stage: string;
  title: string;
  emphasis: string;
  points: string[];
  chips?: string[];
}

export const STORY_STEPS: StoryStep[] = [
  {
    module: "Học phần 01",
    stage: "Định vị",
    title: "BIM căn bản",
    emphasis: "và định vị dự án.",
    points: [
      "Bản chất BIM khác gì CAD 2D, các thuật ngữ cốt lõi như LOD, BEP.",
      "Lưu trữ tập trung trên môi trường dữ liệu chung BIM 360 và Local Server.",
      "Định vị Base Point, Survey Point; phối hợp toạ độ cho dự án đơn lẻ và cụm công trình.",
    ],
    chips: ["Lưới trục", "Cao độ", "Toạ độ"],
  },
  {
    module: "Học phần 02 · Structure",
    stage: "Kết cấu",
    title: "Dựng khung kết cấu",
    emphasis: "đúng thứ tự.",
    points: [
      "Dựng móng, cột, dầm, sàn và lõi cứng theo từng tầng.",
      "Bố trí thép 3D, thống kê bê tông và thép tự động.",
      "Join cấu kiện đúng ưu tiên để bóc khối lượng không trùng.",
    ],
    chips: ["Móng", "Cột", "Dầm", "Sàn"],
  },
  {
    module: "Học phần 02 · Architecture",
    stage: "Kiến trúc",
    title: "Hoàn thiện kiến trúc,",
    emphasis: "triển khai bản vẽ.",
    points: [
      "Dựng tường, vách kính, ban công, lam; triển khai bản vẽ 2D/3D.",
      "Bóc tách khối lượng tự động từ mô hình.",
      "Thiết lập Material và thuộc tính để phối hợp diễn hoạ.",
    ],
    chips: ["Tường", "Vách kính", "Lam"],
  },
  {
    module: "Học phần 02 · MEP",
    stage: "MEP",
    title: "Hệ thống MEP",
    emphasis: "trong cùng một mô hình.",
    points: [
      "Điều hoà thông gió (HVAC), điện, cấp thoát nước và PCCC.",
      "Worksharing với Central File và Worksets để cả nhóm cùng làm.",
    ],
    chips: ["HVAC", "Điện", "Cấp thoát nước", "PCCC"],
  },
  {
    module: "Học phần 03",
    stage: "Phối hợp",
    title: "Phối hợp, kiểm tra",
    emphasis: "và kiểm soát.",
    points: [
      "Combine các bộ môn theo giai đoạn Thiết kế cơ sở và Bản vẽ thi công.",
      "Tự động phát hiện va chạm cứng/mềm, chủ trì xử lý xung đột.",
      "Quy trình Review – Publish, quản lý Revision và kiểm tra chất lượng mô hình.",
    ],
    chips: ["Clash Detection", "Revision", "QA/QC"],
  },
  {
    module: "Học phần 04",
    stage: "Bàn giao",
    title: "Xuất, bàn giao",
    emphasis: "và quản lý.",
    points: [
      "Trích xuất, đóng gói và bàn giao dữ liệu BIM/CAD/bản vẽ theo tiêu chuẩn dự án.",
      "Đi từ BIM Modeler lên BIM Coordinator và BIM Manager.",
    ],
    chips: ["RVT", "IFC", "DWG", "PDF", "XLS"],
  },
];

export const MEP_LEGEND = [
  { label: "Ống gió", color: "#4f8cff" },
  { label: "Cấp thoát nước", color: "#2fbf87" },
  { label: "PCCC", color: "#ff4d5e" },
  { label: "Điện", color: "#f5b544" },
] as const;
