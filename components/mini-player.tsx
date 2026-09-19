import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { usePlayer } from "@/lib/player-context";

export function MiniPlayer() {
  const { currentMedia, isPlaying, toggleCurrent, next, previous } =
    usePlayer();
  if (!currentMedia) return null;

  const isVideo = currentMedia.kind === "video";
  const openPlayer = () =>
    router.push({ pathname: "/player/[id]", params: { id: currentMedia.id } });

  return (
    <View className="mx-4 mb-2 flex-row items-center rounded-2xl border border-primary/40 bg-[#152633] px-3 py-2.5">
      <Pressable
        onPress={openPlayer}
        style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
        className="flex-1 flex-row items-center"
      >
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
          <MaterialIcons
            name={isVideo ? "movie" : "graphic-eq"}
            size={19}
            color="#69c7e8"
          />
        </View>
        <View className="ml-2 flex-1">
          <Text className="text-xs font-semibold text-white" numberOfLines={1}>
            {currentMedia.title}
          </Text>
          <Text className="mt-0.5 text-[10px] uppercase tracking-widest text-[#84a4b6]">
            {isVideo ? "Video · playing" : "Music · background audio"}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={previous}
        accessibilityLabel="Previous"
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
      >
        <MaterialIcons name="skip-previous" size={23} color="#d5e4ea" />
      </Pressable>
      <Pressable
        onPress={isVideo ? openPlayer : toggleCurrent}
        accessibilityLabel={
          isVideo ? "Open video player" : isPlaying ? "Pause" : "Play"
        }
        hitSlop={8}
        style={({ pressed }) => ({
          opacity: pressed ? 0.55 : 1,
          marginLeft: 10,
        })}
      >
        <MaterialIcons
          name={isVideo ? "play-arrow" : isPlaying ? "pause" : "play-arrow"}
          size={27}
          color="#ffffff"
        />
      </Pressable>
      <Pressable
        onPress={next}
        accessibilityLabel="Next"
        hitSlop={8}
        style={({ pressed }) => ({
          opacity: pressed ? 0.55 : 1,
          marginLeft: 10,
        })}
      >
        <MaterialIcons name="skip-next" size={23} color="#d5e4ea" />
      </Pressable>
    </View>
  );
}
