import { buildLocaleHref } from "./locale-href";

export const STICKER_SORT_FIELDS = ["created_at", "generation_duration_ms", "cost"] as const;
export type StickerSortField = (typeof STICKER_SORT_FIELDS)[number];

export type StickerFilters = {
  q: string;
  status: string;
  provider: string;
  model: string;
  rating: string;
  flagged: string;
  date_from: string;
  date_to: string;
  sort: StickerSortField;
  order: "asc" | "desc";
  page: number;
};

export function parseStickerParams(sp: Record<string, string | undefined>): StickerFilters {
  const rawSort = sp.sort ?? "";
  const sort: StickerSortField = STICKER_SORT_FIELDS.includes(rawSort as StickerSortField) ? (rawSort as StickerSortField) : "created_at";
  const order: "asc" | "desc" = sp.order === "asc" ? "asc" : "desc";
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  return {
    q: sp.q ?? "",
    status: sp.status ?? "all",
    provider: sp.provider ?? "all",
    model: sp.model ?? "all",
    rating: sp.rating ?? "all",
    flagged: sp.flagged ?? "all",
    date_from: sp.date_from ?? "",
    date_to: sp.date_to ?? "",
    sort,
    order,
    page: pageNum,
  };
}

export function buildStickersUrl(locale: string, params: StickerFilters | Partial<StickerFilters & { page: number | string }>) {
  const usp = new URLSearchParams();
  const entries: [string, string][] = Object.entries(params)
    .filter(([, v]) => v && String(v).trim() !== "" && v !== "all")
    .map(([k, v]) => [k, String(v)]);
  entries.forEach(([k, v]) => usp.set(k, v));
  const qs = usp.toString();
  return `${buildLocaleHref(locale, "/stickers")}${qs ? `?${qs}` : ""}`;
}

export type ResolvePathResult = { path: string | null; isAbsoluteUrl: boolean };

export function resolveStickerStoragePath(row: { image_png_path: string | null; image_url: string | null }): ResolvePathResult {
  const raw = row.image_png_path || row.image_url || null;
  if (!raw) return { path: null, isAbsoluteUrl: false };
  if (/^https?:\/\//.test(raw)) return { path: raw, isAbsoluteUrl: true };
  let p = raw;
  if (p.startsWith("stickers/")) p = p.slice("stickers/".length);
  if (p.startsWith("/")) p = p.slice(1);
  return { path: p, isAbsoluteUrl: false };
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function ratingLabel(rating: number | null | undefined): string {
  if (rating === 1) return "up";
  if (rating === -1) return "down";
  return "unrated";
}

export type ProviderModelMap = Record<string, string[]>;

export function countActiveFilters(f: {
  q: string;
  status: string;
  provider: string;
  model: string;
  rating: string;
  flagged: string;
  date_from: string;
  date_to: string;
}): number {
  let n = 0;
  if (f.q !== "") n += 1;
  if (f.status !== "all") n += 1;
  if (f.provider !== "all") n += 1;
  if (f.rating !== "all") n += 1;
  if (f.flagged !== "all") n += 1;
  if (f.model !== "" && f.model !== "all") n += 1;
  if (f.date_from !== "") n += 1;
  if (f.date_to !== "") n += 1;
  return n;
}

export function hasActiveFilters(f: {
  q: string;
  status: string;
  provider: string;
  model: string;
  rating: string;
  flagged: string;
  date_from: string;
  date_to: string;
}): boolean {
  return countActiveFilters(f) > 0;
}
