import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

export async function uploadCatalogMedia() {
  const picked = await DocumentPicker.getDocumentAsync({ type: ["audio/*", "video/*"], multiple: false, copyToCacheDirectory: true });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  const kind = asset.mimeType?.startsWith("video/") || /\.(mp4|m4v|mov|webm|mkv|avi)$/i.test(asset.name) ? "video" : "audio";
  const form = new FormData();
  if (Platform.OS === "web" && asset.file) {
    form.append("file", asset.file, asset.name);
  } else {
    form.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType || (kind === "video" ? "video/mp4" : "audio/mpeg") } as any);
  }
  form.append("kind", kind);
  form.append("title", asset.name.replace(/\.[^/.]+$/, ""));
  form.append("artist", "Mg Flâsh");

  const token = await Auth.getSessionToken();
  const response = await fetch(`${getApiBaseUrl().replace(/\/$/, "")}/api/catalog/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
    body: form,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Upload failed (${response.status})`);
  }
  return (await response.json()) as { success: boolean; item: { id: string; title: string; kind: "audio" | "video" } };
}
