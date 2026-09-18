import { describe, expect, it } from "vitest";

import { mergePublicCatalog } from "../lib/catalog-utils";

describe("public catalog merge", () => {
  it("keeps local media and preserves downloaded favorites", () => {
    const result = mergePublicCatalog(
      [
        { id: "local-1", title: "My file", artist: "Local", kind: "audio", localUri: "file://local", createdAt: 1, favorite: false },
        { id: "remote-r1", remoteId: "r1", title: "Old title", artist: "Artist", kind: "audio", localUri: "file://downloaded", createdAt: 2, favorite: true, offline: true },
      ],
      [
        { id: "r1", title: "New title", artist: "Artist", kind: "audio", url: "https://cdn.example/r1.mp3" },
        { id: "r2", title: "Video", artist: "Artist", kind: "video", url: "https://cdn.example/r2.mp4" },
      ],
    );
    expect(result.find((item) => item.id === "local-1")?.title).toBe("My file");
    expect(result.find((item) => item.remoteId === "r1")?.favorite).toBe(true);
    expect(result.find((item) => item.remoteId === "r2")?.offline).toBe(false);
  });
});
