import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { MediaCard } from "@/components/media-card";
import { MiniPlayer } from "@/components/mini-player";
import { ScreenContainer } from "@/components/screen-container";
import type { MediaItem } from "@/lib/media-library";
import { fuzzyFilter } from "@/lib/search-utils";
import { usePlayer } from "@/lib/player-context";

type Category = "all" | "video" | "audio";

export default function HomeScreen() {
  const {
    library,
    hydrated,
    playFromList,
    toggleFavorite,
    downloadMedia,
    refreshPublicCatalog,
  } = usePlayer();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);

  const filtered = useMemo(() => fuzzyFilter(library, query), [library, query]);
  const videoItems = useMemo(
    () => filtered.filter((item) => item.kind === "video"),
    [filtered],
  );
  const musicItems = useMemo(
    () => filtered.filter((item) => item.kind === "audio"),
    [filtered],
  );
  const visibleItems =
    category === "video"
      ? videoItems
      : category === "audio"
        ? musicItems
        : filtered;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshPublicCatalog();
    } finally {
      setRefreshing(false);
    }
  };

  const openItem = (item: MediaItem, queue: MediaItem[]) => {
    const contentType =
      item.contentType ?? (item.kind === "audio" ? "music" : "video");
    const matchingQueue = queue.filter(
      (entry) =>
        entry.kind === item.kind &&
        (entry.contentType ?? (entry.kind === "audio" ? "music" : "video")) ===
          contentType,
    );
    playFromList(
      item.id,
      matchingQueue.map((entry) => entry.id),
    );
    router.push(`/player/${item.id}`);
  };

  const renderMediaRows = (items: MediaItem[]) => {
    const groups = new Map<string, MediaItem[]>();
    items.forEach((item) => {
      if (item.seriesTitle) {
        groups.set(item.seriesTitle, [
          ...(groups.get(item.seriesTitle) || []),
          item,
        ]);
      }
    });
    const seriesNames = [...groups.keys()];
    const standalone = items.filter((item) => !item.seriesTitle);
    return [
      ...seriesNames.map((seriesName) => {
        const episodes = [...(groups.get(seriesName) || [])].sort(
          (a, b) =>
            (a.episodeNumber ?? Number.MAX_SAFE_INTEGER) -
              (b.episodeNumber ?? Number.MAX_SAFE_INTEGER) ||
            b.createdAt - a.createdAt,
        );
        const expanded = expandedSeries === seriesName;
        return (
          <View
            key={`series-${seriesName}`}
            className="mb-5 overflow-hidden rounded-2xl border border-primary/25 bg-surface"
          >
            <Pressable
              onPress={() => setExpandedSeries(expanded ? null : seriesName)}
              className="flex-row items-center px-4 py-4"
            >
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                <MaterialIcons name="playlist-play" size={28} color="#69c7e8" />
              </View>
              <View className="ml-3 flex-1">
                <Text
                  className="text-base font-bold text-foreground"
                  numberOfLines={1}
                >
                  {seriesName}
                </Text>
                <Text className="mt-1 text-xs text-muted">
                  {episodes.length} episodes · tap to open playlist
                </Text>
              </View>
              <MaterialIcons
                name={expanded ? "expand-less" : "expand-more"}
                size={25}
                color="#69c7e8"
              />
            </Pressable>
            {expanded ? (
              <View className="border-t border-border px-3 pt-3">
                {episodes.map((episode, index) => (
                  <Pressable
                    key={episode.id}
                    onPress={() => openItem(episode, episodes)}
                    className="mb-3 flex-row items-center rounded-xl bg-[#10232d] px-3 py-3"
                  >
                    <Text className="w-10 text-center text-sm font-bold text-primary">
                      {episode.episodeNumber ?? index + 1}
                    </Text>
                    <View className="ml-2 flex-1">
                      <Text
                        className="text-sm font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {episode.title}
                      </Text>
                      <Text className="mt-1 text-xs text-muted">
                        {episode.artist}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="play-circle-outline"
                      size={25}
                      color="#69c7e8"
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        );
      }),
      ...standalone
        .slice(0, 10)
        .map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            onPress={() => openItem(item, items)}
            onFavorite={() => void toggleFavorite(item.id)}
            onDownload={() => void downloadMedia(item.id)}
          />
        )),
    ];
  };

  const renderSection = (
    title: string,
    icon: "movie" | "music-note",
    items: MediaItem[],
    emptyText: string,
  ) => (
    <View className="mt-7" key={title}>
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View
            className={`h-9 w-9 items-center justify-center rounded-xl ${icon === "movie" ? "bg-primary/15" : "bg-warning/15"}`}
          >
            <MaterialIcons
              name={icon}
              size={19}
              color={icon === "movie" ? "#69c7e8" : "#f7bd62"}
            />
          </View>
          <View className="ml-3">
            <Text className="text-lg font-bold text-foreground">{title}</Text>
            <Text className="mt-0.5 text-xs text-muted">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Text>
          </View>
        </View>
        {items.length > 10 ? (
          <Text className="text-xs font-semibold text-primary">Top 10</Text>
        ) : null}
      </View>
      {items.length ? (
        title === "Video" ? (
          renderMediaRows(items)
        ) : (
          items
            .slice(0, 10)
            .map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onPress={() => openItem(item, items)}
                onFavorite={() => void toggleFavorite(item.id)}
                onDownload={() => void downloadMedia(item.id)}
              />
            ))
        )
      ) : (
        <View className="rounded-2xl border border-dashed border-border bg-surface/50 px-5 py-6">
          <Text className="text-center text-sm text-muted">{emptyText}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer className="px-5 pt-3" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#69c7e8"
            colors={["#69c7e8"]}
          />
        }
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-[3px] text-primary">
              MG FLÂSH
            </Text>
            <Text className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Watch & listen
            </Text>
          </View>
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() => void handleRefresh()}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <MaterialIcons name="refresh" size={25} color="#9ba1a6" />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/settings")}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <MaterialIcons name="tune" size={25} color="#9ba1a6" />
            </Pressable>
          </View>
        </View>

        <View className="mt-6 flex-row items-center rounded-2xl border border-border bg-surface px-4">
          <MaterialIcons name="search" size={22} color="#7f8c9a" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or artist"
            placeholderTextColor="#71808c"
            className="ml-2 flex-1 py-4 text-base text-foreground"
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <MaterialIcons name="close" size={19} color="#7f8c9a" />
            </Pressable>
          ) : null}
        </View>

        <View className="mt-5 flex-row gap-2">
          {(["all", "video", "audio"] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setCategory(option)}
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
            >
              <View
                className={`flex-row items-center rounded-full px-4 py-2.5 ${category === option ? "bg-primary" : "border border-border bg-surface"}`}
              >
                <MaterialIcons
                  name={
                    option === "video"
                      ? "movie"
                      : option === "audio"
                        ? "music-note"
                        : "apps"
                  }
                  size={16}
                  color={category === option ? "#07131a" : "#7f8c9a"}
                />
                <Text
                  className={`ml-1.5 text-xs font-bold capitalize ${category === option ? "text-[#07131a]" : "text-muted"}`}
                >
                  {option === "all"
                    ? "All"
                    : option === "video"
                      ? "Video"
                      : "Music"}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View className="mt-6 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-foreground">
              {category === "video"
                ? "Video"
                : category === "audio"
                  ? "Music"
                  : "Your catalog"}
            </Text>
            <Text className="mt-1 text-sm text-muted">
              {visibleItems.length}{" "}
              {visibleItems.length === 1 ? "file" : "files"} · tap to play
            </Text>
          </View>
          <View className="flex-row items-center rounded-full border border-primary/40 px-3 py-2">
            <MaterialIcons name="cloud" size={16} color="#69c7e8" />
            <Text className="ml-1 text-xs font-semibold text-primary">
              Telegram
            </Text>
          </View>
        </View>

        {!hydrated ? (
          <View className="flex-1 items-center justify-center py-16">
            <ActivityIndicator color="#69c7e8" />
          </View>
        ) : category === "all" ? (
          <>
            {renderSection(
              "Video",
              "movie",
              videoItems,
              query ? "No matching videos." : "Video uploads will appear here.",
            )}
            {renderSection(
              "Music",
              "music-note",
              musicItems,
              query ? "No matching music." : "Music uploads will appear here.",
            )}
          </>
        ) : (
          renderSection(
            category === "video" ? "Video" : "Music",
            category === "video" ? "movie" : "music-note",
            visibleItems,
            query
              ? "No close matches found."
              : `No ${category === "video" ? "video" : "music"} files yet.`,
          )
        )}
      </ScrollView>
      <MiniPlayer />
    </ScreenContainer>
  );
}
