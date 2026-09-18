import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEvent } from "expo";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

import { ScreenContainer } from "@/components/screen-container";
import { usePlayer } from "@/lib/player-context";

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { library, currentMedia, isPlaying, toggleCurrent, pause, next, previous, playFromList, audioStatus } = usePlayer();
  const item = library.find((entry) => entry.id === id) ?? currentMedia;
  const videoPlayer = useVideoPlayer(item?.kind === "video" ? item.localUri : null, (player) => {
    player.timeUpdateEventInterval = 0.5;
  });
  const { isPlaying: videoPlaying } = useEvent(videoPlayer, "playingChange", { isPlaying: videoPlayer.playing });

  useEffect(() => {
    if (item && item.id !== currentMedia?.id) playFromList(item.id, library.map((entry) => entry.id));
  }, [currentMedia?.id, item, library, playFromList]);

  useEffect(() => {
    const subscription = videoPlayer.addListener("playToEnd", () => next());
    return () => subscription.remove();
  }, [next, videoPlayer]);

  useEffect(() => {
    if (item?.kind === "video" && currentMedia?.id === item.id) videoPlayer.play();
  }, [currentMedia?.id, item?.id, item?.kind, videoPlayer]);

  if (!item) {
    return <ScreenContainer className="items-center justify-center px-5"><ActivityIndicator color="#69c7e8" /><Text className="mt-4 text-muted">Media not found.</Text></ScreenContainer>;
  }

  const playing = item.kind === "video" ? videoPlaying : isPlaying;
  const progress = item.kind === "audio" && audioStatus.duration ? audioStatus.currentTime / audioStatus.duration : 0;

  return (
    <ScreenContainer className="px-5 pt-3" edges={["top", "left", "right", "bottom"]}>
      <View className="flex-row items-center justify-between"><Text className="text-xs font-semibold uppercase tracking-[2px] text-primary">NOW PLAYING</Text><Text className="text-xs text-muted">{item.kind === "video" ? "VIDEO" : "AUDIO"}</Text></View>
      {item.kind === "video" ? <View className="mt-8 overflow-hidden rounded-3xl bg-black"><VideoView player={videoPlayer} style={{ width: "100%", aspectRatio: 16 / 9 }} contentFit="contain" allowsFullscreen allowsPictureInPicture /></View> : <View className="mt-12 items-center rounded-3xl border border-primary/30 bg-[#152633] px-8 py-14"><View className="h-28 w-28 items-center justify-center rounded-[32px] bg-primary/15"><MaterialIcons name="graphic-eq" size={58} color="#69c7e8" /></View><Text className="mt-8 text-sm uppercase tracking-[3px] text-[#91afbd]">Offline audio</Text></View>}
      <Text className="mt-8 text-2xl font-bold text-foreground" numberOfLines={2}>{item.title}</Text>
      <Text className="mt-2 text-base text-muted">{item.artist}</Text>
      {item.kind === "audio" ? <View className="mt-8"><View className="h-1.5 overflow-hidden rounded-full bg-border"><View className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} /></View><View className="mt-2 flex-row justify-between"><Text className="text-xs text-muted">{Math.floor(audioStatus.currentTime)}s</Text><Text className="text-xs text-muted">{Math.floor(audioStatus.duration)}s</Text></View></View> : null}
      <View className="mt-9 flex-row items-center justify-center gap-8"><Pressable onPress={previous} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}><MaterialIcons name="skip-previous" size={31} color="#b3c2cb" /></Pressable><Pressable onPress={item.kind === "video" ? () => (videoPlaying ? videoPlayer.pause() : videoPlayer.play()) : toggleCurrent} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}><View className="h-16 w-16 items-center justify-center rounded-full bg-primary"><MaterialIcons name={playing ? "pause" : "play-arrow"} size={36} color="#07131a" /></View></Pressable><Pressable onPress={next} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}><MaterialIcons name="skip-next" size={31} color="#b3c2cb" /></Pressable></View>
      <Pressable onPress={pause} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="mt-8 text-center text-xs font-semibold uppercase tracking-[2px] text-muted">Stop playback</Text></Pressable>
    </ScreenContainer>
  );
}
