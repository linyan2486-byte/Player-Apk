const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SERVICE = "node_modules/expo-audio/android/src/main/java/expo/modules/audio/service/AudioControlsService.kt";

module.exports = function withMediaQueueActions(config) {
  return withDangerousMod(config, ["android", async (config) => {
    const file = path.join(config.modRequest.projectRoot, SERVICE);
    if (!fs.existsSync(file)) return config;
    let source = fs.readFileSync(file, "utf8");
    if (source.includes("media-control/$action")) return config;
    source = source.replace(
      'import android.content.Intent\n',
      'import android.content.Intent\nimport android.net.Uri\n',
    );
    source = source.replace(
      '  private fun buildNotification(): Notification? {',
      `  private fun queueAction(action: String): PendingIntent? {
    val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    intent.action = Intent.ACTION_VIEW
    intent.data = Uri.parse("manus://media-control/$action")
    intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(
      this,
      action.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun buildNotification(): Notification? {`,
    );
    source = source.replace(
      '      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)\n',
      `      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
      .addAction(androidx.media3.session.R.drawable.media3_icon_skip_back, "Previous", queueAction("previous"))
      .addAction(androidx.media3.session.R.drawable.media3_icon_skip_forward, "Next", queueAction("next"))
`,
    );
    fs.writeFileSync(file, source);
    return config;
  }]);
};
