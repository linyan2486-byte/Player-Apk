import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEvent } from "expo";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

import { ScreenContainer } from "@/components/screen-container";
import { formatDuration } from "@/lib/media-utils";
import { usePlayer } from "@/lib/player-context";

function ControlButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({
        alignItems: "center",
        opacity: disabled ? 0.3 : pressed ? 0.55 : 1,
      })}
    >
      <MaterialIcons name={icon} size={30} color="#b3c2cb" />
      <Text className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </Text>
    </Pressable>
  );
}

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    library,
    currentMedia,
    isPlaying,
    toggleCurrent,
    pause,
    next,
    previous,
    playFromList,
    audioStatus,
  } = usePlayer();
  const routeItem = library.find((entry) => entry.id === id);
  const item = currentMedia ?? routeItem;
  const videoPlayer = useVideoPlayer(
    item?.kind === "video" ? item.localUri : null,
    (player) => {
      player.timeUpdateEventInterval = 0.5;
    },
  );
  const { isPlaying: videoPlaying } = useEvent(videoPlayer, "playingChange", {
    isPlaying: videoPlayer.playing,
  });
  const videoTime = useEvent(videoPlayer, "timeUpdate");
  const videoLoaded = useEvent(videoPlayer, "sourceLoad");

  useEffect(() => {
    if (!currentMedia && routeItem)
      playFromList(
        routeItem.id,
        library.map((entry) => entry.id),
      );
  }, [currentMedia, library, playFromList, routeItem]);

  useEffect(() => {
    const subscription = videoPlayer.addListener("playToEnd", () => next());
    return () => subscription.remove();
  }, [next, videoPlayer]);

  useEffect(() => {
    if (item?.kind === "video" && currentMedia?.id === item.id)
      videoPlayer.play();
  }, [currentMedia?.id, item?.id, item?.kind, videoPlayer]);

  if (!item) {
    return (
      <ScreenContainer className="items-center justify-center px-5">
        <ActivityIndicator color="#69c7e8" />
        <Text className="mt-4 text-muted">Media not found.</Text>
      </ScreenContainer>
    );
  }

  const isVideo = item.kind === "video";
  const playing = isVideo ? videoPlaying : isPlaying;
  const audioProgress =
    audioStatus.duration > 0
      ? audioStatus.currentTime / audioStatus.duration
      : 0;
  const videoCurrentTime = videoTime?.currentTime ?? 0;
  const videoDuration = videoLoaded?.duration || videoPlayer.duration || 0;
  const videoProgress =
    videoDuration > 0 ? videoCurrentTime / videoDuration : 0;
  const progress = isVideo ? videoProgress : audioProgress;
  const seekVideo = (seconds: number) => videoPlayer.seekBy(seconds);
  const toggleVideo = () => {
    if (videoPlaying) videoPlayer.pause();
    else videoPlayer.play();
  };

  return (
    <ScreenContainer
      className="px-5 pt-3"
      edges={["top", "left", "right", "bottom"]}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-primary">
          NOW PLAYING
        </Text>
        <Text className="text-xs text-muted">
          {isVideo ? "VIDEO" : "AUDIO"}
        </Text>
      </View>

      {isVideo ? (
        <View className="mt-8 overflow-hidden rounded-3xl bg-black">
          <VideoView
            player={videoPlayer}
            style={{ width: "100%", aspectRatio: 16 / 9 }}
            contentFit="contain"
            allowsFullscreen
            fullscreenOptions={{
              enable: true,
              orientation: "landscape",
              autoExitOnRotate: true,
            }}
            allowsPictureInPicture
          />
        </View>
      ) : (
        <View className="mt-12 items-center rounded-3xl border border-primary/30 bg-[#152633] px-8 py-14">
          <View className="h-28 w-28 items-center justify-center rounded-[32px] bg-primary/15">
            <MaterialIcons name="graphic-eq" size={58} color="#69c7e8" />
          </View>
          <Text className="mt-8 text-sm uppercase tracking-[3px] text-[#91afbd]">
            Background audio
          </Text>
        </View>
      )}

      <Text
        className="mt-8 text-2xl font-bold text-foreground"
        numberOfLines={2}
      >
        {item.title}
      </Text>
      <Text className="mt-2 text-base text-muted">{item.artist}</Text>

      <View className="mt-8">
        <View className="h-1.5 overflow-hidden rounded-full bg-border">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </View>
        <View className="mt-2 flex-row justify-between">
          <Text className="text-xs text-muted">
            {formatDuration(
              isVideo ? videoCurrentTime : audioStatus.currentTime,
            )}
          </Text>
          <Text className="text-xs text-muted">
            {formatDuration(isVideo ? videoDuration : audioStatus.duration)}
          </Text>
        </View>
      </View>

      <View className="mt-7 flex-row items-start justify-center gap-7">
        <ControlButton
          icon="skip-previous"
          label="Previous"
          onPress={previous}
        />
        {isVideo ? (
          <ControlButton
            icon="replay-10"
            label="-10 sec"
            onPress={() => seekVideo(-10)}
          />
        ) : null}
        <Pressable
          accessibilityLabel={playing ? "Pause" : "Play"}
          onPress={isVideo ? toggleVideo : toggleCurrent}
          style={({ pressed }) => ({
            opacity: pressed ? 0.75 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
            <MaterialIcons
              name={playing ? "pause" : "play-arrow"}
              size={36}
              color="#07131a"
            />
          </View>
        </Pressable>
        {isVideo ? (
          <ControlButton
            icon="forward-10"
            label="+10 sec"
            onPress={() => seekVideo(10)}
          />
        ) : null}
        <ControlButton icon="skip-next" label="Next" onPress={next} />
      </View>

      <Pressable
        onPress={() => {
          if (isVideo) videoPlayer.pause();
          pause();
        }}
        style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
      >
        <Text className="mt-8 text-center text-xs font-semibold uppercase tracking-[2px] text-muted">
          Stop playback
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}
