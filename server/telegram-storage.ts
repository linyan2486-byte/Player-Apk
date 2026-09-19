import FormData from "form-data";
import fs from "node:fs";
import { ENV } from "./_core/env";

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
