import { z } from "zod";

const fields = {
  name: z.string().trim().min(1, "Bạn nhập tên nguồn.").max(120, "Tên nguồn tối đa 120 ký tự."),
  ownerUserId: z.uuid("Bạn chọn một người phụ trách trong danh sách.").nullable(),
  active: z.boolean(),
};
export const createAdSourceSchema = z.object({
  ...fields,
  code: z.string().trim().toUpperCase().regex(/^[A-Z]$/, "Bạn nhập một chữ cái từ A đến Z.")
    .refine((code) => code !== "R", "Mã R dành riêng cho RVPY. Bạn chọn mã khác."),
});
export const updateAdSourceSchema = z.object({
  ...fields, id: z.uuid(), expectedName: z.string(), expectedOwnerUserId: z.uuid().nullable(),
  expectedActive: z.boolean(), confirmOwnerChange: z.boolean().default(false),
  expectedLeadCount: z.number().int().nonnegative().optional(),
});
export const adSourceFormSchema = z.object({ ...fields,
  code: z.string().trim().toUpperCase().regex(/^[A-Z]$/, "Bạn nhập một chữ cái từ A đến Z."),
  confirmOwnerChange: z.boolean(),
});
export type AdSourceFormValues = z.infer<typeof adSourceFormSchema>;
export function sourceFormDefaults(source?: AdSource): AdSourceFormValues {
  return { code: source?.code ?? "", name: source?.name ?? "", ownerUserId: source?.ownerUserId ?? null,
    active: source?.active ?? true, confirmOwnerChange: false };
}
export type SourceMonth = { month: string; leads: number; total: number; enrolled: number };
export type AdSource = { id: string; code: string; name: string; ownerUserId: string | null;
  ownerName: string | null; ownerEmail: string | null; active: boolean; monthLeads: number;
  total: number; enrolled: number; conversion: number | null; months: SourceMonth[] };
export type SourceOwner = { id: string; name: string; email: string };
