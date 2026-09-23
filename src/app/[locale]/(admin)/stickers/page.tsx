import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import TailBadge from "@/components/ui/badge/TailBadge";
import Pagination from "@/components/tables/Pagination";
import { PromptCell } from "@/app/[locale]/(admin)/llm-logs/_components/prompt-cell";
import { StickerThumb, DownloadStickerButton } from "./_components/sticker-thumb";
import { FlagButton } from "./_components/flag-button";
import { StickerFilterBar } from "./_components/sticker-filter-bar";
import {
  tableWrap,
  tableScroll,
  tableHeadRow,
  tableBody,
  thCell,
  tdCell,
  tdSub,
  toolbarBtn,
  sortLink,
} from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";
import { parseStickerParams, buildStickersUrl, resolveStickerStoragePath, formatDurationMs, hasActiveFilters } from "@/lib/stickers";
import { fillTrend, type StickerSummaryData } from "@/lib/sticker-summary";
import { StickerSummary } from "./_components/sticker-summary";

export const dynamic = "force-dynamic";

const PER_PAGE = 15;

type RowData = {
  id: string;
  user_id: string;
  preset_name: string | null;
  user_prompt: string | null;
  final_prompt: string | null;
  negative_prompt: string | null;
  image_url: string | null;
  image_png_path: string | null;
  provider_name: string | null;
  model_name: string | null;
  provider_config_id: string | null;
  cost: number | null;
  status: string;
  is_flagged: boolean;
  flagged_at: string | null;
  flag_reason: string | null;
  created_at: string;
  completed_at: string | null;
  generation_duration_ms: number | null;
  signedUrl: string | null;
  lastAttemptLatency: number | null;
  rating: number | null;
  reason_tags: string[] | null;
};

