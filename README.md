# Mg Flâsh Player APK

Expo/React Native player app for a Telegram-backed Video and Music catalog. The app reads published media from the server, separates Video and Music on the home screen, supports search and pull-to-refresh, and plays the selected queue with Previous/Next controls.

## Telegram channel workflow

1. Add the bot as an administrator of the source Telegram channel.
2. Configure the server with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_STORAGE_CHAT_ID`. The latter should identify the channel that publishes the media, using its numeric ID, username, or title.
3. Set `TELEGRAM_WEBHOOK_URL` to the public HTTPS endpoint ending in `/api/telegram/webhook`.
4. Set `TELEGRAM_WEBHOOK_SECRET` to a random secret and use the same value in the deployment environment.
5. Start or redeploy the server. On startup it registers the webhook with Telegram.
6. Publish an audio or video post in the channel. The webhook creates a catalog record and the app discovers it on startup, every 30 seconds, or when the user presses Refresh.

Use this caption format when posting media:

```text
Name: Song or video title
Artic: Artist name
```

`Title:` and `Artist:` are also accepted. A simple two-line caption is supported as well:

```text
Song or video title
Artist name
```

If no caption is supplied, Telegram's native audio title and performer metadata are used, followed by the file name and `Mg Flâsh` as fallbacks. Editing a channel caption updates the existing catalog item instead of creating a duplicate.

## App behavior

- **Video and Music sections:** the Home screen renders separate sections, with Video/Music filters for focused browsing.
- **Search:** searches title and artist with exact, prefix, substring, and fuzzy matching.
- **Refresh:** pull down on Home or press the refresh button to fetch the latest published catalog.
- **Queue playback:** opening an item creates a queue for its current section; Previous, Next, and automatic advance move through that queue.
- **Audio background playback:** audio continues when the app is backgrounded or the screen is locked. Expo Audio's lock-screen metadata includes title, artist, album, and artwork when available.
- **Media notification:** Android requests notification permission when playback starts so the Expo Audio media notification and lock-screen controls can appear. A user who declines notifications can still play audio, but system controls may not be visible.
- **Video:** video supports native full-screen and Picture-in-Picture where the platform allows it. Phone-lock background playback is intended for Music; video playback normally requires the display or Picture-in-Picture mode.
- **Offline library:** remote media can be downloaded from Home for durable on-device playback.

## Server and storage configuration

At minimum, configure:

```text
DATABASE_URL=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_API_BASE_URL=https://api.telegram.org
TELEGRAM_STORAGE_CHAT_ID=...
TELEGRAM_WEBHOOK_URL=https://your-domain.example/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=...
```

Use S3/R2 variables (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`) for non-Telegram uploads. The server keeps Telegram media behind `/manus-storage/telegram/<file_id>` and forwards HTTP range requests so video players can seek efficiently.

The official Telegram Bot API currently limits multipart uploads to 50 MB and file downloads through `getFile` to 20 MB. For larger media, run Telegram's local Bot API server or use a separate ingestion bridge that copies the file into S3/R2 before publishing it to the catalog.

When using a local Bot API server, set `TELEGRAM_API_BASE_URL` to that server's base URL. The server then permits the local Bot API's larger upload/download capability and uses the same endpoint for webhook registration.

## App API configuration

For a native build, set:

```text
EXPO_PUBLIC_API_BASE_URL=https://your-domain.example
```

Without this variable, native builds use the production URL defined in `constants/oauth.ts`; web development derives the API hostname from the Metro hostname.

## Development and verification

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm lint -- --no-fix
pnpm build
npx expo export --platform web
```

The API health endpoint is `GET /api/health`. Telegram webhook state is available at `GET /api/telegram/status`.

## Security

Never commit bot tokens, webhook secrets, database URLs, or storage credentials. The bot token shared during repository setup should be revoked and replaced in BotFather before deployment because it has been exposed in chat history. Keep all credentials in deployment secrets or an untracked local environment file.
