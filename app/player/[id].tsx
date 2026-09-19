import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEvent } from "expo";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";

import { ScreenContainer } from "@/components/screen-container";
import { formatDuration } from "@/lib/media-utils";
import type { MediaItem } from "@/lib/media-library";
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
    seekCurrent,
    audioStatus,
    queueIds,
  } = usePlayer();
  const audioPositionRef = useRef(0);
  audioPositionRef.current = audioStatus.currentTime;
  const routeItem = library.find((entry) => entry.id === id);
  const item = currentMedia ?? routeItem;
  const [progressWidth, setProgressWidth] = useState(0);
  const videoPlayer = useVideoPlayer(
    item?.kind === "video" ? item.localUri : null,
    (player) => {
      player.timeUpdateEventInterval = 0.5;
    },
  );
  const { isPlaying: videoPlaying } = useEvent(videoPlayer, "playingChange", {
    isPlaying: videoPlayer.playing,
  });
  const videoStatus = useEvent(videoPlayer, "statusChange", {
    status: videoPlayer.status,
  });
  const videoTime = useEvent(videoPlayer, "timeUpdate");
  const videoLoaded = useEvent(videoPlayer, "sourceLoad");
  const lastVideoTapRef = useRef<{
    side: "left" | "right";
    at: number;
  } | null>(null);

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

  useEffect(() => {
    if (item?.kind !== "video") return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (audioPositionRef.current > 0)
          videoPlayer.currentTime = audioPositionRef.current;
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
    });
    return () => subscription.remove();
  }, [item?.kind, videoPlayer]);

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
  const currentContentType =
    item.contentType ?? (item.kind === "audio" ? "music" : "video");
  const currentQueueIndex = queueIds.indexOf(item.id);
  const upNext = queueIds
    .slice(currentQueueIndex + 1)
    .map((queueId) => library.find((entry) => entry.id === queueId))
    .filter(
      (entry) =>
        entry?.kind === item.kind &&
        (entry.contentType ?? (entry.kind === "audio" ? "music" : "video")) ===
          currentContentType,
    )
    .filter((entry): entry is MediaItem => Boolean(entry))
    .slice(0, 8);
  const seekVideo = (seconds: number) => videoPlayer.seekBy(seconds);
  const handleVideoTap = (side: "left" | "right") => {
    const now = Date.now();
    const previousTap = lastVideoTapRef.current;
    if (previousTap && previousTap.side === side && now - previousTap.at <= 320) {
      lastVideoTapRef.current = null;
      seekVideo(side === "left" ? -10 : 10);
      return;
    }
    lastVideoTapRef.current = { side, at: now };
  };
  const toggleVideo = () => {
    if (videoPlaying) videoPlayer.pause();
    else videoPlayer.play();
  };
  const seekToProgress = (locationX: number) => {
    if (!progressWidth) return;
    const duration = isVideo ? videoDuration : audioStatus.duration;
    if (!duration) return;
    const nextTime = Math.max(
      0,
      Math.min(duration, (locationX / progressWidth) * duration),
    );
    if (isVideo) videoPlayer.currentTime = nextTime;
    else void seekCurrent(nextTime);
  };

  return (
    <ScreenContainer
      className="px-5 pt-3"
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
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
            {videoStatus.status === "loading" ? (
              <View
                pointerEvents="none"
                className="absolute inset-0 items-center justify-center bg-black/45"
              >
                <ActivityIndicator size="large" color="#69c7e8" />
                <Text className="mt-3 text-sm font-semibold text-white">
                  Loading video…
                </Text>
                <Text className="mt-1 text-xs text-[#c3d0d6]">
                  Network speed may affect loading time
                </Text>
              </View>
            ) : null}
            {videoStatus.status === "error" ? (
              <View
                pointerEvents="none"
                className="absolute inset-0 items-center justify-center bg-black/65 px-8"
              >
                <MaterialIcons name="error-outline" size={38} color="#ff9aa8" />
                <Text className="mt-3 text-center text-sm font-semibold text-white">
                  Video could not be loaded
                </Text>
                <Text className="mt-1 text-center text-xs text-[#c3d0d6]">
                  Check the network or try again later.
                </Text>
              </View>
            ) : null}
            <View
              pointerEvents="box-none"
              className="absolute inset-0 flex-row"
            >
              <Pressable
                accessibilityLabel="Double tap to rewind 10 seconds"
                onPress={() => handleVideoTap("left")}
                className="h-full flex-1"
              />
              <Pressable
                accessibilityLabel="Double tap to fast forward 10 seconds"
                onPress={() => handleVideoTap("right")}
                className="h-full flex-1"
              />
            </View>
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
          <Pressable
            onLayout={(event) =>
              setProgressWidth(event.nativeEvent.layout.width)
            }
            onPress={(event) => seekToProgress(event.nativeEvent.locationX)}
            hitSlop={8}
            className="h-5 justify-center"
            accessibilityLabel="Seek playback"
          >
            <View className="h-1.5 overflow-hidden rounded-full bg-border">
              <View
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                }}
              />
            </View>
          </Pressable>
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
        <View className="mt-9">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialIcons name="queue-play-next" size={22} color="#69c7e8" />
              <Text className="ml-2 text-lg font-bold text-foreground">
                Up next
              </Text>
            </View>
            <Text className="text-xs text-muted">{upNext.length} more</Text>
          </View>
          {upNext.length ? (
            upNext.map((nextItem, index) => (
              <Pressable
                key={nextItem.id}
                onPress={() => {
                  playFromList(nextItem.id, queueIds);
                }}
                className="mb-3 flex-row items-center rounded-2xl border border-border bg-surface px-3 py-3"
              >
                <Text className="w-7 text-center text-sm font-bold text-primary">
                  {index + 1}
                </Text>
                <View className="ml-2 h-12 w-20 items-center justify-center overflow-hidden rounded-xl bg-[#10232d]">
                  {nextItem.thumbnailUrl ? (
                    <Image
                      source={{ uri: nextItem.thumbnailUrl }}
                      contentFit="cover"
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <MaterialIcons
                      name={nextItem.kind === "video" ? "movie" : "music-note"}
                      size={24}
                      color="#69c7e8"
                    />
                  )}
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className="text-sm font-semibold text-foreground"
                    numberOfLines={1}
                  >
                    {nextItem.title}
                  </Text>
                  <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
                    {nextItem.seriesTitle ? `${nextItem.seriesTitle} · ` : ""}
                    {nextItem.artist}
                  </Text>
                </View>
                <MaterialIcons name="play-arrow" size={23} color="#69c7e8" />
              </Pressable>
            ))
          ) : (
            <Text className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
              No more items in this queue.
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
