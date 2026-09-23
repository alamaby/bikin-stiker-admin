export type TrendPoint = { date: string; total: number; success: number };

export type ProviderCount = { name: string; value: number };

export type StickerSummaryData = {
  total: number;
  success: number;
  failed: number;
  pending: number;
  flagged: number;
  avgMs: number | null;
  totalCost: number;
  up: number;
  down: number;
  unrated: number;
  trend: TrendPoint[];
  providers: ProviderCount[];
};

export function fillTrend(startISO: string, endISO: string, rows: Array<{ d: string; ok: boolean }>): TrendPoint[] {
  if (endISO <= startISO) return [];
  const toLocalISO = (y: number, m: number, d: number): string => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  };
  const startParts = startISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const endParts = endISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!startParts || !endParts) return [];
  let curY = parseInt(startParts[1], 10);
  let curM = parseInt(startParts[2], 10) - 1;
  let curD = parseInt(startParts[3], 10);
  const endY = parseInt(endParts[1], 10);
  const endM = parseInt(endParts[2], 10) - 1;
  const endD = parseInt(endParts[3], 10);
  const points: TrendPoint[] = [];
  while (curY < endY || (curY === endY && curM < endM) || (curY === endY && curM === endM && curD < endD)) {
    points.push({ date: toLocalISO(curY, curM, curD), total: 0, success: 0 });
    const next = new Date(curY, curM, curD + 1);
    curY = next.getFullYear();
    curM = next.getMonth();
    curD = next.getDate();
  }
  for (const row of rows) {
    const idx = points.findIndex((p) => p.date === row.d);
    if (idx === -1) continue;
    points[idx].total += 1;
    if (row.ok) points[idx].success += 1;
  }
  return points;
}

export function pct(a: number, b: number): number {
  if (b <= 0) return 0;
  return Math.round((a / b) * 100);
}

export function avg(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((n): n is number => n != null && !Number.isNaN(n));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((s, n) => s + n, 0) / valid.length);
}
