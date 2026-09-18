import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import {
  importLocalMedia,
  loadMediaLibrary,
  MediaItem,
  removeLocalMedia,
  saveMediaLibrary,
} from "@/lib/media-library";

const QUEUE_KEY = "@player-apk/queue/v1";

type PlayerContextValue = {
  library: MediaItem[];
  hydrated: boolean;
  currentMedia: MediaItem | null;
  queueIds: string[];
  audioStatus: ReturnType<typeof useAudioPlayerStatus>;
  isPlaying: boolean;
  playFromList: (id: string, ids?: string[]) => void;
  toggleCurrent: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  importMedia: () => Promise<number>;
  deleteMedia: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const currentMedia = useMemo(
    () => library.find((item) => item.id === currentId) ?? null,
    [currentId, library],
  );
  const audioSource = currentMedia?.kind === "audio" ? { uri: currentMedia.localUri } : null;
  const audioPlayer = useAudioPlayer(audioSource, {
    updateInterval: 500,
    keepAudioSessionActive: true,
  });
  const audioStatus = useAudioPlayerStatus(audioPlayer);

  useEffect(() => {
    void Promise.all([loadMediaLibrary(), AsyncStorage.getItem(QUEUE_KEY)])
      .then(([items, savedQueue]) => {
        setLibrary(items);
        if (savedQueue) {
          try {
            const parsed = JSON.parse(savedQueue) as string[];
            setQueueIds(parsed.filter((id) => items.some((item) => item.id === id)));
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
    if (hydrated) void AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queueIds));
  }, [hydrated, queueIds]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionModeAndroid: "doNotMix",
    }).catch(() => undefined);
  }, []);

  const next = useCallback(() => {
    if (!currentId) return;
    const currentIndex = queueIds.indexOf(currentId);
    const nextId = currentIndex >= 0 ? queueIds[currentIndex + 1] : undefined;
    if (nextId) {
      setCurrentId(nextId);
      setShouldAutoplay(true);
    } else {
      setShouldAutoplay(false);
    }
  }, [currentId, queueIds]);

  const previous = useCallback(() => {
    if (!currentId) return;
    const currentIndex = queueIds.indexOf(currentId);
    const previousId = currentIndex > 0 ? queueIds[currentIndex - 1] : undefined;
    if (previousId) {
      setCurrentId(previousId);
      setShouldAutoplay(true);
    }
  }, [currentId, queueIds]);

  const playFromList = useCallback(
    (id: string, ids?: string[]) => {
      const nextQueue = ids?.length ? ids : library.map((item) => item.id);
      if (id === currentId && currentMedia?.kind === "audio") {
        if (audioStatus.playing) audioPlayer.pause();
        else audioPlayer.play();
        return;
      }
      setQueueIds(nextQueue);
      setCurrentId(id);
      setShouldAutoplay(true);
    },
    [audioPlayer, audioStatus.playing, currentId, currentMedia?.kind, library],
  );

  const toggleCurrent = useCallback(() => {
    if (!currentMedia) return;
    if (currentMedia.kind === "audio") {
      if (audioStatus.playing) audioPlayer.pause();
      else audioPlayer.play();
    }
  }, [audioPlayer, audioStatus.playing, currentMedia]);

  const pause = useCallback(() => {
    if (currentMedia?.kind === "audio") audioPlayer.pause();
    setShouldAutoplay(false);
  }, [audioPlayer, currentMedia?.kind]);

  useEffect(() => {
    if (!currentMedia || currentMedia.kind !== "audio" || !shouldAutoplay) return;
    audioPlayer.setActiveForLockScreen(
      true,
      { title: currentMedia.title, artist: currentMedia.artist, albumTitle: "Player APK" },
      { showSeekForward: true, showSeekBackward: true },
    );
    audioPlayer.play();
    return () => {
      if (Platform.OS !== "web") audioPlayer.clearLockScreenControls();
    };
  }, [audioPlayer, currentMedia, shouldAutoplay]);

  useEffect(() => {
    if (audioStatus.didJustFinish) next();
  }, [audioStatus.didJustFinish, next]);

  const importMedia = useCallback(async () => {
    const imported = await importLocalMedia();
    if (!imported.length) return 0;
    setLibrary((previousItems) => [...previousItems, ...imported]);
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
      items.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item)),
    );
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      library,
      hydrated,
      currentMedia,
      queueIds,
      audioStatus,
      isPlaying: currentMedia?.kind === "audio" ? audioStatus.playing : false,
      playFromList,
      toggleCurrent,
      pause,
      next,
      previous,
      importMedia,
      deleteMedia,
      toggleFavorite,
    }),
    [
      audioStatus,
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
      toggleCurrent,
      toggleFavorite,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}
