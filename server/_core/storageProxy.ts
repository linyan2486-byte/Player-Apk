import type { Express } from "express";
import { storageGetSignedUrl } from "../storage";
import { telegramConfigured, telegramFileUrl } from "../telegram-storage";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      if (!key.startsWith("telegram/") || !telegramConfigured()) {
        const url = await storageGetSignedUrl(key);
        res.set("Cache-Control", "private, max-age=300");
        res.redirect(307, url);
        return;
      }

      const url = await telegramFileUrl(key.slice("telegram/".length));
      const range = req.header("range");
      const upstream = await fetch(
        url,
        range ? { headers: { Range: range } } : undefined,
      );
      if (!upstream.ok || !upstream.body) {
        res.status(502).send("Telegram storage error");
        return;
      }

      res.set("Cache-Control", "private, max-age=300");
      res.set(
        "Accept-Ranges",
        upstream.headers.get("accept-ranges") || "bytes",
      );
      for (const header of [
        "content-type",
        "content-length",
        "content-range",
        "etag",
        "last-modified",
      ]) {
        const value = upstream.headers.get(header);
        if (value) res.set(header, value);
      }

      res.status(upstream.status);
      const reader = upstream.body.getReader();
      let closed = false;
      res.on("close", () => {
        closed = true;
        void reader.cancel();
      });

      while (!closed) {
        const part = await reader.read();
        if (part.done) break;
        res.write(Buffer.from(part.value));
      }
      if (!closed) res.end();
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      if (!res.headersSent) res.status(502).send("Storage backend error");
    }
  });
}
