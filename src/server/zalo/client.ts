import "server-only";

// Never include the request URL in errors: Zalo puts the credential in its path.
export class ZaloBotError extends Error {
  constructor(public readonly code: number | null = null) {
    super("Zalo Bot request failed");
  }
}

export function createZaloBotClient(token: string, request: typeof fetch = fetch) {
  if (!token.trim()) throw new Error("ZALO_BOT_TOKEN is missing");

  async function call(method: string, payload: Record<string, unknown> = {}): Promise<unknown> {
    try {
      const response = await request(`https://bot-api.zaloplatforms.com/bot${token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(method === "getUpdates" ? 40_000 : 15_000),
      });
      const body = await response.json();
      if (!response.ok || body.ok !== true) {
        throw new ZaloBotError(typeof body.error_code === "number" ? body.error_code : null);
      }
      return body.result;
    } catch (error) {
      if (error instanceof ZaloBotError) throw error;
      throw new ZaloBotError();
    }
  }

  return {
    getMe: () => call("getMe"),
    getWebhookInfo: () => call("getWebhookInfo"),
    getUpdates: () => call("getUpdates", { timeout: 30 }),
    setWebhook: (url: string, secret: string) => call("setWebhook", { url, secret_token: secret }),
    sendText: (chatId: string, text: string) => {
      if (!text || text.length > 2000) throw new Error("Invalid bot text length");
      return call("sendMessage", { chat_id: chatId, text });
    },
    sendPhoto: (chatId: string, photo: string, caption?: string) => {
      if (new URL(photo).protocol !== "https:") throw new Error("Photo must use HTTPS");
      return call("sendPhoto", { chat_id: chatId, photo, ...(caption ? { caption } : {}) });
    },
  };
}
