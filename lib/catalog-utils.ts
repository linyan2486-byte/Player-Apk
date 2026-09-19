import type { MediaItem } from "@/lib/media-library";

export type RemoteCatalogRecord = {
  id: string;
  title: string;
  artist?: string;
  kind: "audio" | "video";
  url: string;
  mimeType?: string;
  size?: number;
  thumbnailUrl?: string;
  publishedAt?: string | number | Date;
};

export function mergePublicCatalog(existing: MediaItem[], remoteItems: RemoteCatalogRecord[]): MediaItem[] {
  const byRemoteId = new Map<string, MediaItem>();
  existing.forEach((item) => { if (item.remoteId) byRemoteId.set(item.remoteId, item); });
  const remote: MediaItem[] = remoteItems.map((item) => {
    const existingItem = byRemoteId.get(item.id);
    return existingItem ? { ...existingItem, title: item.title, artist: item.artist || existingItem.artist, kind: item.kind, mimeType: item.mimeType, thumbnailUrl: item.thumbnailUrl, size: item.size } : {
      id: `remote-${item.id}`,
      remoteId: item.id,
      title: item.title,
      artist: item.artist || "Mg Flâsh",
      kind: item.kind,
      localUri: item.url,
      mimeType: item.mimeType,
      thumbnailUrl: item.thumbnailUrl,
      size: item.size,
      createdAt: Date.now(),
      favorite: false,
      offline: false,
    };
  });
  return [...remote, ...existing.filter((item) => !item.remoteId)];
}
