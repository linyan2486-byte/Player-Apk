import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { MediaCard } from "@/components/media-card";
import { MiniPlayer } from "@/components/mini-player";
import { ScreenContainer } from "@/components/screen-container";
import { usePlayer } from "@/lib/player-context";

export default function LibraryScreen() {
  const { library, playFromList, deleteMedia, toggleFavorite } = usePlayer();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "audio" | "video" | "favorite">("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return library.filter((item) => {
      const matchesQuery = !normalized || `${item.title} ${item.artist}`.toLowerCase().includes(normalized);
      const matchesFilter = filter === "all" || (filter === "favorite" ? item.favorite : item.kind === filter);
      return matchesQuery && matchesFilter;
    });
  }, [filter, library, query]);

  const askDelete = (id: string, title: string) => {
    Alert.alert("Remove from library?", `${title} will be removed from this device.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void deleteMedia(id) },
    ]);
  };

  return (
    <ScreenContainer className="px-5 pt-3" edges={["top", "left", "right"]}>
      <Text className="text-3xl font-bold text-foreground">Library</Text>
      <Text className="mt-1 text-sm text-muted">Search, favorite, and play your offline files.</Text>
      <View className="mt-5 flex-row items-center rounded-2xl border border-border bg-surface px-4">
        <MaterialIcons name="search" size={21} color="#7f8c9a" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search title or artist" placeholderTextColor="#71808c" className="ml-2 flex-1 py-4 text-base text-foreground" />
      </View>
      <View className="mt-4 flex-row gap-2">
        {(["all", "audio", "video", "favorite"] as const).map((option) => (
          <Pressable key={option} onPress={() => setFilter(option)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
            <View className={`rounded-full px-3 py-2 ${filter === option ? "bg-primary" : "bg-surface border border-border"}`}>
              <Text className={`text-xs font-semibold capitalize ${filter === option ? "text-[#07131a]" : "text-muted"}`}>{option}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View className="mt-5 flex-1">
        {filtered.length ? filtered.map((item) => (
          <View key={item.id}>
            <MediaCard item={item} onPress={() => playFromList(item.id, filtered.map((entry) => entry.id))} onFavorite={() => void toggleFavorite(item.id)} />
            <Pressable onLongPress={() => askDelete(item.id, item.title)} className="absolute bottom-4 right-14 h-8 w-8" style={({ pressed }) => ({ opacity: pressed ? 0.5 : 0 })} accessibilityLabel={`Remove ${item.title}`}>
              <MaterialIcons name="delete-outline" size={18} color="#ff7187" />
            </Pressable>
          </View>
        )) : (
          <View className="mt-16 items-center"><MaterialIcons name="search-off" size={42} color="#50606e" /><Text className="mt-3 text-base text-muted">No media matches this filter.</Text></View>
        )}
      </View>
      <MiniPlayer />
    </ScreenContainer>
  );
}
