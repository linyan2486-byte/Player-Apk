import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { usePlayer } from "@/lib/player-context";

export default function SettingsScreen() {
  const { library, importMedia } = usePlayer();
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      const count = await importMedia();
      if (count) Alert.alert("Imported", `${count} file${count === 1 ? "" : "s"} added to your offline library.`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScreenContainer className="px-5 pt-3" edges={["top", "left", "right"]}>
      <Text className="text-3xl font-bold text-foreground">Settings</Text>
      <Text className="mt-1 text-sm text-muted">Keep your listening experience under your control.</Text>

      <View className="mt-7 rounded-3xl border border-primary/30 bg-[#152633] p-5">
        <View className="flex-row items-center"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/20"><MaterialIcons name="offline-bolt" size={24} color="#69c7e8" /></View><View className="ml-3"><Text className="text-lg font-bold text-white">Offline-first storage</Text><Text className="mt-1 text-xs text-[#9bb2bf]">{library.length} local media files</Text></View></View>
        <Text className="mt-4 leading-6 text-[#c4d3db]">Media files live in the app&apos;s document storage and the catalog is versioned in local storage. Installing a newer APK does not clear them. Uninstalling the app or clearing app data will remove them.</Text>
      </View>

      <Pressable onPress={handleImport} disabled={importing} style={({ pressed }) => ({ opacity: pressed ? 0.7 : importing ? 0.5 : 1 })}>
        <View className="mt-5 flex-row items-center rounded-2xl border border-border bg-surface p-4"><View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">{importing ? <ActivityIndicator color="#69c7e8" /> : <MaterialIcons name="file-upload" size={22} color="#69c7e8" />}</View><View className="ml-3 flex-1"><Text className="font-semibold text-foreground">Import media files</Text><Text className="mt-1 text-xs text-muted">Choose multiple audio or video files from your device</Text></View><MaterialIcons name="chevron-right" size={22} color="#7f8c9a" /></View>
      </Pressable>

      <View className="mt-7">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-muted">Next release architecture</Text>
        <View className="mt-3 rounded-2xl border border-border bg-surface p-4"><Text className="font-semibold text-foreground">Public catalog & admin upload</Text><Text className="mt-2 leading-6 text-muted">To let other people download the same content, an API plus object storage is required. This local build is already structured to add that sync later without replacing the local library.</Text></View>
      </View>
      <View className="mt-4 flex-row items-center"><MaterialIcons name="info-outline" size={17} color="#7f8c9a" /><Text className="ml-2 text-xs text-muted">Player APK · local catalog v1</Text></View>
    </ScreenContainer>
  );
}
