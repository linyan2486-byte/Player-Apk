import { describe, expect, it } from "vitest";

import { parseMediaMetadata } from "../shared/media-metadata";

describe("Telegram media metadata", () => {
  it("parses the requested Name and Artic labels", () => {
    expect(
      parseMediaMetadata({
        caption: "Name: Night Drive\nArtic: Mg Flâsh",
        fallbackTitle: "file-name",
      }),
    ).toEqual({ title: "Night Drive", artist: "Mg Flâsh" });
  });

  it("accepts a simple title and artist on separate lines", () => {
    expect(
      parseMediaMetadata({
        caption: "Summer Rain\nAye Chan",
        fallbackTitle: "file-name",
      }),
    ).toEqual({ title: "Summer Rain", artist: "Aye Chan" });
  });

  it("parses series and episode labels for playlist grouping", () => {
    expect(
      parseMediaMetadata({
        caption:
          "Series: My Drama\nEpisode: 12\nName: The Final Door\nArtic: Main Cast",
        fallbackTitle: "file-name",
      }),
    ).toEqual({
      title: "The Final Door",
      artist: "Main Cast",
      seriesTitle: "My Drama",
      episodeNumber: 12,
    });
  });

  it("falls back to Telegram audio metadata and a default artist", () => {
    expect(
      parseMediaMetadata({
        caption: "",
        fallbackTitle: "audio-file",
        fallbackArtist: "Telegram performer",
      }),
    ).toEqual({ title: "audio-file", artist: "Telegram performer" });
    expect(
      parseMediaMetadata({ caption: "Video name", fallbackTitle: "file" }),
    ).toEqual({ title: "Video name", artist: "Mg Flâsh" });
  });
});