async function getStickers(filters: ReturnType<typeof parseStickerParams>) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const ascending = filters.order === "asc";
  const from = (filters.page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const columns = "id,user_id,preset_name,user_prompt,final_prompt,image_url,image_png_path,provider_name,model_name,provider_config_id,cost,status,is_flagged,flagged_at,flag_reason,created_at,completed_at,generation_duration_ms";

  let q = supabase.from("sticker_generations").select(columns, { count: "exact" }).order(filters.sort, { ascending, nullsFirst: true }).range(from, to);

  if (filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.provider !== "all") q = q.eq("provider_name", filters.provider);
  if (filters.model !== "all") q = q.eq("model_name", filters.model);
  if (filters.flagged === "flagged") q = q.eq("is_flagged", true);
  if (filters.flagged === "clean") q = q.eq("is_flagged", false);
  if (filters.date_from) {
    const d = new Date(filters.date_from);
    if (!isNaN(d.getTime())) q = q.gte("created_at", d.toISOString());
  }
  if (filters.date_to) {
    const d = new Date(filters.date_to);
    d.setDate(d.getDate() + 1);
    if (!isNaN(d.getTime())) q = q.lt("created_at", d.toISOString());
  }
  if (filters.q) {
    const escaped = filters.q.replace(/[,()]/g, "");
    const term = `%${escaped}%`;
    q = q.or(`user_prompt.ilike.${term},final_prompt.ilike.${term},preset_name.ilike.${term},provider_name.ilike.${term},model_name.ilike.${term}`);
  }

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const ids = rows.map((r) => r.id as string);

  const feedbackMap = new Map<string, { rating: number; reason_tags: string[]; note: string }>();
  const attemptMap = new Map<string, number>();
  if (ids.length > 0) {
    const [{ data: fb }, { data: att }] = await Promise.all([
      supabase.from("sticker_generation_feedback").select("sticker_generation_id,rating,reason_tags,note").in("sticker_generation_id", ids),
      supabase.from("image_generation_attempt_logs").select("sticker_generation_id,latency_ms,attempt_index").in("sticker_generation_id", ids),
    ]);
    fb?.forEach((f) => {
      feedbackMap.set(f.sticker_generation_id, { rating: f.rating, reason_tags: (f.reason_tags as string[]) ?? [], note: f.note ?? "" });
    });
    att?.forEach((a) => {
      const cur = attemptMap.get(a.sticker_generation_id);
      if (cur == null || (a.attempt_index as number) >= cur) attemptMap.set(a.sticker_generation_id, a.attempt_index as number);
    });
  }

  const signedUrls = new Map<string, string | null>();
  await Promise.all(
    rows.map(async (r) => {
      const resolved = resolveStickerStoragePath({ image_png_path: r.image_png_path as string | null, image_url: r.image_url as string | null });
      if (!resolved.path || resolved.isAbsoluteUrl) {
        signedUrls.set(r.id as string, resolved.path);
        return;
      }
      try {
        const { data: sd } = await supabase.storage.from("stickers").createSignedUrl(resolved.path, 60);
        signedUrls.set(r.id as string, sd?.signedUrl ?? null);
      } catch {
        signedUrls.set(r.id as string, null);
      }
    }),
  );

  const enriched: RowData[] = rows.map((r) => {
    const rid = r.id as string;
    const fb = feedbackMap.get(rid);
    return {
      id: rid,
      user_id: r.user_id as string,
      preset_name: (r.preset_name as string) ?? null,
      user_prompt: (r.user_prompt as string) ?? null,
      final_prompt: (r.final_prompt as string) ?? null,
      negative_prompt: (r.negative_prompt as string) ?? null,
      image_url: (r.image_url as string) ?? null,
      image_png_path: (r.image_png_path as string) ?? null,
      provider_name: (r.provider_name as string) ?? null,
      model_name: (r.model_name as string) ?? null,
      provider_config_id: (r.provider_config_id as string) ?? null,
      cost: r.cost as number | null,
      status: r.status as string,
      is_flagged: r.is_flagged as boolean,
      flagged_at: r.flagged_at as string | null,
      flag_reason: r.flag_reason as string | null,
      created_at: r.created_at as string,
      completed_at: r.completed_at as string | null,
      generation_duration_ms: r.generation_duration_ms as number | null,
      signedUrl: signedUrls.get(rid) ?? null,
      lastAttemptLatency: attemptMap.has(rid) ? null : null,
      rating: fb?.rating ?? null,
      reason_tags: fb?.reason_tags ?? null,
    };
  });

  const ratingFiltered = enriched.filter((r) => {
    if (filters.rating === "all") return true;
    if (filters.rating === "up") return r.rating === 1;
    if (filters.rating === "down") return r.rating === -1;
    if (filters.rating === "unrated") return r.rating == null;
    return true;
  });

  return { data: ratingFiltered, total: count ?? 0, totalPages: Math.max(1, Math.ceil(count! / PER_PAGE)) };
}

async function getProviderModelMap(): Promise<Record<string, string[]>> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return {};
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const [{ data: genData, error: genErr }, { data: cfgData, error: cfgErr }] = await Promise.all([
    supabase.from("sticker_generations").select("provider_name,model_name").limit(2000),
    supabase.from("image_generation_configs").select("provider_name,model_name").eq("is_active", true).eq("route_scope", "default"),
  ]);
  if (genErr) throw new Error(genErr.message);
  if (cfgErr) throw new Error(cfgErr.message);

  const map: Record<string, Set<string>> = {};
  const add = (provider: string | null, model: string | null) => {
    if (!provider || !model) return;
    if (!map[provider]) map[provider] = new Set();
    map[provider].add(model);
  };
  (genData ?? []).forEach((r) => add(r.provider_name as string | null, r.model_name as string | null));
  (cfgData ?? []).forEach((r) => add(r.provider_name as string | null, r.model_name as string | null));
  const result: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(map)) result[k] = Array.from(v).sort();
  return result;
}

