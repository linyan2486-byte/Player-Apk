export type SearchableMedia = { title: string; artist: string };

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
  if (title === normalizedQuery) return 1000;
  if (title.startsWith(normalizedQuery))
    return 900 - Math.max(0, title.length - normalizedQuery.length);
  if (title.includes(normalizedQuery))
    return 800 - Math.max(0, title.length - normalizedQuery.length);

  const titleScore = subsequenceScore(
    normalizedQuery.replace(/ /g, ""),
    title.replace(/ /g, ""),
  );
  const artistScore = subsequenceScore(
    normalizedQuery.replace(/ /g, ""),
    artist.replace(/ /g, ""),
  );
  return Math.max(titleScore, artistScore - 20);
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
