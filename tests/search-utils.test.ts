import { describe, expect, it } from "vitest";

import { fuzzyFilter } from "../lib/search-utils";

describe("fuzzy media search", () => {
  it("ranks a close title match above unrelated media", () => {
    const results = fuzzyFilter(
      [
        { title: "Random Night", artist: "A" },
        { title: "Shape of You", artist: "Ed Sheeran" },
        { title: "Shape of My Heart", artist: "B" },
      ],
      "Shape of",
    );
    expect(results[0].title).toBe("Shape of You");
    expect(results.map((item) => item.title)).toContain("Shape of My Heart");
  });
});
