import type { Express, Request, Response } from "express";
import multer from "multer";

import * as db from "./db";
import { sdk } from "./_core/sdk";
import { storagePut } from "./storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 512 * 1024 * 1024 },
});

function makePublicId() {
  return `media-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function getTitle(originalName: string, supplied?: string) {
  const value = supplied?.trim() || originalName.replace(/\.[^/.]+$/, "");
  return value.slice(0, 255) || "Untitled";
}

export function registerCatalogRoutes(app: Express) {
  app.get("/api/catalog", async (_req: Request, res: Response) => {
    try {
      const items = await db.listPublishedMedia();
      res.json(items.map((item) => ({ id: item.publicId, title: item.title, artist: item.artist ?? "Mg Flâsh", kind: item.kind, url: `/manus-storage/${item.storageKey}`, mimeType: item.mimeType, size: item.fileSize })));
    } catch (error) {
      console.error("[Catalog] list failed:", error);
      res.status(500).json({ error: "Catalog unavailable" });
    }
  });

  app.post("/api/catalog/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Owner sign-in required" });
        return;
      }
      if (user.role !== "admin") {
        res.status(403).json({ error: "Owner access required" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "A media file is required" });
        return;
      }

      const kind = req.body.kind === "video" ? "video" : "audio";
      const publicId = makePublicId();
      const key = `catalog/${publicId}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const uploaded = await storagePut(key, req.file.buffer, req.file.mimetype || "application/octet-stream");
      const title = getTitle(req.file.originalname, req.body.title);
      const artist = String(req.body.artist || "Mg Flâsh").slice(0, 255);

      await db.createMediaCatalogItem({
        publicId,
        title,
        artist,
        kind,
        storageKey: uploaded.key,
        mimeType: req.file.mimetype || null,
        fileSize: req.file.size,
        published: 1,
        sortOrder: 0,
      });

      res.json({
        success: true,
        item: { id: publicId, title, artist, kind, url: uploaded.url, mimeType: req.file.mimetype, size: req.file.size },
      });
    } catch (error) {
      console.error("[CatalogUpload] failed:", error);
      const message = error instanceof Error ? error.message : "Upload failed";
      res.status(message.includes("Forbidden") || message.includes("Owner") ? 403 : 500).json({ error: message });
    }
  });
}
