import type { MediaItem } from "@/lib/media-library";

export type RemoteCatalogRecord = {
  id: string;
  title: string;
  artist?: string;
  kind: "audio" | "video";
  url: string;
  mimeType?: string;
  size?: number;
};

export function mergePublicCatalog(existing: MediaItem[], remoteItems: RemoteCatalogRecord[]): MediaItem[] {
  const byRemoteId = new Map<string, MediaItem>();
  existing.forEach((item) => { if (item.remoteId) byRemoteId.set(item.remoteId, item); });
  const remote: MediaItem[] = remoteItems.map((item) => byRemoteId.get(item.id) ?? {
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
