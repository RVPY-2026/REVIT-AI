export const ARCHIVE_REASONS = ["spam", "duplicate", "test", "other"] as const;
export const DROPPED_REASONS = ["price", "time", "no_contact", "other_course", "not_interested", "other"] as const;
export const CONTACT_CHANNELS = ["call", "zalo", "meeting", "other"] as const;
export const CONTACT_OUTCOMES = ["no_answer", "interested", "thinking", "declined", "other"] as const;
export const ARCHIVE_REASON_LABELS = { spam: "Tin rác", duplicate: "Hồ sơ trùng", test: "Dữ liệu thử", other: "Khác" };
export const DROPPED_REASON_LABELS = { price: "Học phí", time: "Không phù hợp thời gian", no_contact: "Không liên hệ được", other_course: "Chọn khóa học khác", not_interested: "Không có nhu cầu", other: "Khác" };
export const CONTACT_CHANNEL_LABELS = { call: "Gọi điện", zalo: "Zalo", meeting: "Gặp mặt", other: "Khác" };
export const CONTACT_OUTCOME_LABELS = { no_answer: "Chưa trả lời", interested: "Quan tâm", thinking: "Cân nhắc", declined: "Từ chối", other: "Khác" };
