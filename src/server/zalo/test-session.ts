import "server-only";
import { z } from "zod";

const eventSchema = z.object({
  event_name: z.literal("message.text.received"),
  message: z.object({
    message_id: z.string().min(1).max(256),
    date: z.number(),
    from: z.object({ is_bot: z.boolean() }),
    chat: z.object({ id: z.string().min(1).max(256), chat_type: z.literal("PRIVATE") }),
    text: z.string().max(2000),
  }),
});

// This test session never looks up or changes student records.
// Only a private message with this run's random command can trigger a reply.
export function createTestSession(command: string, startedAt: number) {
  const seen = new Set<string>();
  let claimed = false;
  return (input: unknown) => {
    const parsed = eventSchema.safeParse(input);
    if (!parsed.success || claimed) return null;
    const message = parsed.data.message;
    if (message.from.is_bot || message.date < startedAt || message.text.trim() !== command) return null;
    if (seen.has(message.message_id)) return null;
    seen.add(message.message_id);
    claimed = true;
    return message.chat.id;
  };
}
