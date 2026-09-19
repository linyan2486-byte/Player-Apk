import FormData from "form-data";
import fs from "node:fs";
import { ENV } from "./_core/env";
import * as db from "./db";

function config() {
  if (!ENV.telegramBotToken || !ENV.telegramStorageChatId) throw new Error("Telegram storage is not configured");
  return { base: `https://api.telegram.org/bot${ENV.telegramBotToken}`, token: ENV.telegramBotToken, chatId: ENV.telegramStorageChatId };
}

export async function telegramPut(filePath: string, fileName: string, mimeType: string, caption: string) {
  const { base, chatId } = config();
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("document", fs.createReadStream(filePath), { filename: fileName, contentType: mimeType });
  form.append("caption", caption.slice(0, 1024));
  const response = await fetch(`${base}/sendDocument`, { method: "POST", headers: form.getHeaders(), body: form as any, duplex: "half" } as any);
  const payload = await response.json() as any;
  if (!response.ok || !payload.ok || !payload.result?.document?.file_id) throw new Error(payload.description || "Telegram upload failed");
  return { fileId: payload.result.document.file_id as string, messageId: payload.result.message_id as number, fileSize: Number(payload.result.document.file_size || 0) };
}

export async function telegramFileUrl(fileId: string) {
  const { base, token } = config();
  const response = await fetch(`${base}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const payload = await response.json() as any;
  if (!response.ok || !payload.ok || !payload.result?.file_path) throw new Error(payload.description || "Telegram file lookup failed");
  return `https://api.telegram.org/file/bot${token}/${payload.result.file_path}`;
}

export function telegramConfigured() { return Boolean(ENV.telegramBotToken && ENV.telegramStorageChatId); }

export async function telegramSetWebhook() {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || (domain ? `https://${domain}/api/telegram/webhook` : "https://player-apk-production.up.railway.app/api/telegram/webhook");
  if (!telegramConfigured() || !webhookUrl) return;
  const { base } = config();
  const body: Record<string, unknown> = { url: webhookUrl, allowed_updates: ["channel_post"] };
  if (process.env.TELEGRAM_WEBHOOK_SECRET) body.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;
  await fetch(`${base}/setWebhook`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export async function ingestTelegramChannelPost(post: any) {
  const configuredChat = String(ENV.telegramStorageChatId || "").replace(/^@/, "").toLowerCase();
  const actualChatId = String(post?.chat?.id || "");
  const actualUsername = String(post?.chat?.username || "").toLowerCase();
  if (!telegramConfigured() || (!actualChatId || (configuredChat !== actualChatId && configuredChat !== actualUsername))) return false;
  const media = post.video ?? post.audio ?? post.document;
  if (!media?.file_id) return false;
  const kind = post.video || (post.document?.mime_type || "").startsWith("video/") ? "video" : "audio";
  const fileName = media.file_name || media.title || `${kind}-${post.message_id}`;
  const caption = String(post.caption || "").trim();
  const title = (caption.split("\n")[0] || media.title || fileName.replace(/\.[^/.]+$/, "")).slice(0, 255) || "Untitled";
  const artist = (media.performer || caption.split("\n")[1] || "Mg Flâsh").slice(0, 255);
  const publicId = `tg-${post.chat.id}-${post.message_id}`;
  if (await db.getMediaByPublicId(publicId)) return true;
  await db.createMediaCatalogItem({
    publicId,
    title,
    artist,
    kind,
    storageKey: `telegram/${media.file_id}`,
    storageProvider: "telegram",
    telegramFileId: media.file_id,
    telegramMessageId: post.message_id,
    thumbnailFileId: post.video?.thumbnail?.file_id ?? post.video?.thumb?.file_id ?? null,
    mimeType: media.mime_type || (kind === "video" ? "video/mp4" : "audio/mpeg"),
    fileSize: Number(media.file_size || 0),
    published: 1,
    sortOrder: Number(post.date || post.message_id || 0),
  });
  return true;
}
