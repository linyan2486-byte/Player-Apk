import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, Text, View } from "react-native";

import { formatBytes, MediaItem } from "@/lib/media-library";

export function MediaCard({ item, onPress, onFavorite }: { item: MediaItem; onPress: () => void; onFavorite: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <View className="mb-3 flex-row items-center rounded-2xl border border-border bg-surface p-3">
        <View className={`h-14 w-14 items-center justify-center rounded-xl ${item.kind === "video" ? "bg-primary/20" : "bg-warning/15"}`}>
          <MaterialIcons name={item.kind === "video" ? "movie" : "music-note"} size={27} color={item.kind === "video" ? "#69c7e8" : "#f7bd62"} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>{item.title}</Text>
          <Text className="mt-1 text-xs text-muted" numberOfLines={1}>{item.artist} · {formatBytes(item.size)}</Text>
        </View>
        <Pressable onPress={onFavorite} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <MaterialIcons name={item.favorite ? "favorite" : "favorite-border"} size={22} color={item.favorite ? "#ff7187" : "#7f8c9a"} />
        </Pressable>
        <MaterialIcons name="play-circle-filled" size={30} color="#69c7e8" style={{ marginLeft: 10 }} />
      </View>
    </Pressable>
  );
}
