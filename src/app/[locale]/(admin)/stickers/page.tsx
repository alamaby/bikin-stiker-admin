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
import { parseStickerParams, buildStickersUrl, resolveStickerStoragePath, formatDurationMs } from "@/lib/stickers";

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

  const result = await getStickers(filters);

  const preserve = (overrides: Partial<ReturnType<typeof parseStickerParams>>) =>
    buildStickersUrl(locale, { ...filters, ...overrides });

  const toggleOrder = filters.order === "asc" ? "desc" : "asc";

  return (
    <div>
      <div className="mb-6">
        <PageBreadcrumb pageTitle={t("title")} homeHref={buildLocaleHref(locale, "/")} homeLabel={tc("home")} />
        <p className="-mt-4 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
      </div>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <StickerFilterBar locale={locale} initial={{ q: filters.q, status: filters.status, provider: filters.provider, model: filters.model, rating: filters.rating, flagged: filters.flagged, date_from: filters.date_from, date_to: filters.date_to }} />
        {result && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
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
      </div>

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
              <div className="min-w-[1200px]">
                <Table>
                  <TableHeader className={tableHeadRow}>
                    <TableRow>
                      <TableCell isHeader className={thCell}>{t("preview")}</TableCell>
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
                          <StickerThumb signedUrl={row.signedUrl} alt={row.preset_name || row.id} />
                        </TableCell>
                        <TableCell className={tdCell}>
                          <PromptCell text={row.final_prompt || row.user_prompt || ""} />
                          {row.preset_name && <span className={`mt-1 block ${tdSub} font-mono text-[10px]`}>{row.preset_name}</span>}
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
                            <Link href={buildLocaleHref(locale, `/stickers/${row.id}`)} className={toolbarBtn(false)}>
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
                        <td className={`${tdCell} p-6 text-center text-gray-500 dark:text-gray-400`} colSpan={9}>
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
