import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";

import { MediaCard } from "@/components/media-card";
import { MiniPlayer } from "@/components/mini-player";
import { ScreenContainer } from "@/components/screen-container";
import { fuzzyFilter } from "@/lib/search-utils";
import { usePlayer } from "@/lib/player-context";

export default function HomeScreen() {
  const { library, hydrated, playFromList, toggleFavorite, downloadMedia, refreshPublicCatalog } = usePlayer();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | "video" | "audio">("all");
  const [refreshing, setRefreshing] = useState(false);

  const catalog = useMemo(() => library.filter((item) => Boolean(item.remoteId)), [library]);

  const filtered = useMemo(() => {
    const inCategory = category === "all" ? catalog : catalog.filter((item) => item.kind === category);
    return fuzzyFilter(inCategory, query);
  }, [catalog, category, query]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refreshPublicCatalog(); } finally { setRefreshing(false); }
  };

  return (
    <ScreenContainer className="px-5 pt-3" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#69c7e8" colors={["#69c7e8"]} />}>
      <View className="flex-row items-center justify-between">
        <View><Text className="text-xs font-semibold uppercase tracking-[3px] text-primary">MG FLÂSH</Text><Text className="mt-2 text-3xl font-bold tracking-tight text-foreground">Watch & listen</Text></View>
        <View className="flex-row items-center gap-4"><Pressable onPress={() => void handleRefresh()} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}><MaterialIcons name="refresh" size={25} color="#9ba1a6" /></Pressable><Pressable onPress={() => router.push("/(tabs)/settings")} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}><MaterialIcons name="tune" size={25} color="#9ba1a6" /></Pressable></View>
      </View>

      <View className="mt-6 flex-row items-center rounded-2xl border border-border bg-surface px-4"><MaterialIcons name="search" size={22} color="#7f8c9a" /><TextInput value={query} onChangeText={setQuery} placeholder="Search title, artist, or close match" placeholderTextColor="#71808c" className="ml-2 flex-1 py-4 text-base text-foreground" returnKeyType="search" />{query ? <Pressable onPress={() => setQuery("")} hitSlop={8}><MaterialIcons name="close" size={19} color="#7f8c9a" /></Pressable> : null}</View>

      <View className="mt-5 flex-row gap-2">
        {(["all", "video", "audio"] as const).map((option) => (
          <Pressable key={option} onPress={() => setCategory(option)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
            <View className={`flex-row items-center rounded-full px-4 py-2.5 ${category === option ? "bg-primary" : "border border-border bg-surface"}`}><MaterialIcons name={option === "video" ? "movie" : option === "audio" ? "music-note" : "apps"} size={16} color={category === option ? "#07131a" : "#7f8c9a"} /><Text className={`ml-1.5 text-xs font-bold capitalize ${category === option ? "text-[#07131a]" : "text-muted"}`}>{option === "all" ? "All" : option === "video" ? "Video" : "Music"}</Text></View>
          </Pressable>
        ))}
      </View>

      <View className="mt-6 flex-row items-center justify-between"><View><Text className="text-lg font-bold text-foreground">{category === "video" ? "Video" : category === "audio" ? "Music" : "Telegram catalog"}</Text><Text className="mt-1 text-sm text-muted">{filtered.length} {filtered.length === 1 ? "file" : "files"} · tap to play</Text></View><View className="flex-row items-center rounded-full border border-primary/40 px-3 py-2"><MaterialIcons name="telegram" size={16} color="#69c7e8" /><Text className="ml-1 text-xs font-semibold text-primary">Owner uploads</Text></View></View>

      {!hydrated ? <View className="flex-1 items-center justify-center"><ActivityIndicator color="#69c7e8" /></View> : filtered.length ? <View className="mt-5 flex-1">{filtered.slice(0, 10).map((item) => <MediaCard key={item.id} item={item} onPress={() => { playFromList(item.id, filtered.map((entry) => entry.id)); router.push(`/player/${item.id}`); }} onFavorite={() => void toggleFavorite(item.id)} onDownload={() => void downloadMedia(item.id)} />)}{filtered.length > 10 ? <Text className="mt-2 text-center text-xs text-muted">Showing the top 10 closest matches</Text> : null}</View> : <View className="mt-10 items-center rounded-3xl border border-dashed border-border bg-surface/70 px-7 py-10"><View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/15"><MaterialIcons name={category === "video" ? "movie" : category === "audio" ? "music-note" : "telegram"} size={32} color="#69c7e8" /></View><Text className="mt-5 text-center text-xl font-bold text-foreground">{query ? "No close matches yet" : "No Telegram files yet"}</Text><Text className="mt-2 text-center leading-6 text-muted">{query ? "Try fewer words or a different artist/title." : "The owner must post Video/Music files to the Telegram channel. Pull down to refresh after posting."}</Text></View>}
      </ScrollView>
      <MiniPlayer />
    </ScreenContainer>
  );
}
