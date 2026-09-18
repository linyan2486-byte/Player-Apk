import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { deleteAdminMedia, listAdminMedia, updateAdminMedia, type AdminMedia } from "@/lib/admin-api";

export default function AdminScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await listAdminMedia()); } catch (error) { Alert.alert("Admin panel", error instanceof Error ? error.message : "Unable to load catalog"); } finally { setLoading(false); }
  };
  useEffect(() => { if (user?.role === "admin") void load(); else setLoading(false); }, [user?.role]);

  if (user?.role !== "admin") return <ScreenContainer className="items-center justify-center px-6"><MaterialIcons name="lock" size={44} color="#69c7e8" /><Text className="mt-4 text-center text-xl font-bold text-foreground">Owner access required</Text><Text className="mt-2 text-center text-muted">Sign in with the owner account from Settings.</Text><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}><View className="mt-5 rounded-full bg-primary px-5 py-3"><Text className="font-bold text-[#07131a]">Back</Text></View></Pressable></ScreenContainer>;

  const save = async (item: AdminMedia, patch: Partial<Pick<AdminMedia, "title" | "artist" | "published">>) => {
    setSaving(item.publicId);
    try { await updateAdminMedia(item.publicId, patch); setItems((all) => all.map((entry) => entry.publicId === item.publicId ? { ...entry, ...patch } : entry)); } catch (error) { Alert.alert("Save failed", error instanceof Error ? error.message : "Try again"); } finally { setSaving(null); }
  };

  const remove = (item: AdminMedia) => Alert.alert("Delete media?", `${item.title} will disappear from the public catalog.`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { setSaving(item.publicId); try { await deleteAdminMedia(item.publicId); setItems((all) => all.filter((entry) => entry.publicId !== item.publicId)); } catch (error) { Alert.alert("Delete failed", error instanceof Error ? error.message : "Try again"); } finally { setSaving(null); } } }]);

  return <ScreenContainer className="px-5 pt-3" edges={["top", "left", "right"]}><View className="flex-row items-center justify-between"><View><Text className="text-3xl font-bold text-foreground">Admin panel</Text><Text className="mt-1 text-sm text-muted">Manage {items.length} published files</Text></View><Pressable onPress={() => router.back()}><MaterialIcons name="close" size={25} color="#617783" /></Pressable></View><ScrollView className="mt-5" contentContainerStyle={{ paddingBottom: 40 }}>{loading ? <ActivityIndicator color="#69c7e8" /> : items.length === 0 ? <View className="items-center rounded-2xl border border-dashed border-border p-8"><MaterialIcons name="cloud-upload" size={36} color="#69c7e8" /><Text className="mt-3 text-center text-muted">No uploads yet. Use Settings → Upload Video / Music.</Text></View> : items.map((item) => <View key={item.publicId} className="mb-3 rounded-2xl border border-border bg-surface p-4"><View className="flex-row items-center"><View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15"><MaterialIcons name={item.kind === "video" ? "movie" : "music-note"} size={21} color="#69c7e8" /></View><View className="ml-3 flex-1"><TextInput value={item.title} onChangeText={(title) => setItems((all) => all.map((entry) => entry.publicId === item.publicId ? { ...entry, title } : entry))} onBlur={() => void save(item, { title: item.title })} className="font-bold text-foreground" /><TextInput value={item.artist || ""} onChangeText={(artist) => setItems((all) => all.map((entry) => entry.publicId === item.publicId ? { ...entry, artist } : entry))} onBlur={() => void save(item, { artist: item.artist || "" })} placeholder="Artist" placeholderTextColor="#7f8c9a" className="mt-1 text-xs text-muted" /></View>{saving === item.publicId ? <ActivityIndicator color="#69c7e8" /> : null}</View><View className="mt-3 flex-row items-center justify-between"><Pressable onPress={() => void save(item, { published: item.published ? 0 : 1 })} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><View className={`flex-row items-center rounded-full px-3 py-2 ${item.published ? "bg-success/15" : "bg-warning/15"}`}><MaterialIcons name={item.published ? "visibility" : "visibility-off"} size={16} color={item.published ? "#199b62" : "#c88218"} /><Text className="ml-1 text-xs font-semibold text-foreground">{item.published ? "Published" : "Hidden"}</Text></View></Pressable><Pressable onPress={() => remove(item)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><MaterialIcons name="delete-outline" size={22} color="#dc4e66" /></Pressable></View></View>)}</ScrollView></ScreenContainer>;
}
