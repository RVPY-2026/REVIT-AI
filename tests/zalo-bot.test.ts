import assert from "node:assert/strict";
import { test } from "node:test";
import { createZaloBotClient, ZaloBotError } from "../src/server/zalo/client";
import { createTestSession } from "../src/server/zalo/test-session";
import { parseZaloWebhookUpdate } from "../src/server/zalo/webhook-payload";
import { createZaloLinkCode, normalizeZaloLinkCode } from "../src/server/zalo/link-code";

function event(text: string, chatType = "PRIVATE", date = 2000) {
  return { event_name: "message.text.received", message: {
    message_id: "message-1", date, text, from: { is_bot: false },
    chat: { id: "fake-chat", chat_type: chatType },
  } };
}

test("test session ignores unrelated, old and group messages and only replies once", () => {
  const accept = createTestSession("/test random", 1000);
  assert.equal(accept(event("hello")), null);
  assert.equal(accept(event("/test random", "GROUP")), null);
  assert.equal(accept(event("/test random", "PRIVATE", 500)), null);
  assert.equal(accept({ ...event("/test random"), message: null }), null);
  assert.equal(accept(event("/test random")), "fake-chat");
  assert.equal(accept(event("/test random")), null);
});

test("client sanitizes transport errors so token cannot escape", async () => {
  const bot = createZaloBotClient("fake-secret", async () => { throw new Error("https://example.com/fake-secret"); });
  await assert.rejects(bot.getMe(), (error: unknown) => {
    assert.ok(error instanceof ZaloBotError);
    assert.equal(error.message.includes("fake-secret"), false);
    return true;
  });
});

test("client treats API rejection as failure even with HTTP 200", async () => {
  const bot = createZaloBotClient("fake-secret", async () => Response.json({ ok: false, error_code: 401 }));
  await assert.rejects(bot.sendText("fake-chat", "test"), ZaloBotError);
});

test("client uses documented sendPhoto payload", async () => {
  let payload: unknown;
  const bot = createZaloBotClient("fake-secret", async (_url, init) => {
    payload = JSON.parse(init?.body as string);
    return Response.json({ ok: true, result: { message_id: "fake-message" } });
  });
  await bot.sendPhoto("fake-chat", "https://example.com/photo.png", "test");
  assert.deepEqual(payload, { chat_id: "fake-chat", photo: "https://example.com/photo.png", caption: "test" });
});

test("webhook parses Zalo's flat message update", () => {
  const update = event("a".repeat(64));
  assert.deepEqual(parseZaloWebhookUpdate(update), {
    event_name: update.event_name,
    message: {
      message_id: update.message.message_id,
      text: update.message.text,
      from: update.message.from,
      chat: update.message.chat,
    },
  });
});

test("webhook also accepts the wrapped API response shape", () => {
  const update = event("a".repeat(64));
  assert.equal(parseZaloWebhookUpdate({ ok: true, result: update })?.event_name, update.event_name);
});

test("Zalo link code keeps the student code and adds a readable one-time suffix", () => {
  const code = createZaloLinkCode("R2610008");
  assert.match(code, /^R2610008-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(normalizeZaloLinkCode("R2610008-7K4M-9Q2P"), "R2610008-7K4M-9Q2P");
  assert.equal(normalizeZaloLinkCode(code.toLowerCase()), code);
  assert.equal(normalizeZaloLinkCode("R2610008-IOUL-9Q2P"), null);
  assert.throws(() => createZaloLinkCode("R261008"), RangeError);
});
