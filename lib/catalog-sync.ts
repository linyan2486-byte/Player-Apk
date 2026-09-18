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

export async function fetchPublicCatalog(apiBaseUrl: string) {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/catalog`);
  if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
  const payload = (await response.json()) as RemoteCatalogItem[] | { items: RemoteCatalogItem[] };
  const items = Array.isArray(payload) ? payload : payload.items;
  if (!Array.isArray(items)) throw new Error("Catalog response is invalid");
  return items.map((item) => ({ ...item, url: item.url.startsWith("http") ? item.url : `${apiBaseUrl.replace(/\/$/, "")}${item.url}` }));
}

export async function downloadRemoteMedia(item: RemoteCatalogItem, existing?: MediaItem) {
  if (Platform.OS === "web") return { ...(existing ?? {}), id: existing?.id ?? `remote-${item.id}`, remoteId: item.id, title: item.title, artist: item.artist || "Mg Flâsh", kind: item.kind, localUri: item.url, mimeType: item.mimeType, size: item.size, createdAt: existing?.createdAt ?? Date.now(), favorite: existing?.favorite ?? false, offline: false } as MediaItem;

  const mediaDirectory = new Directory(Paths.document, "player-media");
  mediaDirectory.create({ intermediates: true, idempotent: true });
  const localFile = new File(mediaDirectory, `remote-${safeName(item.id)}-${safeName(item.title)}.${extensionFor(item)}`);
  const downloaded = await File.downloadFileAsync(item.url, localFile);
  return {
    id: existing?.id ?? `remote-${item.id}`,
    remoteId: item.id,
    title: item.title,
    artist: item.artist || "Mg Flâsh",
    kind: item.kind,
    localUri: downloaded.uri,
    mimeType: item.mimeType,
    size: item.size,
    createdAt: existing?.createdAt ?? Date.now(),
    favorite: existing?.favorite ?? false,
    offline: true,
  } as MediaItem;
}

export function mergePublicCatalog(existing: MediaItem[], remoteItems: RemoteCatalogItem[]) {
  const byRemoteId = new Map<string, MediaItem>();
  existing.forEach((item) => { if (item.remoteId) byRemoteId.set(item.remoteId, item); });
  const remote = remoteItems.map((item) => byRemoteId.get(item.id) ?? {
    id: `remote-${item.id}`,
    remoteId: item.id,
    title: item.title,
    artist: item.artist || "Mg Flâsh",
    kind: item.kind,
    localUri: item.url,
    mimeType: item.mimeType,
    size: item.size,
    createdAt: Date.now(),
    favorite: false,
    offline: false,
  });
  return [...remote, ...existing.filter((item) => !item.remoteId)];
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
  const downloaded: MediaItem[] = [];
  for (const item of remoteItems) {
    const old = localByRemoteId.get(item.id);
    const favorite = old?.favorite ?? false;
    if (old) {
      downloaded.push(old);
      continue;
    }
    downloaded.push({ id: `remote-${item.id}`, remoteId: item.id, title: item.title, artist: item.artist || "Mg Flâsh catalog", kind: item.kind, localUri: item.url, mimeType: item.mimeType, size: item.size, createdAt: Date.now(), favorite, offline: false });
  }
  const localOnly = existing.filter((item) => !item.remoteId);
  return [...downloaded, ...localOnly];
}
