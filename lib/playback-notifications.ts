import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let permissionRequested = false;

/**
 * Android 13+ requires POST_NOTIFICATIONS before the Expo Audio foreground
 * service can reliably show its media notification on the lock screen.
 */
export async function requestPlaybackNotificationPermission() {
  if (Platform.OS !== "android" || permissionRequested) return true;
  permissionRequested = true;

  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    // Audio playback should still work when a user declines notifications.
    return false;
  }
}
