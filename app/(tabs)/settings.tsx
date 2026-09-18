import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { usePlayer } from "@/lib/player-context";

export default function SettingsScreen() {
  const { library, catalogUrl, importMedia, syncCatalog } = usePlayer();
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState(catalogUrl);

  const handleImport = async () => {
    setImporting(true);
    try {
      const count = await importMedia();
      if (count) Alert.alert("Imported", `${count} file${count === 1 ? "" : "s"} added to your offline library.`);
    } finally {
      setImporting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const count = await syncCatalog(remoteUrl);
      Alert.alert("Catalog synced", `${count} catalog item${count === 1 ? "" : "s"} are ready offline.`);
    } catch (error) {
      Alert.alert("Sync failed", error instanceof Error ? error.message : "Please check the catalog URL and try again.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScreenContainer className="px-5 pt-3" edges={["top", "left", "right"]}>
      <Text className="text-3xl font-bold text-foreground">Settings</Text>
      <Text className="mt-1 text-sm text-muted">Keep your listening experience under your control.</Text>

      <View className="mt-7 rounded-3xl border border-primary/30 bg-[#152633] p-5"><View className="flex-row items-center"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/20"><MaterialIcons name="offline-bolt" size={24} color="#69c7e8" /></View><View className="ml-3"><Text className="text-lg font-bold text-white">Offline-first storage</Text><Text className="mt-1 text-xs text-[#9bb2bf]">{library.length} local media files</Text></View></View><Text className="mt-4 leading-6 text-[#c4d3db]">Media files live in the app&apos;s document storage and the catalog is versioned in local storage. Installing a newer APK does not clear them. Uninstalling the app or clearing app data will remove them.</Text></View>

      <Pressable onPress={handleImport} disabled={importing} style={({ pressed }) => ({ opacity: pressed ? 0.7 : importing ? 0.5 : 1 })}><View className="mt-5 flex-row items-center rounded-2xl border border-border bg-surface p-4"><View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">{importing ? <ActivityIndicator color="#69c7e8" /> : <MaterialIcons name="file-upload" size={22} color="#69c7e8" />}</View><View className="ml-3 flex-1"><Text className="font-semibold text-foreground">Import media files</Text><Text className="mt-1 text-xs text-muted">Choose multiple audio or video files from your device</Text></View><MaterialIcons name="chevron-right" size={22} color="#7f8c9a" /></View></Pressable>

      <View className="mt-5 rounded-2xl border border-border bg-surface p-4"><View className="flex-row items-center"><MaterialIcons name="cloud-download" size={21} color="#69c7e8" /><Text className="ml-2 font-semibold text-foreground">Portable catalog source</Text></View><Text className="mt-2 leading-5 text-xs text-muted">Paste a public catalog.json URL from GitHub, Cloudflare R2, or another host. Downloaded files stay on this device, so changing hosting later will not delete them.</Text><TextInput value={remoteUrl} onChangeText={setRemoteUrl} placeholder="https://.../catalog.json" placeholderTextColor="#71808c" autoCapitalize="none" autoCorrect={false} className="mt-3 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /><Pressable onPress={handleSync} disabled={syncing || !remoteUrl.trim()} style={({ pressed }) => ({ opacity: pressed ? 0.7 : syncing || !remoteUrl.trim() ? 0.5 : 1 })}><View className="mt-3 flex-row items-center justify-center rounded-xl bg-primary py-3">{syncing ? <ActivityIndicator color="#07131a" /> : <MaterialIcons name="sync" size={18} color="#07131a" />}<Text className="ml-2 font-bold text-[#07131a]">{syncing ? "Syncing…" : "Sync catalog"}</Text></View></Pressable></View>

      <View className="mt-6"><Text className="text-xs font-semibold uppercase tracking-[2px] text-muted">App information</Text><View className="mt-3 rounded-2xl border border-border bg-surface p-4"><Text className="font-bold text-foreground">Mg Flâsh</Text><Text className="mt-1 text-sm text-muted">Developer – Wai Lin Yan</Text><Text className="mt-1 text-sm text-primary">Telegram – t.me/Cyberking24</Text><Text className="mt-3 text-xs text-muted">Local catalog v1 · Update-safe storage enabled</Text></View></View>
    </ScreenContainer>
  );
}
