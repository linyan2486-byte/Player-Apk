import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { formatBytes, MediaItem } from "@/lib/media-library";

export function MediaCard({
  item,
  onPress,
  onFavorite,
  onDownload,
  onDelete,
}: {
  item: MediaItem;
  onPress: () => void;
  onFavorite: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View className="mb-5 overflow-hidden rounded-2xl bg-surface">
        <View className="relative aspect-video w-full items-center justify-center bg-[#10232d]">
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              contentFit="cover"
              style={{ width: "100%", height: "100%" }}
              transition={180}
            />
          ) : (
            <MaterialIcons
              name={item.kind === "video" ? "movie" : "music-note"}
              size={48}
              color={item.kind === "video" ? "#69c7e8" : "#f7bd62"}
            />
          )}
          <View className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5">
            <Text className="text-[10px] font-bold text-white">
              {item.kind === "video" ? "VIDEO" : "MUSIC"}
            </Text>
          </View>
          <View className="absolute bottom-2 left-2 h-10 w-10 items-center justify-center rounded-full bg-black/70">
            <MaterialIcons name="play-arrow" size={25} color="white" />
          </View>
        </View>
        <View className="flex-row p-3">
          <View
            className={`mt-0.5 h-9 w-9 items-center justify-center rounded-full ${item.kind === "video" ? "bg-primary/20" : "bg-warning/15"}`}
          >
            <MaterialIcons
              name={item.kind === "video" ? "movie" : "music-note"}
              size={18}
              color={item.kind === "video" ? "#69c7e8" : "#f7bd62"}
            />
          </View>
          <View className="ml-3 flex-1">
            <Text
              className="text-[15px] font-bold leading-5 text-foreground"
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
              {item.artist} · {formatBytes(item.size)}
            </Text>
          </View>
          {item.remoteId && !item.offline && onDownload ? (
            <Pressable
              onPress={onDownload}
              hitSlop={10}
              accessibilityLabel={`Download ${item.title}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <MaterialIcons name="download" size={21} color="#69c7e8" />
            </Pressable>
          ) : null}
          {item.offline && onDelete ? (
            <Pressable
              onPress={onDelete}
              hitSlop={10}
              accessibilityLabel={`Delete ${item.title}`}
              style={({ pressed }) => ({
                opacity: pressed ? 0.5 : 1,
                marginLeft: 12,
              })}
            >
              <MaterialIcons name="delete-outline" size={22} color="#ff7187" />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onFavorite}
            hitSlop={10}
            accessibilityLabel={
              item.favorite ? "Remove favorite" : "Add favorite"
            }
            style={({ pressed }) => ({
              opacity: pressed ? 0.5 : 1,
              marginLeft: 12,
            })}
          >
            <MaterialIcons
              name={item.favorite ? "favorite" : "favorite-border"}
              size={22}
              color={item.favorite ? "#ff7187" : "#7f8c9a"}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
