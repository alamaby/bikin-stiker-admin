import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { LogFilterBar } from "./_components/log-filter-bar";
import { PromptCell } from "./_components/prompt-cell";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import TailBadge from "@/components/ui/badge/TailBadge";
import Pagination from "@/components/tables/Pagination";
import {
  tableWrap,
  tableScroll,
  tableHeadRow,
  tableBody,
  thCell,
  tdCell,
  toolbarBtn,
  sortLink,
} from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";

export const dynamic = "force-dynamic";

type UnifiedRow = {
  id: string;
  type: "image" | "reasoning" | "surprise";
  provider: string;
  model: string;
  prompt: string;
  preset: string | null;
  success: boolean;
  cached?: boolean;
  latency: number | null;
  created_at: string;
  config_id: string | null;
  error: string | null;
  sticker_id: string | null;
  route_scope?: string | null;
};

async function fetchUnifiedLogs(opts: {
  q?: string;
  provider?: string;
  success?: string;
  type?: string;
  configId?: string;
  preset?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  order?: string;
  page: number;
  perPage: number;
}) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const q = (opts.q ?? "").trim().toLowerCase();
  const providerFilter = opts.provider && opts.provider !== "all" ? opts.provider : null;
  const successFilter = opts.success === "success" ? true : opts.success === "fail" ? false : null;
  const typeFilter = opts.type && opts.type !== "all" ? opts.type : null;
  const configId = opts.configId?.trim() || null;
  const presetFilter = opts.preset?.trim() || null;
  const sortField = ["created_at", "latency_ms", "provider_name"].includes(opts.sort ?? "") ? opts.sort! : "created_at";
  const ascending = opts.order === "asc";

  // Fetch with generous limit then filter/sort/paginate in memory (admin scale)
  const fetchLimit = 200;

  let attemptQ = supabase
    .from("image_generation_attempt_logs")
    .select("id,config_id,provider_name,model_name,route_scope,success,retryable,latency_ms,created_at,error_message,sticker_generation_id,request_payload,response_payload")
    .order("created_at", { ascending: false })
    .limit(fetchLimit);
  let enhQ = supabase
    .from("prompt_enhancement_logs")
    .select("id,config_id,preset_id,success,cached,latency_ms,created_at,error_message,sticker_generation_id")
    .order("created_at", { ascending: false })
    .limit(fetchLimit);
  let surpriseQ = supabase.from("surprise_me_history").select("id,user_id,prompt_text,preset_id,created_at").order("created_at", { ascending: false }).limit(fetchLimit);

  if (providerFilter) {
    attemptQ = attemptQ.eq("provider_name", providerFilter);
    // enh logs has no provider, so skip filter there (will filter merged)
  }
  if (successFilter !== null) {
    attemptQ = attemptQ.eq("success", successFilter);
    enhQ = enhQ.eq("success", successFilter);
  }
  if (configId) {
    attemptQ = attemptQ.eq("config_id", configId);
    enhQ = enhQ.eq("config_id", configId);
    // surprise has no config_id
  }
  if (opts.dateFrom) {
    attemptQ = attemptQ.gte("created_at", new Date(opts.dateFrom).toISOString());
    enhQ = enhQ.gte("created_at", new Date(opts.dateFrom).toISOString());
    surpriseQ = surpriseQ.gte("created_at", new Date(opts.dateFrom).toISOString());
  }
  if (opts.dateTo) {
    const end = new Date(opts.dateTo);
    end.setDate(end.getDate() + 1);
    attemptQ = attemptQ.lt("created_at", end.toISOString());
    enhQ = enhQ.lt("created_at", end.toISOString());
    surpriseQ = surpriseQ.lt("created_at", end.toISOString());
  }

  const [{ data: attempts }, { data: enhancements }, { data: surprises }] = await Promise.all([attemptQ, enhQ, surpriseQ]);

  // Collect sticker ids to enrich prompts
  const stickerIds = new Set<string>();
  attempts?.forEach((a) => a.sticker_generation_id && stickerIds.add(a.sticker_generation_id));
  enhancements?.forEach((e) => e.sticker_generation_id && stickerIds.add(e.sticker_generation_id));
  const stickerMap = new Map<string, { user_prompt: string; final_prompt: string; preset_name: string }>();
  if (stickerIds.size > 0) {
    const { data: stickers } = await supabase.from("sticker_generations").select("id,user_prompt,final_prompt,preset_name").in("id", Array.from(stickerIds));
    stickers?.forEach((s) => stickerMap.set(s.id, s));
  }

  const rows: UnifiedRow[] = [];

  if (!typeFilter || typeFilter === "image") {
    attempts?.forEach((a) => {
      const sticker = a.sticker_generation_id ? stickerMap.get(a.sticker_generation_id) : null;
      const prompt = sticker?.final_prompt ?? sticker?.user_prompt ?? ((a.request_payload as Record<string, unknown>)?.prompt as string) ?? "";
      rows.push({
        id: a.id,
        type: "image",
        provider: a.provider_name,
        model: a.model_name,
        prompt,
        preset: sticker?.preset_name ?? ((a.request_payload as Record<string, unknown>)?.presetId as string) ?? null,
        success: a.success,
        latency: a.latency_ms,
        created_at: a.created_at,
        config_id: a.config_id,
        error: a.error_message,
        sticker_id: a.sticker_generation_id,
        route_scope: a.route_scope,
      });
    });
  }

  if (!typeFilter || typeFilter === "reasoning") {
    enhancements?.forEach((e) => {
      const sticker = e.sticker_generation_id ? stickerMap.get(e.sticker_generation_id) : null;
      const prompt = sticker?.user_prompt ?? sticker?.final_prompt ?? "";
      rows.push({
        id: e.id,
        type: "reasoning",
        provider: "pollinations",
        model: "mistral",
        prompt,
        preset: e.preset_id,
        success: e.success,
        cached: e.cached,
        latency: e.latency_ms,
        created_at: e.created_at,
        config_id: e.config_id,
        error: e.error_message,
        sticker_id: e.sticker_generation_id,
      });
    });
  }

  if (!typeFilter || typeFilter === "surprise") {
    surprises?.forEach((s) => {
      rows.push({
        id: s.id,
        type: "surprise",
        provider: "surprise",
        model: "history",
        prompt: s.prompt_text,
        preset: s.preset_id,
        success: true,
        latency: null,
        created_at: s.created_at,
        config_id: null,
        error: null,
        sticker_id: null,
      });
    });
  }

  // Post-filter in memory (preset/provider/success/q) – covers enh/surprise that weren't DB-filtered
  let filtered = rows;
  if (presetFilter) filtered = filtered.filter((r) => r.preset === presetFilter);
  if (providerFilter) filtered = filtered.filter((r) => r.provider === providerFilter);
  if (successFilter !== null) filtered = filtered.filter((r) => r.success === successFilter);
  if (q) {
    filtered = filtered.filter((r) => {
      const hay = `${r.prompt} ${r.provider} ${r.model} ${r.error ?? ""} ${r.preset ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // Sorting
  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortField === "latency_ms") cmp = (a.latency ?? 0) - (b.latency ?? 0);
    else if (sortField === "provider_name") cmp = a.provider.localeCompare(b.provider);
    else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return ascending ? cmp : -cmp;
  });

  // Pagination
  const total = filtered.length;
  const perPage = opts.perPage;
  const page = Math.max(1, opts.page);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const paged = filtered.slice(start, start + perPage);

  return { rows: paged, total, totalPages, page: safePage };
}

function buildUrl(locale: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v.trim() !== "" && v !== "all") usp.set(k, v);
  });
  const qs = usp.toString();
  return `${buildLocaleHref(locale, "/llm-logs")}${qs ? `?${qs}` : ""}`;
}

export default async function LlmLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = sp.q ?? "";
  const provider = sp.provider ?? "all";
  const success = sp.success ?? "all";
  const type = sp.type ?? "all";
  const config_id = sp.config_id ?? "";
  const preset = sp.preset ?? "";
  const date_from = sp.date_from ?? "";
  const date_to = sp.date_to ?? "";
  const sort = sp.sort ?? "created_at";
  const order = sp.order ?? "desc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const perPage = 20;
  const t = await getTranslations({ locale, namespace: "llmLogs" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const data = await fetchUnifiedLogs({ q, provider, success, type, configId: config_id, preset, dateFrom: date_from, dateTo: date_to, sort, order, page, perPage });

  const preserve = (overrides: Record<string, string | undefined>) =>
    buildUrl(locale, { q, provider, success, type, config_id, preset, date_from, date_to, sort, order, page: String(page), ...overrides });

  const toggleOrder = order === "asc" ? "desc" : "asc";

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} homeHref={buildLocaleHref(locale, "/")} homeLabel={tc("home")} />
      <p className="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <LogFilterBar locale={locale} initial={{ q, provider, success, type, config_id, preset, date_from, date_to }} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
            {data ? `${data.total} logs · page ${data.page}/${data.totalPages}` : "—"} {config_id && `· config ${config_id.slice(0, 8)}...`} {preset && `· preset ${preset}`}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildUrl(locale, { q, provider, success, type, config_id, preset, date_from, date_to, sort: "created_at", order: sort === "created_at" ? toggleOrder : "desc", page: "1" })}
              className={toolbarBtn(sort === "created_at")}
            >
              Waktu <ArrowUpDown className="size-3.5" />
            </Link>
            <Link
              href={buildUrl(locale, { q, provider, success, type, config_id, preset, date_from, date_to, sort: "latency_ms", order: toggleOrder, page: "1" })}
              className={toolbarBtn(sort === "latency_ms")}
            >
              Latensi
            </Link>
            <Link
              href={buildUrl(locale, { q, provider, success, type, config_id, preset, date_from, date_to, sort, order: toggleOrder, page: "1" })}
              className={toolbarBtn(false)}
            >
              {order === "asc" ? "↑ asc" : "↓ desc"}
            </Link>
          </div>
        </div>
        {(config_id || preset) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {config_id && (
              <Link href={buildLocaleHref(locale, `/llm-config/${config_id}`)} className={toolbarBtn(false)}>
                Lihat config
              </Link>
            )}
            {preset && (
              <Link href={buildLocaleHref(locale, `/presets/${preset}`)} className={toolbarBtn(false)}>
                Lihat preset
              </Link>
            )}
            <Link href={buildUrl(locale, { q, provider, success, type, date_from, date_to, sort, order, page: "1" })} className={toolbarBtn(false)}>
              Hapus filter
            </Link>
          </div>
        )}
      </div>

      {!data ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Supabase env not configured.
        </div>
      ) : (
        <>
          <div className={tableWrap}>
            <div className={tableScroll}>
              <div className="min-w-[1020px]">
                <Table>
                  <TableHeader className={tableHeadRow}>
                    <TableRow>
                      <TableCell isHeader className={thCell}>Tipe</TableCell>
                      <TableCell isHeader className={thCell}>Provider / Model</TableCell>
                      <TableCell isHeader className={thCell}>Prompt</TableCell>
                      <TableCell isHeader className={thCell}>Preset</TableCell>
                      <TableCell isHeader className={thCell}>Status</TableCell>
                      <TableCell isHeader className={thCell}>
                        <Link href={preserve({ sort: "latency_ms", order: sort === "latency_ms" && order === "asc" ? "desc" : "asc", page: "1" })} className={sortLink}>
                          Latensi <ArrowUpDown className="size-3.5" />
                        </Link>
                      </TableCell>
                      <TableCell isHeader className={thCell}>
                        <Link href={preserve({ sort: "created_at", order: sort === "created_at" && order === "asc" ? "desc" : "asc", page: "1" })} className={sortLink}>
                          Waktu <ArrowUpDown className="size-3.5" />
                        </Link>
                      </TableCell>
                      <TableCell isHeader className={thCell}>Config</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={tableBody}>
                    {data.rows.map((r) => (
                      <TableRow key={`${r.type}-${r.id}`}>
                        <TableCell className={tdCell}>
                          <TailBadge color={r.type === "image" ? "primary" : r.type === "reasoning" ? "info" : "light"}>{r.type}</TailBadge>
                          {r.cached && <TailBadge color="light" className="ml-1">cached</TailBadge>}
                        </TableCell>
                        <TableCell className={tdCell}>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{r.provider}</span>
                          <span className="block font-mono text-[11px] text-gray-500 dark:text-gray-400">{r.model}</span>
                          {r.route_scope && <TailBadge color="light" size="sm" className="mt-1">{r.route_scope}</TailBadge>}
                        </TableCell>
                        <TableCell className={tdCell}>
                          <PromptCell text={r.prompt || r.error || ""} />
                          {r.error && <div className="mt-1 text-[11px] text-error-600 dark:text-error-400">{r.error.slice(0, 120)}</div>}
                        </TableCell>
                        <TableCell className={`${tdCell} font-mono text-xs`}>{r.preset ?? "—"}</TableCell>
                        <TableCell className={tdCell}>
                          <TailBadge variant={r.success ? "light" : "solid"} color={r.success ? "success" : "error"}>{r.success ? "ok" : "fail"}</TailBadge>
                        </TableCell>
                        <TableCell className={tdCell}>{r.latency ?? "—"} ms</TableCell>
                        <TableCell className={`${tdCell} text-[11px]`}>{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell className={tdCell}>
                          {r.config_id ? (
                            <Link href={buildLocaleHref(locale, `/llm-config/${r.config_id}`)} className="font-mono text-[11px] text-brand-600 hover:underline dark:text-brand-400">
                              {r.config_id.slice(0, 8)}...
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.rows.length === 0 && (
                      <TableRow>
                        <TableCell className={`${tdCell} p-6 text-center text-gray-500 dark:text-gray-400`}>
                          Tidak ada log cocok filter. Coba ubah filter atau hapus config_id.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={perPage}
              summary={(total, shown, pg) => `${total} total · ${shown} di halaman ${pg}`}
              getHref={(p) => buildUrl(locale, { q, provider, success, type, config_id, preset, date_from, date_to, sort, order, page: String(p) })}
            />
          </div>
        </>
      )}
    </div>
  );
}
