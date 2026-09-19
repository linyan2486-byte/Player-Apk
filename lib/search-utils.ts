export type SearchableMedia = {
  title: string;
  artist: string;
  seriesTitle?: string;
  episodeNumber?: number;
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function subsequenceScore(query: string, target: string) {
  if (!query) return 0;
  let cursor = 0;
  let gaps = 0;
  for (const character of query) {
    const index = target.indexOf(character, cursor);
    if (index === -1) return -1;
    gaps += index - cursor;
    cursor = index + 1;
  }
  return Math.max(
    0,
    100 - gaps * 3 - Math.max(0, target.length - query.length),
  );
}

export function fuzzyScore(query: string, media: SearchableMedia) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;
  const title = normalize(media.title);
  const artist = normalize(media.artist);
  const series = normalize(media.seriesTitle || "");
  const episode = normalize(
    media.episodeNumber ? `episode ${media.episodeNumber}` : "",
  );
  const exactTargets = [title, series, episode];
  if (exactTargets.includes(normalizedQuery)) return 1000;
  if (exactTargets.some((target) => target.startsWith(normalizedQuery)))
    return 900;
  if (exactTargets.some((target) => target.includes(normalizedQuery)))
    return 800;

  const compactQuery = normalizedQuery.replace(/ /g, "");
  const titleScore = subsequenceScore(compactQuery, title.replace(/ /g, ""));
  const artistScore = subsequenceScore(compactQuery, artist.replace(/ /g, ""));
  const seriesScore = subsequenceScore(compactQuery, series.replace(/ /g, ""));
  const episodeScore = subsequenceScore(
    compactQuery,
    episode.replace(/ /g, ""),
  );
  return Math.max(
    titleScore,
    artistScore - 20,
    seriesScore - 5,
    episodeScore - 10,
  );
}

export function fuzzyFilter<T extends SearchableMedia>(
  items: T[],
  query: string,
) {
  if (!query.trim()) return items;
  return items
    .map((item, index) => ({ item, score: fuzzyScore(query, item), index }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
