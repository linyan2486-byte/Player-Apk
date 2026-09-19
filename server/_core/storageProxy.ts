import type { Express } from "express";
import { storageGetSignedUrl } from "../storage";
import { telegramConfigured, telegramFileUrl } from "../telegram-storage";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) { res.status(400).send("Missing storage key"); return; }
    try {
      if (key.startsWith("telegram/") && telegramConfigured()) {
        const url = await telegramFileUrl(key.slice("telegram/".length));
        const upstream = await fetch(url);
        if (!upstream.ok || !upstream.body) { res.status(502).send("Telegram storage error"); return; }
        res.set("Cache-Control", "private, max-age=300");
        if (upstream.headers.get("content-type")) res.set("Content-Type", upstream.headers.get("content-type")!);
        if (upstream.headers.get("content-length")) res.set("Content-Length", upstream.headers.get("content-length")!);
        res.status(200);
        const reader = upstream.body.getReader();
        res.on("close", () => void reader.cancel());
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          res.write(Buffer.from(part.value));
        }
        res.end();
        return;
      }
      const url = await storageGetSignedUrl(key);
      res.set("Cache-Control", "private, max-age=300");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage backend error");
    }
  });
}
