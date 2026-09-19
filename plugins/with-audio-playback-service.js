const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

const AUDIO_SERVICE = "expo.modules.audio.service.AudioControlsService";

module.exports = function withAudioPlaybackService(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application =
      AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const services = application.service ?? [];
    const alreadyRegistered = services.some(
      (service) => service.$?.["android:name"] === AUDIO_SERVICE,
    );

    if (!alreadyRegistered) {
      services.push({
        $: {
          "android:name": AUDIO_SERVICE,
          "android:exported": "false",
          "android:foregroundServiceType": "mediaPlayback",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "androidx.media3.session.MediaSessionService",
                },
              },
            ],
          },
        ],
      });
    }

    application.service = services;
    return config;
  });
};