// keep in sync with getStickers (S5) — omits rating and order/range
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFilterQuery(supabase: any, filters: ReturnType<typeof parseStickerParams>) {
  let q = supabase.from("sticker_generations");
  if (filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.provider !== "all") q = q.eq("provider_name", filters.provider);
  if (filters.model !== "all") q = q.eq("model_name", filters.model);
  if (filters.flagged === "flagged") q = q.eq("is_flagged", true);
  if (filters.flagged === "clean") q = q.eq("is_flagged", false);
  if (filters.date_from) {
    const d = new Date(filters.date_from);
    if (!isNaN(d.getTime())) q = q.gte("created_at", d.toISOString());
  }
  if (filters.date_to) {
    const d = new Date(filters.date_to);
    d.setDate(d.getDate() + 1);
    if (!isNaN(d.getTime())) q = q.lt("created_at", d.toISOString());
  }
  if (filters.q) {
    const escaped = filters.q.replace(/[,()]/g, "");
    const term = `%${escaped}%`;
    q = q.or(`user_prompt.ilike.${term},final_prompt.ilike.${term},preset_name.ilike.${term},provider_name.ilike.${term},model_name.ilike.${term}`);
  }
  return q;
}

async function getStickerSummary(filters: ReturnType<typeof parseStickerParams>): Promise<StickerSummaryData | null> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const fqb = () => buildFilterQuery(supabase, filters);

  // batch-1: counts
  const [{ count: total }, { count: successCount }, { count: failedCount }, { count: pendingCount }, { count: flaggedCount }] = await Promise.all([
    fqb().select("*", { count: "exact", head: true }),
    fqb().select("*", { count: "exact", head: true }).eq("status", "success"),
    fqb().select("*", { count: "exact", head: true }).eq("status", "failed"),
    fqb().select("*", { count: "exact", head: true }).eq("status", "pending"),
    fqb().select("*", { count: "exact", head: true }).eq("is_flagged", true),
  ]);

  // Determine trend date range
  const today = new Date();
  const endUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  let startISO = "";
  let endISO = endUTC.toISOString().slice(0, 10);
  const df = filters.date_from ? new Date(filters.date_from) : null;
  const dt = filters.date_to ? new Date(filters.date_to) : null;
  if (df && dt && !isNaN(df.getTime()) && !isNaN(dt.getTime()) && dt >= df && (dt.getTime() - df.getTime()) / 86400000 <= 62) {
    startISO = filters.date_from;
    endISO = (() => { const d = new Date(dt); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  } else {
    startISO = endUTC.toISOString().slice(0, 10);
    startISO = new Date(endUTC.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  }
  if (!startISO || !endISO || endISO <= startISO) {
    endISO = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    startISO = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  }

  // batch-2: sample rows + ids for feedback
  const [{ data: sample, error: sampleErr }] = await Promise.all([
    fqb().select("id,generation_duration_ms,cost,provider_name,created_at,status").gte("created_at", startISO + "T00:00:00Z").lt("created_at", endISO + "T00:00:00Z").order("created_at", { ascending: true }).limit(2000),
    fqb().select("id").limit(2000),
  ]);
  if (sampleErr) throw new Error(sampleErr.message);

  // TODO(RPC): ganti agregat sample dengan RPC bila rows > 2000
  const durations = ((sample ?? []) as Array<{ generation_duration_ms: number | null }>).map((r) => r.generation_duration_ms).filter((n): n is number => n != null);
  const { avg } = await import("@/lib/sticker-summary");
  const totalCost = ((sample ?? []) as Array<{ cost: number | null }>).reduce((s, r) => s + (typeof r.cost === "number" ? r.cost : 0), 0);

  const providerMap: Record<string, number> = {};
  ((sample ?? []) as Array<{ provider_name: string | null }>).forEach((r) => {
    const p = r.provider_name || "unknown";
    providerMap[p] = (providerMap[p] ?? 0) + 1;
  });
  const providers = Object.entries(providerMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const trend = fillTrend(startISO, endISO, ((sample ?? []) as Array<{ created_at: string; status: string }>).map((r) => ({ d: r.created_at.slice(0, 10), ok: r.status === "success" })));

  const ids = ((sample ?? []) as Array<{ id: string }>).map((r) => r.id);
  let up = 0, down = 0;
  if (ids.length === 0) {
    // no rows — unrated will account for all
  } else {
    const [{ data: fb, error: fbErr }] = await Promise.all([
      supabase.from("sticker_generation_feedback").select("rating").in("sticker_generation_id", ids),
    ]);
    if (fbErr) throw new Error(fbErr.message);
    ((fb ?? []) as Array<{ rating: number | null }>).forEach((f) => {
      if (f.rating === 1) up += 1;
      if (f.rating === -1) down += 1;
    });
  }
  const unrated = Math.max(0, (total ?? 0) - up - down);

  return {
    total: total ?? 0,
    success: successCount ?? 0,
    failed: failedCount ?? 0,
    pending: pendingCount ?? 0,
    flagged: flaggedCount ?? 0,
    avgMs: avg(durations),
    totalCost,
    up,
    down,
    unrated,
    trend,
    providers,
  };
}

export default async function StickersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const filters = parseStickerParams(sp);
  const t = await getTranslations({ locale, namespace: "stickers" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const tf = await getTranslations({ locale, namespace: "filters" });

  const [result, modelMap, summary] = await Promise.all([getStickers(filters), getProviderModelMap(), getStickerSummary(filters)]);

  const preserve = (overrides: Partial<ReturnType<typeof parseStickerParams>>) =>
    buildStickersUrl(locale, { ...filters, ...overrides });

  const toggleOrder = filters.order === "asc" ? "desc" : "asc";

  return (
    <div>
      <div className="mb-6">
        <PageBreadcrumb pageTitle={t("title")} homeHref={buildLocaleHref(locale, "/")} homeLabel={tc("home")} />
        <p className="-mt-4 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
      </div>

      <div className="mb-4">
        <StickerSummary data={summary} locale={locale} />
      </div>
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <StickerFilterBar locale={locale} initial={{ q: filters.q, status: filters.status, provider: filters.provider, model: filters.model, rating: filters.rating, flagged: filters.flagged, date_from: filters.date_from, date_to: filters.date_to }} modelMap={modelMap} defaultOpen={hasActiveFilters(filters)} />
      </div>
      {result && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
            {result.total} {t("total")} · {tf("page")} {filters.page}/{result.totalPages}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={buildStickersUrl(locale, { ...filters, sort: "created_at", order: filters.sort === "created_at" ? toggleOrder : "desc", page: 1 })} className={toolbarBtn(filters.sort === "created_at")}>
              {t("created")} <ArrowUpDown className="size-3.5" />
            </Link>
            <Link href={buildStickersUrl(locale, { ...filters, sort: "generation_duration_ms", order: toggleOrder, page: 1 })} className={toolbarBtn(filters.sort === "generation_duration_ms")}>
              {t("performance")}
            </Link>
            <Link href={buildStickersUrl(locale, { ...filters, sort: "cost", order: toggleOrder, page: 1 })} className={toolbarBtn(filters.sort === "cost")}>
              {t("cost")}
            </Link>
            <Link href={buildStickersUrl(locale, { ...filters, sort: filters.sort, order: toggleOrder, page: 1 })} className={toolbarBtn(false)}>
              {filters.order === "asc" ? "↑ asc" : "↓ desc"}
            </Link>
          </div>
        </div>
      )}

      {!result ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Supabase env not configured.
        </div>
      ) : result.data.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          {t("noMatch")}
        </div>
      ) : (
        <>
          <div className={tableWrap}>
            <div className={tableScroll}>
              <div className="min-w-[1000px]">
                <Table>
                  <TableHeader className={tableHeadRow}>
                    <TableRow>
                      <TableCell isHeader className={thCell}>{t("prompt")}</TableCell>
                      <TableCell isHeader className={thCell}>{t("provider")} / {t("model")}</TableCell>
                      <TableCell isHeader className={thCell}>{t("rating")}</TableCell>
                      <TableCell isHeader className={thCell}>{t("performance")}</TableCell>
                      <TableCell isHeader className={thCell}>{t("cost")}</TableCell>
                      <TableCell isHeader className={thCell}>{t("status")}</TableCell>
                      <TableCell isHeader className={thCell}>
                        <Link href={preserve({ sort: "created_at", order: filters.sort === "created_at" && filters.order === "asc" ? "desc" : "asc", page: 1 })} className={sortLink}>
                          {t("created")} <ArrowUpDown className="size-3.5" />
                        </Link>
                      </TableCell>
                      <TableCell isHeader className={thCell}>{tc("actions")}</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={tableBody}>
                    {result.data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className={tdCell}>
                          <div className="flex items-start gap-3">
                            <StickerThumb signedUrl={row.signedUrl} alt={row.preset_name || row.id} />
                            <div className="min-w-0">
                              <PromptCell text={row.final_prompt || row.user_prompt || ""} />
                              {row.preset_name && <span className={`mt-1 block ${tdSub} font-mono text-[10px]`}>{row.preset_name}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className={tdCell}>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{row.provider_name ?? "—"}</span>
                          <span className="block font-mono text-[11px] text-gray-500 dark:text-gray-400">{row.model_name ?? "—"}</span>
                          {row.provider_config_id && (
                            <Link href={buildLocaleHref(locale, `/llm-config/${row.provider_config_id}`)} className="mt-1 block font-mono text-[10px] text-brand-600 hover:underline dark:text-brand-400">
                              config
                            </Link>
                          )}
                        </TableCell>
                        <TableCell className={tdCell}>
                          {row.rating === 1 ? (
                            <TailBadge variant="light" color="success">{t("up")}</TailBadge>
                          ) : row.rating === -1 ? (
                            <TailBadge variant="light" color="error">{t("down")}</TailBadge>
                          ) : (
                            <TailBadge color="light">{t("unrated")}</TailBadge>
                          )}
                          {row.reason_tags && row.reason_tags.length > 0 && (
                            <span className={`mt-1 block ${tdSub}`}>{row.reason_tags.join(", ")}</span>
                          )}
                        </TableCell>
                        <TableCell className={tdCell}>
                          <span>{formatDurationMs(row.generation_duration_ms)}</span>
                        </TableCell>
                        <TableCell className={`${tdCell} font-mono text-xs`}>{row.cost ?? "—"}</TableCell>
                        <TableCell className={tdCell}>
                          <TailBadge variant="light" color={row.status === "success" ? "success" : row.status === "failed" ? "error" : "light"}>{row.status}</TailBadge>
                          {row.is_flagged && (
                            <TailBadge variant="solid" color="warning" className="ml-1">{t("flagged")}</TailBadge>
                          )}
                        </TableCell>
                        <TableCell className={`${tdCell} text-xs`}>{new Date(row.created_at).toLocaleString("id-ID")}</TableCell>
                        <TableCell className={tdCell}>
                          <div className="flex flex-wrap gap-1.5">
                            <Link href={buildLocaleHref(locale, `/stickers/${row.id}`)} className={toolbarBtn(false) + " h-7 px-2 text-xs"}>
                              {t("detail")}
                            </Link>
                            <DownloadStickerButton signedUrl={row.signedUrl} filename={`${row.id}.png`} />
                            <FlagButton id={row.id} isFlagged={row.is_flagged} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {result.data.length === 0 && (
                      <TableRow>
                        <td className={`${tdCell} p-6 text-center text-gray-500 dark:text-gray-400`} colSpan={8}>
                          {t("noMatch")}
                        </td>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Pagination
              page={filters.page}
              totalPages={result.totalPages}
              total={result.total}
              pageSize={PER_PAGE}
              summary={(tot, shown, pg) => `${tot} ${tf("total")} · ${shown} ${tf("onPage")} ${pg}`}
              getHref={(p) => buildStickersUrl(locale, { ...filters, page: p })}
            />
          </div>
        </>
      )}
    </div>
  );
}
