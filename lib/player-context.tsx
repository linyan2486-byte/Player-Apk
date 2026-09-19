import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import {
  setIsAudioActiveAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";

import {
  importLocalMedia,
  loadMediaLibrary,
  MediaItem,
  removeLocalMedia,
  saveMediaLibrary,
} from "@/lib/media-library";
import {
  downloadRemoteMedia,
  fetchPublicCatalog,
  syncRemoteCatalog,
} from "@/lib/catalog-sync";
import { mergePublicCatalog } from "@/lib/catalog-utils";
import { getApiBaseUrl } from "@/constants/oauth";
import { requestPlaybackNotificationPermission } from "@/lib/playback-notifications";

const QUEUE_KEY = "@player-apk/queue/v1";
const CATALOG_URL_KEY = "@player-apk/catalog-url/v1";

type PlayerContextValue = {
  library: MediaItem[];
  catalogUrl: string;
  hydrated: boolean;
  currentMedia: MediaItem | null;
  queueIds: string[];
  audioStatus: ReturnType<typeof useAudioPlayerStatus>;
  isPlaying: boolean;
  playFromList: (id: string, ids?: string[]) => void;
  toggleCurrent: () => void;
  seekCurrent: (seconds: number) => Promise<void>;
  pause: () => void;
  next: () => void;
  previous: () => void;
  importMedia: () => Promise<number>;
  deleteMedia: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  syncCatalog: (url: string) => Promise<number>;
  refreshPublicCatalog: () => Promise<number>;
  downloadMedia: (id: string) => Promise<void>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [catalogUrl, setCatalogUrl] = useState("");
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  const currentMedia = useMemo(
    () => library.find((item) => item.id === currentId) ?? null,
    [currentId, library],
  );
  const audioSource = currentMedia?.kind === "audio"
    ? { uri: currentMedia.localUri }
    : null;
  const audioPlayer = useAudioPlayer(audioSource, {
    updateInterval: 500,
    keepAudioSessionActive: true,
  });
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const finishHandledForIdRef = useRef<string | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    void Promise.all([
      loadMediaLibrary(),
      AsyncStorage.getItem(QUEUE_KEY),
      AsyncStorage.getItem(CATALOG_URL_KEY),
    ])
      .then(([items, savedQueue, savedCatalogUrl]) => {
        setLibrary(items);
        setCatalogUrl(savedCatalogUrl ?? "");
        if (savedQueue) {
          try {
            const parsed = JSON.parse(savedQueue) as string[];
            setQueueIds(
              parsed.filter((id) => items.some((item) => item.id === id)),
            );
          } catch {
            setQueueIds([]);
          }
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) void saveMediaLibrary(library);
  }, [hydrated, library]);

  useEffect(() => {
    if (hydrated)
      void AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queueIds));
  }, [hydrated, queueIds]);

  const refreshPublicCatalog = useCallback(async () => {
    const remoteItems = await fetchPublicCatalog(getApiBaseUrl());
    setLibrary((previous) => {
      const remoteIds = new Set(remoteItems.map((item) => item.id));
      for (const item of previous) {
        if (item.remoteId && !remoteIds.has(item.remoteId)) {
          void removeLocalMedia(item);
        }
      }
      return mergePublicCatalog(previous, remoteItems);
    });
    return remoteItems.length;
  }, []);

  useEffect(() => {
    if (hydrated) void refreshPublicCatalog().catch(() => undefined);
  }, [hydrated, refreshPublicCatalog]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setInterval(() => {
      void refreshPublicCatalog().catch(() => undefined);
    }, 30_000);
    return () => clearInterval(timer);
  }, [hydrated, refreshPublicCatalog]);

  useEffect(() => {
    void Promise.all([
      setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: "doNotMix",
        interruptionModeAndroid: "doNotMix",
      }),
      setIsAudioActiveAsync(true),
    ]).catch(() => undefined);
  }, []);

  const activateAudioControls = useCallback(
    (item: MediaItem) => {
      if (Platform.OS === "android")
        void requestPlaybackNotificationPermission();
      void setIsAudioActiveAsync(true).catch(() => undefined);
      try {
        audioPlayer.setActiveForLockScreen(
          true,
          {
            title: item.title,
            artist: item.artist,
            albumTitle: "Mg Flâsh",
            ...(item.thumbnailUrl ? { artworkUrl: item.thumbnailUrl } : {}),
          },
          { showSeekForward: true, showSeekBackward: true },
        );
      } catch {
        // Media notification activation must never terminate playback.
      }
    },
    [audioPlayer],
  );

  useEffect(() => {
    if (!currentMedia || currentMedia.kind !== "video") return;
    if (appState === "active") {
      audioPlayer.pause();
    }
  }, [appState, audioPlayer, currentMedia]);

  const next = useCallback(() => {
    if (!currentId) return;
    const currentIndex = queueIds.indexOf(currentId);
    const currentGroup = currentMedia
      ? `${currentMedia.kind}:${currentMedia.contentType ?? (currentMedia.kind === "audio" ? "music" : "video")}`
      : null;
    const nextId =
      currentIndex >= 0
        ? queueIds.slice(currentIndex + 1).find((id) => {
            const item = library.find((entry) => entry.id === id);
            return (
              item &&
              `${item.kind}:${item.contentType ?? (item.kind === "audio" ? "music" : "video")}` ===
                currentGroup
            );
          })
        : undefined;
    if (nextId) {
      setCurrentId(nextId);
      setShouldAutoplay(true);
    } else {
      setShouldAutoplay(false);
      if (currentMedia?.kind === "audio") audioPlayer.pause();
    }
  }, [audioPlayer, currentId, currentMedia, library, queueIds]);

  const previous = useCallback(() => {
    if (!currentId) return;
    const currentIndex = queueIds.indexOf(currentId);
    const currentGroup = currentMedia
      ? `${currentMedia.kind}:${currentMedia.contentType ?? (currentMedia.kind === "audio" ? "music" : "video")}`
      : null;
    const previousId =
      currentIndex > 0
        ? [...queueIds.slice(0, currentIndex)].reverse().find((id) => {
            const item = library.find((entry) => entry.id === id);
            return (
              item &&
              `${item.kind}:${item.contentType ?? (item.kind === "audio" ? "music" : "video")}` ===
                currentGroup
            );
          })
        : undefined;
    if (previousId) {
      setCurrentId(previousId);
      setShouldAutoplay(true);
    }
  }, [currentId, currentMedia, library, queueIds]);

  const playFromList = useCallback(
    (id: string, ids?: string[]) => {
      const nextQueue = ids?.length ? ids : library.map((item) => item.id);
      const selected = library.find((item) => item.id === id);
      if (!selected) return;
      if (id === currentId && currentMedia?.kind === "audio") {
        if (audioStatus.playing) {
          audioPlayer.pause();
        } else if (audioStatus.isLoaded) {
          activateAudioControls(currentMedia);
          audioPlayer.play();
        }
        return;
      }
      setQueueIds(nextQueue);
      setCurrentId(id);
      setShouldAutoplay(true);
    },
    [
      activateAudioControls,
      audioPlayer,
      audioStatus.isLoaded,
      audioStatus.playing,
      currentId,
      currentMedia,
      library,
    ],
  );

  const toggleCurrent = useCallback(() => {
    if (!currentMedia || currentMedia.kind !== "audio") return;
    if (audioStatus.playing) {
      audioPlayer.pause();
    } else if (audioStatus.isLoaded) {
      activateAudioControls(currentMedia);
      audioPlayer.play();
    }
  }, [
    activateAudioControls,
    audioPlayer,
    audioStatus.isLoaded,
    audioStatus.playing,
    currentMedia,
  ]);

  const seekCurrent = useCallback(
    (seconds: number) => audioPlayer.seekTo(Math.max(0, seconds)),
    [audioPlayer],
  );

  const pause = useCallback(() => {
    if (currentMedia?.kind === "audio") {
      audioPlayer.pause();
    }
    setShouldAutoplay(false);
  }, [audioPlayer, currentMedia?.kind]);

  useEffect(() => {
    if (!currentMedia || !shouldAutoplay) return;
    // Only MP3/audio is allowed to use the background audio player.
    if (currentMedia.kind !== "audio") return;
    if (!audioStatus.isLoaded) return;
    activateAudioControls(currentMedia);
    audioPlayer.play();
  }, [
    activateAudioControls,
    audioPlayer,
    audioStatus.isLoaded,
    currentMedia,
    shouldAutoplay,
  ]);

  useEffect(() => {
    if (!audioStatus.didJustFinish || !currentMedia) return;
    if (finishHandledForIdRef.current === currentMedia.id) return;
    if (currentMedia.kind === "audio") {
      finishHandledForIdRef.current = currentMedia.id;
      next();
    }
  }, [audioStatus.didJustFinish, currentMedia, next]);

  const importMedia = useCallback(async () => {
    const imported = await importLocalMedia();
    if (!imported.length) return 0;
    setLibrary((previousItems) => [...imported, ...previousItems]);
    return imported.length;
  }, []);

  const deleteMedia = useCallback(
    async (id: string) => {
      const item = library.find((entry) => entry.id === id);
      if (!item) return;
      await removeLocalMedia(item);
      setLibrary((items) => items.filter((entry) => entry.id !== id));
      setQueueIds((ids) => ids.filter((entry) => entry !== id));
      if (currentId === id) {
        audioPlayer.pause();
        setCurrentId(null);
        setShouldAutoplay(false);
      }
    },
    [audioPlayer, currentId, library],
  );

  const toggleFavorite = useCallback(async (id: string) => {
    setLibrary((items) =>
      items.map((item) =>
        item.id === id ? { ...item, favorite: !item.favorite } : item,
      ),
    );
  }, []);

  const syncCatalog = useCallback(
    async (url: string) => {
      const normalizedUrl = url.trim();
      if (!normalizedUrl) throw new Error("Catalog URL is required");
      const merged = await syncRemoteCatalog(library, normalizedUrl);
      setLibrary(merged);
      setCatalogUrl(normalizedUrl);
      await AsyncStorage.setItem(CATALOG_URL_KEY, normalizedUrl);
      return merged.length;
    },
    [library],
  );

  const downloadMedia = useCallback(
    async (id: string) => {
      const item = library.find((entry) => entry.id === id);
      if (!item?.remoteId || item.offline) return;
      const saved = await downloadRemoteMedia(
        {
          id: item.remoteId,
          title: item.title,
          artist: item.artist,
          kind: item.kind,
          url: item.localUri,
          mimeType: item.mimeType,
          size: item.size,
          thumbnailUrl: item.thumbnailUrl,
        },
        item,
      );
      setLibrary((items) =>
        items.map((entry) => (entry.id === id ? saved : entry)),
      );
    },
    [library],
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      library,
      catalogUrl,
      hydrated,
      currentMedia,
      queueIds,
      audioStatus,
      isPlaying: currentMedia?.kind === "audio" ? audioStatus.playing : false,
      playFromList,
      toggleCurrent,
      seekCurrent,
      pause,
      next,
      previous,
      importMedia,
      deleteMedia,
      toggleFavorite,
      syncCatalog,
      refreshPublicCatalog,
      downloadMedia,
    }),
    [
      audioStatus,
      catalogUrl,
      currentMedia,
      deleteMedia,
      hydrated,
      importMedia,
      library,
      next,
      pause,
      playFromList,
      previous,
      queueIds,
      seekCurrent,
      syncCatalog,
      toggleCurrent,
      toggleFavorite,
      refreshPublicCatalog,
      downloadMedia,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}
