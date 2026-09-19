import FormData from "form-data";
import fs from "node:fs";

import { parseMediaMetadata } from "../shared/media-metadata";
import { ENV } from "./_core/env";
import * as db from "./db";

function config() {
  if (!ENV.telegramBotToken || !ENV.telegramStorageChatId)
    throw new Error("Telegram storage is not configured");
  const apiBase = ENV.telegramApiBaseUrl.replace(/\/+$/, "");
  return {
    base: `${apiBase}/bot${ENV.telegramBotToken}`,
    fileBase: `${apiBase}/file/bot${ENV.telegramBotToken}`,
    chatId: ENV.telegramStorageChatId,
  };
}

export async function telegramPut(
  filePath: string,
  fileName: string,
  mimeType: string,
  caption: string,
) {
  const { base, chatId } = config();
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("document", fs.createReadStream(filePath), {
    filename: fileName,
    contentType: mimeType,
  });
  form.append("caption", caption.slice(0, 1024));
  const response = await fetch(`${base}/sendDocument`, {
    method: "POST",
    headers: form.getHeaders(),
    body: form as any,
    duplex: "half",
  } as any);
  const payload = (await response.json()) as any;
  if (!response.ok || !payload.ok || !payload.result?.document?.file_id)
    throw new Error(payload.description || "Telegram upload failed");
  return {
    fileId: payload.result.document.file_id as string,
    messageId: payload.result.message_id as number,
    fileSize: Number(payload.result.document.file_size || 0),
  };
}

export async function telegramFileUrl(fileId: string) {
  const { base, fileBase } = config();
  const response = await fetch(
    `${base}/getFile?file_id=${encodeURIComponent(fileId)}`,
  );
  const payload = (await response.json()) as any;
  if (!response.ok || !payload.ok || !payload.result?.file_path)
    throw new Error(payload.description || "Telegram file lookup failed");
  return `${fileBase}/${payload.result.file_path}`;
}

export function telegramConfigured() {
  return Boolean(ENV.telegramBotToken && ENV.telegramStorageChatId);
}

export async function telegramSetWebhook() {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
  const webhookUrl =
    process.env.TELEGRAM_WEBHOOK_URL ||
    (domain
      ? `https://${domain}/api/telegram/webhook`
      : "https://player-apk-production.up.railway.app/api/telegram/webhook");
  if (!telegramConfigured() || !webhookUrl) return;
  const { base } = config();
  const body: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: ["channel_post", "edited_channel_post", "message"],
  };
  if (process.env.TELEGRAM_WEBHOOK_SECRET)
    body.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;
  const response = await fetch(`${base}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as any;
  if (!response.ok || !result.ok)
    throw new Error(result.description || "Telegram webhook setup failed");
}

export async function telegramWebhookInfo() {
  if (!telegramConfigured())
    return {
      configured: false,
      url: "",
      pendingUpdateCount: 0,
      lastError: "Telegram credentials are not configured",
    };
  const { base } = config();
  const response = await fetch(`${base}/getWebhookInfo`);
  const result = (await response.json()) as any;
  if (!response.ok || !result.ok)
    throw new Error(result.description || "Telegram webhook status failed");
  return {
    configured: true,
    url: result.result?.url || "",
    pendingUpdateCount: result.result?.pending_update_count || 0,
    lastError: result.result?.last_error_message || "",
  };
}

export async function ingestTelegramChannelPost(post: any) {
  const configuredChat = String(ENV.telegramStorageChatId || "")
    .replace(/^@/, "")
    .toLowerCase();
  const origin =
    post?.forward_origin?.type === "channel" ? post.forward_origin : null;
  const sourceChat = origin?.chat || post?.chat;
  const actualChatId = String(sourceChat?.id || "");
  const actualUsername = String(sourceChat?.username || "").toLowerCase();
  const actualTitle = String(sourceChat?.title || "").toLowerCase();
  if (
    !telegramConfigured() ||
    !actualChatId ||
    (configuredChat !== actualChatId &&
      configuredChat !== actualUsername &&
      configuredChat !== actualTitle)
  )
    return false;

  const media = post.video ?? post.audio ?? post.animation ?? post.document;
  if (!media?.file_id) return false;

  const mimeType = String(media.mime_type || "");
  const kind =
    post.video || post.animation || mimeType.startsWith("video/")
      ? "video"
      : "audio";
  const fileName =
    media.file_name || media.title || `${kind}-${post.message_id}`;
  const metadata = parseMediaMetadata({
    caption: post.caption,
    fallbackTitle: media.title || fileName.replace(/\.[^/.]+$/, ""),
    fallbackArtist: media.performer,
  });
  const sourceMessageId = Number(origin?.message_id || post.message_id || 0);
  const publicId = `tg-${actualChatId}-${sourceMessageId}`;
  const existing = await db.getMediaByPublicId(publicId);
  if (existing) {
    await db.updateMediaCatalogItem(publicId, {
      title: metadata.title,
      artist: metadata.artist,
    });
    return true;
  }

  await db.createMediaCatalogItem({
    publicId,
    title: metadata.title,
    artist: metadata.artist,
    kind,
    storageKey: `telegram/${media.file_id}`,
    storageProvider: "telegram",
    telegramFileId: media.file_id,
    telegramMessageId: sourceMessageId,
    thumbnailFileId:
      post.video?.thumbnail?.file_id ??
      post.video?.thumb?.file_id ??
      post.audio?.thumbnail?.file_id ??
      post.audio?.thumb?.file_id ??
      post.document?.thumbnail?.file_id ??
      null,
    mimeType: mimeType || (kind === "video" ? "video/mp4" : "audio/mpeg"),
    fileSize: Number(media.file_size || 0),
    published: 1,
    sortOrder: Number(post.date || post.message_id || 0),
  });
  return true;
}
