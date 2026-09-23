import { describe, expect, it } from "vitest";
import { fillTrend, pct, avg } from "@/lib/sticker-summary";

describe("fillTrend", () => {
  it("returns empty points when no rows (3-day range)", () => {
    const result = fillTrend("2026-09-18", "2026-09-21", []);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ date: "2026-09-18", total: 0, success: 0 });
    expect(result[1]).toEqual({ date: "2026-09-19", total: 0, success: 0 });
    expect(result[2]).toEqual({ date: "2026-09-20", total: 0, success: 0 });
  });

  it("accumulates rows within range", () => {
    const rows = [
      { d: "2026-09-19", ok: true },
      { d: "2026-09-19", ok: false },
      { d: "2026-09-20", ok: true },
    ];
    const result = fillTrend("2026-09-18", "2026-09-21", rows);
    expect(result[0]).toEqual({ date: "2026-09-18", total: 0, success: 0 });
    expect(result[1]).toEqual({ date: "2026-09-19", total: 2, success: 1 });
    expect(result[2]).toEqual({ date: "2026-09-20", total: 1, success: 1 });
  });

  it("ignores rows outside the range", () => {
    const rows = [
      { d: "2026-09-10", ok: true },
      { d: "2026-09-25", ok: false },
    ];
    const result = fillTrend("2026-09-18", "2026-09-21", rows);
    expect(result.every((p) => p.total === 0)).toBe(true);
  });

  it("returns [] when end equals start", () => {
    const result = fillTrend("2026-09-20", "2026-09-20", [{ d: "2026-09-20", ok: true }]);
    expect(result).toEqual([]);
  });
});

describe("pct", () => {
  it("returns 95 for 323/339", () => {
    expect(pct(323, 339)).toBe(95);
  });

  it("returns 0 when divisor is 0", () => {
    expect(pct(323, 0)).toBe(0);
    expect(pct(0, 0)).toBe(0);
  });

  it("returns 0 for 5/0", () => {
    expect(pct(5, 0)).toBe(0);
  });
});

describe("avg", () => {
  it("computes average ignoring null/undefined", () => {
    expect(avg([100, 200, null, undefined])).toBe(150);
  });

  it("returns null for empty array", () => {
    expect(avg([])).toBeNull();
  });

  it("returns null when all values are null", () => {
    expect(avg([null, undefined])).toBeNull();
  });
});
