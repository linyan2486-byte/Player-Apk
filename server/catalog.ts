import type { Express, Request, Response } from "express";
import multer from "multer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as db from "./db";
import { isStandaloneAdmin } from "./standalone-auth";
import { storagePut } from "./storage";
import { telegramConfigured, telegramPut } from "./telegram-storage";

const uploadLimitBytes = Number(process.env.MAX_UPLOAD_BYTES || (process.env.TELEGRAM_BOT_TOKEN ? 2 * 1024 * 1024 * 1024 : 5 * 1024 * 1024 * 1024));
const uploadTempDir = path.join(os.tmpdir(), "mg-flash-uploads");
fs.mkdirSync(uploadTempDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadTempDir),
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")}`),
  }),
  limits: { fileSize: uploadLimitBytes },
});

function uploadMedia(req: Request, res: Response, next: () => void) {
  upload.single("file")(req, res, (error: any) => {
    if (error?.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: `File is too large. Maximum configured size is ${Math.floor(uploadLimitBytes / 1024 / 1024 / 1024)} GB.` });
      return;
    }
    if (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Upload could not be read" });
      return;
    }
    next();
  });
}

function makePublicId() {
  return `media-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function getTitle(originalName: string, supplied?: string) {
  const value = supplied?.trim() || originalName.replace(/\.[^/.]+$/, "");
  return value.slice(0, 255) || "Untitled";
}

export function registerCatalogRoutes(app: Express) {
  async function requireAdmin(req: Request, res: Response) {
    if (!isStandaloneAdmin(req)) { res.status(401).json({ error: "Admin sign-in required" }); return null; }
    return true;
  }

  app.get("/api/catalog", async (_req: Request, res: Response) => {
    try {
      const items = await db.listPublishedMedia();
      res.json(items.map((item) => ({ id: item.publicId, title: item.title, artist: item.artist ?? "Mg Flâsh", kind: item.kind, url: `/manus-storage/${item.storageKey}`, mimeType: item.mimeType, size: item.fileSize })));
    } catch (error) {
      console.error("[Catalog] list failed:", error);
      res.status(500).json({ error: "Catalog unavailable" });
    }
  });

  app.get("/api/catalog/upload-limit", (_req: Request, res: Response) => {
    res.json({ maxBytes: uploadLimitBytes, maxGigabytes: uploadLimitBytes / (1024 ** 3), mode: "disk-stream" });
  });

  app.get("/api/catalog/admin", async (req: Request, res: Response) => {
    if (!await requireAdmin(req, res)) return;
    try {
      res.json(await db.listAllMedia());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Catalog unavailable" });
    }
  });

  app.patch("/api/catalog/:id", async (req: Request, res: Response) => {
    if (!await requireAdmin(req, res)) return;
    try {
      const allowed = {
        title: typeof req.body.title === "string" ? req.body.title.trim().slice(0, 255) : undefined,
        artist: typeof req.body.artist === "string" ? req.body.artist.trim().slice(0, 255) : undefined,
        published: typeof req.body.published === "boolean" ? (req.body.published ? 1 : 0) : undefined,
        sortOrder: Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : undefined,
      };
      const update = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
      await db.updateMediaCatalogItem(req.params.id, update);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Update failed" });
    }
  });

  app.delete("/api/catalog/:id", async (req: Request, res: Response) => {
    if (!await requireAdmin(req, res)) return;
    try {
      await db.deleteMediaCatalogItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Delete failed" });
    }
  });

  app.post("/api/catalog/upload", uploadMedia, async (req: Request, res: Response) => {
    try {
      if (!isStandaloneAdmin(req)) { res.status(401).json({ error: "Admin sign-in required" }); return; }

      if (!req.file) {
        res.status(400).json({ error: "A media file is required" });
        return;
      }

      try {
        const kind = req.body.kind === "video" ? "video" : "audio";
        const publicId = makePublicId();
        const key = `catalog/${publicId}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const telegram = telegramConfigured()
          ? await telegramPut(req.file.path, req.file.originalname, req.file.mimetype || "application/octet-stream", `${req.body.title || req.file.originalname} | ${req.body.artist || "Mg Flâsh"}`)
          : null;
        const uploaded = telegram ? { key: `telegram/${telegram.fileId}`, url: `/manus-storage/telegram/${telegram.fileId}` } : await storagePut(key, fs.createReadStream(req.file.path), req.file.mimetype || "application/octet-stream", req.file.size);
        const title = getTitle(req.file.originalname, req.body.title);
        const artist = String(req.body.artist || "Mg Flâsh").slice(0, 255);

        await db.createMediaCatalogItem({
          publicId,
          title,
          artist,
          kind,
          storageKey: uploaded.key,
          storageProvider: telegram ? "telegram" : "forge",
          telegramFileId: telegram?.fileId ?? null,
          telegramMessageId: telegram?.messageId ?? null,
          mimeType: req.file.mimetype || null,
          fileSize: req.file.size,
          published: 1,
          sortOrder: 0,
        });

        res.json({
          success: true,
          item: { id: publicId, title, artist, kind, url: uploaded.url, mimeType: req.file.mimetype, size: req.file.size },
        });
      } finally {
        await fs.promises.rm(req.file.path, { force: true }).catch(() => undefined);
      }
    } catch (error) {
      console.error("[CatalogUpload] failed:", error);
      const message = error instanceof Error ? error.message : "Upload failed";
      res.status(message.includes("Forbidden") || message.includes("Owner") ? 403 : 500).json({ error: message });
    }
  });
}
