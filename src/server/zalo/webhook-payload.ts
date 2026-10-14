import { z } from "zod";

const messageSchema = z.object({
  message_id: z.string().min(1).max(256),
  from: z.object({ is_bot: z.boolean().optional() }),
  chat: z.object({ id: z.string().min(1).max(256), chat_type: z.string() }),
  text: z.string().max(2000).optional(),
});

const updateSchema = z.object({
  event_name: z.string(),
  message: messageSchema.optional(),
});

// Zalo's webhook sends the update directly. Keep accepting the documented
// API-response wrapper too, so verification clients and older integrations work.
const webhookSchema = z.union([
  updateSchema,
  z.object({ ok: z.literal(true), result: updateSchema }),
]);

export type ZaloWebhookUpdate = z.infer<typeof updateSchema>;

export function parseZaloWebhookUpdate(body: unknown): ZaloWebhookUpdate | null {
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) return null;
  return "result" in parsed.data ? parsed.data.result : parsed.data;
}
