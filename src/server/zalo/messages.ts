import "server-only";
import { serverEnv } from "@/server/env";

export const ZALO_ONBOARDING_MESSAGES: { kind: "text" | "photo"; body: string }[] = [
  { kind: "text", body: "🚀 Cùng tham gia Nhóm Zalo Cộng đồng RVPY để cập nhật tài liệu và thư viện Revit, kết nối việc làm, trao đổi khi học và nhận tin chuyên đề/sự kiện.\n👉 Tham gia: https://zalo.me/g/zojesfhkvohvxp84kwl7" },
  ...(serverEnv.ZALO_BOT_COMMUNITY_IMAGE_URL ? [{ kind: "photo" as const, body: serverEnv.ZALO_BOT_COMMUNITY_IMAGE_URL }] : []),
  { kind: "text", body: "📚 Nhóm RVPY Ocean Studio - Gen 1 - Nộp bài:\nhttps://zalo.me/g/3l9dhtuf9gmb7vk6bpc0" },
  { kind: "text", body: "Em tham gia đủ 2 cộng đồng RVPY vừa gửi nhé. Khi nào ngồi máy tính, nhắn anh để hỗ trợ cài phần mềm và tư vấn chi tiết." },
  { kind: "text", body: "💡 Ưu đãi học phí trong 09 ngày trải nghiệm:\n• Còn 3.600.000đ khi giới thiệu 5 thành viên mới tham gia đủ 3 buổi trải nghiệm.\n• Còn 2.700.000đ khi 1 trong 5 bạn đăng ký chính thức.\n• Khi thêm 2 bạn tiếp theo đăng ký chính thức, RVPY hoàn lại 2.700.000đ." },
  ...(serverEnv.ZALO_BOT_OFFER_IMAGE_URL ? [{ kind: "photo" as const, body: serverEnv.ZALO_BOT_OFFER_IMAGE_URL }] : []),
  ...(serverEnv.ZALO_BOT_REFERRAL_IMAGE_URL ? [{ kind: "photo" as const, body: serverEnv.ZALO_BOT_REFERRAL_IMAGE_URL }] : []),
  { kind: "text", body: "HỌC VIÊN VUI LÒNG XEM QUA VÀ CHUẨN BỊ TRƯỚC\n1. Giới thiệu: https://drive.google.com/file/d/1SXArDC1kw5VhbDI1aDnu26Wi51Vgcl0R/view?usp=sharing\n2. Nội dung học: https://docs.google.com/spreadsheets/d/1scNc7USiOovCsFVguabgcCEiM0q1lsR2/edit?pli=1&gid=919736266#gid=919736266\n3. Phần mềm: https://drive.google.com/open?id=1dVkVXmTaQkTJNPNc-PRqRjoIeenoy_eO&usp=drive_fs" },
  ...(serverEnv.ZALO_BOT_PREP_IMAGE_URL ? [{ kind: "photo" as const, body: serverEnv.ZALO_BOT_PREP_IMAGE_URL }] : []),
  { kind: "text", body: "👉 Em tải phần mềm về máy tính, xem qua mục 1 và 2. Khi nào ngồi máy tính thì nhắn anh; anh sẽ online cài đặt và trao đổi chi tiết khóa học nhé." },
] as const;
