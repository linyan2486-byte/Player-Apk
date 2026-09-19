export type ParsedMediaMetadata = {
  title: string;
  artist: string;
  seriesTitle?: string;
  episodeNumber?: number;
};

type ParseMediaMetadataOptions = {
  caption?: string;
  fallbackTitle?: string;
  fallbackArtist?: string;
  defaultArtist?: string;
};

const TITLE_LABEL =
  /^(?:name|title|song|video|episode\s*name)\s*[:=-]\s*(.+)$/i;
const ARTIST_LABEL = /^(?:artic|artist|performer|singer|by)\s*[:=-]\s*(.+)$/i;
const SERIES_LABEL = /^(?:series|ဇာတ်လမ်းတွဲ|ဇာတ်လမ်း)\s*[:=-]\s*(.+)$/i;
const EPISODE_LABEL = /^(?:episode|ep|အပိုင်း|အတွဲ)\s*[:#=-]?\s*(\d+)/i;

function clean(value: string | undefined, fallback: string, limit = 255) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

/**
 * Caption convention:
 *
 *   Series: My Drama
 *   Episode: 1
 *   Name: The Beginning
 *   Artic: Actor / Artist
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
  const labeledSeries = lines
    .find((line) => SERIES_LABEL.test(line))
    ?.match(SERIES_LABEL)?.[1];
  const labeledEpisode = lines
    .find((line) => EPISODE_LABEL.test(line))
    ?.match(EPISODE_LABEL)?.[1];
  const plainLines = lines.filter(
    (line) =>
      !TITLE_LABEL.test(line) &&
      !ARTIST_LABEL.test(line) &&
      !SERIES_LABEL.test(line) &&
      !EPISODE_LABEL.test(line),
  );

  const title = clean(
    labeledTitle || plainLines[0],
    fallbackTitle || "Untitled",
  );
  const artist = clean(
    labeledArtist || plainLines[1] || fallbackArtist,
    defaultArtist,
  );
  const episodeNumber = labeledEpisode ? Number(labeledEpisode) : undefined;
  const seriesTitle = labeledSeries ? clean(labeledSeries, "") : undefined;

  return {
    title,
    artist,
    ...(seriesTitle ? { seriesTitle } : {}),
    ...(episodeNumber && Number.isFinite(episodeNumber)
      ? { episodeNumber }
      : {}),
  };
}
