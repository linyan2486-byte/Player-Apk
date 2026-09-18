import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import type { MediaItem } from "@/lib/media-library";

export type RemoteCatalogItem = {
  id: string;
  title: string;
  artist?: string;
  kind: "audio" | "video";
  url: string;
  mimeType?: string;
  size?: number;
};

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
}

function extensionFor(item: RemoteCatalogItem) {
  const urlExtension = item.url.split("?")[0].split(".").pop()?.toLowerCase();
  if (urlExtension && urlExtension.length <= 5) return urlExtension;
  if (item.kind === "video") return "mp4";
  return "mp3";
}

export async function syncRemoteCatalog(existing: MediaItem[], catalogUrl: string) {
  const response = await fetch(catalogUrl);
  if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
  const payload = (await response.json()) as RemoteCatalogItem[] | { items: RemoteCatalogItem[] };
  const remoteItems = Array.isArray(payload) ? payload : payload.items;
  if (!Array.isArray(remoteItems)) throw new Error("Catalog must be an array or an object with an items array");

  const localByRemoteId = new Map<string, MediaItem>();
  existing.forEach((item) => {
    if (item.remoteId) localByRemoteId.set(item.remoteId, item);
  });
  const mediaDirectory = new Directory(Paths.document, "player-media");
  if (Platform.OS !== "web") mediaDirectory.create({ intermediates: true, idempotent: true });

  const downloaded: MediaItem[] = [];
  for (const item of remoteItems) {
    const old = localByRemoteId.get(item.id);
    const favorite = old?.favorite ?? false;
    if (old) {
      downloaded.push(old);
      continue;
    }

    const localUri = Platform.OS === "web"
      ? item.url
      : (await File.downloadFileAsync(item.url, new File(mediaDirectory, `remote-${safeName(item.id)}-${safeName(item.title)}.${extensionFor(item)}`))).uri;
    downloaded.push({
      id: `remote-${item.id}`,
      remoteId: item.id,
      title: item.title,
      artist: item.artist || "Mg Flâsh catalog",
      kind: item.kind,
      localUri,
      mimeType: item.mimeType,
      size: item.size,
      createdAt: Date.now(),
      favorite,
    });
  }

  const localOnly = existing.filter((item) => !item.remoteId);
  return [...downloaded, ...localOnly];
}
