import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { MediaCard } from "@/components/media-card";
import { MiniPlayer } from "@/components/mini-player";
import { ScreenContainer } from "@/components/screen-container";
import { usePlayer } from "@/lib/player-context";

export default function HomeScreen() {
  const { library, hydrated, playFromList, importMedia, toggleFavorite } = usePlayer();
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return library.filter((item) => !normalized || `${item.title} ${item.artist}`.toLowerCase().includes(normalized));
  }, [library, query]);

  const handleImport = async () => {
    setImporting(true);
    try {
      await importMedia();
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScreenContainer className="px-5 pt-3" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-primary">PLAYER APK</Text>
          <Text className="mt-2 text-3xl font-bold tracking-tight text-foreground">Your offline mix</Text>
        </View>
        <Pressable onPress={() => router.push("/(tabs)/settings")} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <MaterialIcons name="tune" size={25} color="#9ba1a6" />
        </Pressable>
      </View>

      <View className="mt-6 flex-row items-center rounded-2xl border border-border bg-surface px-4">
        <MaterialIcons name="search" size={22} color="#7f8c9a" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your library"
          placeholderTextColor="#71808c"
          className="ml-2 flex-1 py-4 text-base text-foreground"
          returnKeyType="search"
        />
        {query ? <Pressable onPress={() => setQuery("")} hitSlop={8}><MaterialIcons name="close" size={19} color="#7f8c9a" /></Pressable> : null}
      </View>

      <View className="mt-6 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-bold text-foreground">Library</Text>
          <Text className="mt-1 text-sm text-muted">{library.length} offline {library.length === 1 ? "file" : "files"}</Text>
        </View>
        <Pressable onPress={handleImport} disabled={importing} style={({ pressed }) => ({ opacity: pressed ? 0.68 : importing ? 0.55 : 1 })}>
          <View className="flex-row items-center rounded-full bg-primary px-4 py-2.5">
            {importing ? <ActivityIndicator size="small" color="#07131a" /> : <MaterialIcons name="add" size={18} color="#07131a" />}
            <Text className="ml-1.5 font-bold text-[#07131a]">Import</Text>
          </View>
        </Pressable>
      </View>

      {!hydrated ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#69c7e8" /></View>
      ) : filtered.length ? (
        <View className="mt-5 flex-1">
          {filtered.slice(0, 8).map((item) => (
            <MediaCard key={item.id} item={item} onPress={() => playFromList(item.id, filtered.map((entry) => entry.id))} onFavorite={() => void toggleFavorite(item.id)} />
          ))}
          {filtered.length > 8 ? <Text className="mt-2 text-center text-xs text-muted">Showing the first 8 matches · open Library for all</Text> : null}
        </View>
      ) : (
        <View className="mt-12 items-center rounded-3xl border border-dashed border-border bg-surface/70 px-7 py-10">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/15"><MaterialIcons name="library-music" size={32} color="#69c7e8" /></View>
          <Text className="mt-5 text-center text-xl font-bold text-foreground">Start your library</Text>
          <Text className="mt-2 text-center leading-6 text-muted">Import MP3, M4A, MP4 or other local media. Files stay inside the app and remain after app updates.</Text>
          <Pressable onPress={handleImport} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <View className="mt-6 rounded-full bg-primary px-5 py-3"><Text className="font-bold text-[#07131a]">Choose media</Text></View>
          </Pressable>
        </View>
      )}
      <MiniPlayer />
    </ScreenContainer>
  );
}
