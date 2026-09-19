export type ParsedMediaMetadata = {
  title: string;
  artist: string;
};

type ParseMediaMetadataOptions = {
  caption?: string;
  fallbackTitle?: string;
  fallbackArtist?: string;
  defaultArtist?: string;
};

const TITLE_LABEL = /^(?:name|title|song|video)\s*[:=-]\s*(.+)$/i;
const ARTIST_LABEL = /^(?:artic|artist|performer|singer|by)\s*[:=-]\s*(.+)$/i;

function clean(value: string | undefined, fallback: string, limit = 255) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

/**
 * Caption convention supported by the Telegram channel:
 *
 *   Name: Song title
 *   Artic: Artist name
 *
 * A simple two-line caption (`Song title` / `Artist name`) is also accepted.
 * Telegram's native audio title/performer metadata remains the fallback.
 */
export function parseMediaMetadata({
  caption,
  fallbackTitle,
  fallbackArtist,
  defaultArtist = "Mg Flâsh",
}: ParseMediaMetadataOptions): ParsedMediaMetadata {
  const lines = (caption || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const labeledTitle = lines
    .find((line) => TITLE_LABEL.test(line))
    ?.match(TITLE_LABEL)?.[1];
  const labeledArtist = lines
    .find((line) => ARTIST_LABEL.test(line))
    ?.match(ARTIST_LABEL)?.[1];
  const plainLines = lines.filter(
    (line) => !TITLE_LABEL.test(line) && !ARTIST_LABEL.test(line),
  );

  const title = clean(
    labeledTitle || plainLines[0],
    fallbackTitle || "Untitled",
  );
  const artist = clean(
    labeledArtist || plainLines[1] || fallbackArtist,
    defaultArtist,
  );

  return { title, artist };
}
