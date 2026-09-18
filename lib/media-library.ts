import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

export { formatBytes } from "@/lib/media-utils";

export type MediaKind = "audio" | "video";

export type MediaItem = {
  id: string;
  title: string;
  artist: string;
  kind: MediaKind;
  localUri: string;
  mimeType?: string;
  size?: number;
  createdAt: number;
  favorite: boolean;
};

const LIBRARY_KEY = "@player-apk/media-library/v1";
const MEDIA_DIRECTORY = "player-media";

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}

function extensionFor(asset: DocumentPicker.DocumentPickerAsset) {
  const fromName = asset.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (asset.mimeType?.includes("mp4")) return "mp4";
  if (asset.mimeType?.includes("mpeg")) return "mp3";
  if (asset.mimeType?.includes("wav")) return "wav";
  return "media";
}

function kindFor(asset: DocumentPicker.DocumentPickerAsset): MediaKind {
  if (asset.mimeType?.startsWith("video/")) return "video";
  return /\.(mp4|m4v|mov|webm|mkv|avi)$/i.test(asset.name) ? "video" : "audio";
}

export async function loadMediaLibrary(): Promise<MediaItem[]> {
  try {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MediaItem[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.localUri) : [];
  } catch {
    return [];
  }
}

export async function saveMediaLibrary(items: MediaItem[]) {
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
}

export async function importLocalMedia(): Promise<MediaItem[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["audio/*", "video/*"],
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled) return [];

  const mediaDirectory = new Directory(Paths.document, MEDIA_DIRECTORY);
  if (Platform.OS !== "web") {
    mediaDirectory.create({ intermediates: true, idempotent: true });
  }

  const imported: MediaItem[] = [];
  for (const asset of result.assets) {
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const destination = new File(mediaDirectory, `${id}-${safeName(asset.name)}`);

    if (Platform.OS === "web") {
      imported.push({
        id,
        title: asset.name.replace(/\.[^/.]+$/, ""),
        artist: "Local import",
        kind: kindFor(asset),
        localUri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.size,
        createdAt: Date.now(),
        favorite: false,
      });
      continue;
    }

    const source = new File(asset.uri);
    source.copy(destination);
    imported.push({
      id,
      title: asset.name.replace(/\.[^/.]+$/, ""),
      artist: "Local import",
      kind: kindFor(asset),
      localUri: destination.uri,
      mimeType: asset.mimeType,
      size: asset.size,
      createdAt: Date.now(),
      favorite: false,
    });
  }

  return imported;
}

export async function removeLocalMedia(item: MediaItem) {
  if (Platform.OS === "web") return;
  try {
    const file = new File(item.localUri);
    if (file.exists) file.delete();
  } catch {
    // The metadata can still be removed if the original file was already deleted.
  }
}
