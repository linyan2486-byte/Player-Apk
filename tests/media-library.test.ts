import { describe, expect, it } from "vitest";

import { formatBytes } from "../lib/media-utils";

describe("media library helpers", () => {
  it("formats local file sizes for the library cards", () => {
    expect(formatBytes()).toBe("Local file");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
