import { describe, expect, it } from "vitest";
import {
  parseStickerParams,
  buildStickersUrl,
  resolveStickerStoragePath,
  formatDurationMs,
  ratingLabel,
  countActiveFilters,
  hasActiveFilters,
} from "@/lib/stickers";

describe("parseStickerParams", () => {
  it("returns defaults for empty params", () => {
    const result = parseStickerParams({});
    expect(result).toEqual({
      q: "",
      status: "all",
      provider: "all",
      model: "all",
      rating: "all",
      flagged: "all",
      date_from: "",
      date_to: "",
      sort: "created_at",
      order: "desc",
      page: 1,
    });
  });

  it("parses valid sort/order/page", () => {
    const result = parseStickerParams({ sort: "cost", order: "asc", page: "3" });
    expect(result.sort).toBe("cost");
    expect(result.order).toBe("asc");
    expect(result.page).toBe(3);
  });

  it("falls back sort and page on unknown/negative values", () => {
    const result = parseStickerParams({ sort: "hacked", page: "-2" });
    expect(result.sort).toBe("created_at");
    expect(result.page).toBe(1);
  });
});

describe("buildStickersUrl + resolveStickerStoragePath", () => {
  it("omits 'all' and empty values, preserves non-default keys", () => {
    const url = buildStickersUrl("id", { q: "cat", status: "all", page: 2 });
    expect(url).toBe("/id/stickers?q=cat&page=2");
  });

  it("resolves image_png_path priority over image_url", () => {
    const result = resolveStickerStoragePath({ image_png_path: "u1/a.png", image_url: "u1/a.webp" });
    expect(result).toEqual({ path: "u1/a.png", isAbsoluteUrl: false });
  });

  it("returns absolute URL unchanged when png_path is null", () => {
    const result = resolveStickerStoragePath({ image_png_path: null, image_url: "https://x/y.png" });
    expect(result).toEqual({ path: "https://x/y.png", isAbsoluteUrl: true });
  });

  it("strips 'stickers/' prefix from bucket paths", () => {
    const result = resolveStickerStoragePath({ image_png_path: null, image_url: "stickers/u1/a.png" });
    expect(result).toEqual({ path: "u1/a.png", isAbsoluteUrl: false });
  });

  it("returns null path for null inputs", () => {
    const result = resolveStickerStoragePath({ image_png_path: null, image_url: null });
    expect(result.path).toBeNull();
  });
});

describe("formatDurationMs + ratingLabel", () => {
  it("formats ms correctly for null/short/long", () => {
    expect(formatDurationMs(null)).toBe("—");
    expect(formatDurationMs(500)).toBe("500 ms");
    expect(formatDurationMs(16747)).toBe("16.7 s");
  });

  it("labels ratings correctly", () => {
    expect(ratingLabel(1)).toBe("up");
    expect(ratingLabel(-1)).toBe("down");
    expect(ratingLabel(null)).toBe("unrated");
  });
});

describe("countActiveFilters + hasActiveFilters", () => {
  const empty = { q: "", status: "all", provider: "all", model: "all", rating: "all", flagged: "all", date_from: "", date_to: "" };

  it("returns 0 for all defaults", () => {
    expect(countActiveFilters(empty)).toBe(0);
  });

  it("counts q and status as 2 active", () => {
    expect(countActiveFilters({ ...empty, q: "cat", status: "success" })).toBe(2);
  });

  it("does not count model when value is 'all'", () => {
    expect(countActiveFilters({ ...empty, model: "all" })).toBe(0);
  });

  it("returns true/false for hasActiveFilters", () => {
    expect(hasActiveFilters(empty)).toBe(false);
    expect(hasActiveFilters({ ...empty, q: "x" })).toBe(true);
  });
});
