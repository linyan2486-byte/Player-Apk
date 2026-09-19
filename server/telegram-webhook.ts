import type { Express, Request, Response } from "express";
import { ingestTelegramChannelPost, telegramWebhookInfo } from "./telegram-storage";

export function registerTelegramWebhook(app: Express) {
  app.get("/api/telegram/status", async (_req: Request, res: Response) => {
    try { res.json(await telegramWebhookInfo()); }
    catch (error) { res.status(502).json({ configured: true, error: error instanceof Error ? error.message : "Telegram status unavailable" }); }
  });

  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expected && req.header("x-telegram-bot-api-secret-token") !== expected) { res.status(401).json({ error: "Invalid webhook secret" }); return; }
    try {
      await ingestTelegramChannelPost(req.body?.channel_post);
      res.json({ ok: true });
    } catch (error) {
      console.error("[TelegramWebhook] ingestion failed:", error);
      res.status(500).json({ ok: false });
    }
  });
}
