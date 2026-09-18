import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { usePlayer } from "@/lib/player-context";

export function MiniPlayer() {
  const { currentMedia, isPlaying, toggleCurrent } = usePlayer();
  if (!currentMedia) return null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/player/[id]", params: { id: currentMedia.id } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
    >
      <View className="mx-4 mb-2 flex-row items-center rounded-2xl border border-primary/40 bg-[#152633] px-3 py-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
          <MaterialIcons name={currentMedia.kind === "video" ? "movie" : "graphic-eq"} size={19} color="#69c7e8" />
        </View>
        <View className="ml-2 flex-1">
          <Text className="text-xs font-semibold text-white" numberOfLines={1}>{currentMedia.title}</Text>
          <Text className="mt-0.5 text-[10px] uppercase tracking-widest text-[#84a4b6]">Now playing · offline</Text>
        </View>
        <Pressable onPress={(event) => { event.stopPropagation(); toggleCurrent(); }} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
          <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={26} color="#ffffff" />
        </Pressable>
      </View>
    </Pressable>
  );
}
