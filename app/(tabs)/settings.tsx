import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View, ActivityIndicator } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { usePlayer } from "@/lib/player-context";
import { getApiBaseUrl } from "@/constants/oauth";

export default function SettingsScreen() {
  const { library, refreshPublicCatalog } = usePlayer();
  const [refreshing, setRefreshing] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const count = await refreshPublicCatalog();
      const message = count ? `${count} Video/Music file${count === 1 ? "" : "s"} found.` : "No published files yet.";
      setLastResult(message);
      Alert.alert("Catalog updated", message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot connect to the server.";
      setLastResult("Connection failed");
      Alert.alert("Catalog unavailable", `${message}\n\nPlease try again after Railway is redeployed.`);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScreenContainer className="px-5 pt-3" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-3xl font-bold text-foreground">Settings</Text>
        <Text className="mt-1 text-sm text-muted">Mg Flâsh catalog and offline playback</Text>

        <View className="mt-7 rounded-3xl border border-primary/30 bg-[#152633] p-5">
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/20">
              <MaterialIcons name="offline-bolt" size={24} color="#69c7e8" />
            </View>
            <View className="ml-3">
              <Text className="text-lg font-bold text-white">Offline playback</Text>
              <Text className="mt-1 text-xs text-[#9bb2bf]">{library.length} files on this device</Text>
            </View>
          </View>
          <Text className="mt-4 leading-6 text-[#c4d3db]">
            Downloaded Video/Music files are saved in the app&apos;s durable document storage. Installing a new APK does not delete them. Uninstalling the app or clearing app data will delete them.
          </Text>
        </View>

        <View className="mt-5 rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-center">
            <MaterialIcons name="telegram" size={22} color="#69c7e8" />
            <Text className="ml-2 font-semibold text-foreground">Telegram catalog</Text>
          </View>
          <Text className="mt-2 text-xs leading-5 text-muted">
            The owner posts Video/Music files to the private Telegram channel. Published files appear here automatically after the server webhook receives the post.
          </Text>
          <Text className="mt-3 text-xs text-muted">Server: {getApiBaseUrl()}</Text>
          {lastResult ? <Text className="mt-2 text-xs font-semibold text-primary">{lastResult}</Text> : null}
          <Pressable onPress={() => void handleRefresh()} disabled={refreshing} style={({ pressed }) => ({ opacity: pressed ? 0.7 : refreshing ? 0.5 : 1 })}>
            <View className="mt-4 flex-row items-center justify-center rounded-xl bg-primary py-3">
              {refreshing ? <ActivityIndicator color="#07131a" /> : <MaterialIcons name="refresh" size={18} color="#07131a" />}
              <Text className="ml-2 font-bold text-[#07131a]">{refreshing ? "Checking catalog…" : "Refresh Video / Music"}</Text>
            </View>
          </Pressable>
        </View>

        <View className="mt-6">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-muted">App information</Text>
          <View className="mt-3 rounded-2xl border border-border bg-surface p-4">
            <Text className="font-bold text-foreground">Mg Flâsh</Text>
            <Text className="mt-1 text-sm text-muted">Developer – Wai Lin Yan</Text>
            <Text className="mt-1 text-sm text-primary">Telegram – t.me/Cyberking24</Text>
            <Text className="mt-3 text-xs text-muted">Telegram catalog · Update-safe offline storage enabled</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
