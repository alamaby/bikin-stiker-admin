import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LayoutGrid, List, ScrollText, ArrowUpDown } from "lucide-react";
import { FilterBar } from "./_components/filter-bar";
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
  segWrap,
  segLink,
  sortLink,
} from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";

export const dynamic = "force-dynamic";

type Filters = {
  route?: string;
  provider?: string;
  active?: string;
  q?: string;
  sort?: string;
  order?: string;
  page?: number;
  perPage?: number;
};

const SORT_FIELDS = ["priority", "updated_at", "created_at", "provider_name", "model_name", "timeout_ms"] as const;

async function getConfigs(filters: Filters) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const sortField = SORT_FIELDS.includes(filters.sort as typeof SORT_FIELDS[number]) ? (filters.sort as typeof SORT_FIELDS[number]) : "priority";
  const ascending = filters.order === "desc" ? false : true;
  const perPage = filters.perPage ?? 12;
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let q = supabase.from("image_generation_configs").select("*", { count: "exact" }).order(sortField, { ascending });
  if (filters.route && filters.route !== "all") q = q.eq("route_scope", filters.route);
  if (filters.provider && filters.provider !== "all") q = q.eq("provider_name", filters.provider);
  if (filters.active === "active") q = q.eq("is_active", true);
  if (filters.active === "inactive") q = q.eq("is_active", false);
  if (filters.q) {
    const term = `%${filters.q}%`;
    q = q.or(`label.ilike.${term},provider_name.ilike.${term},model_name.ilike.${term}`);
  }
  q = q.range(from, to);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { data: data ?? [], total: count ?? 0 };
}

async function getDistinctProviders(): Promise<string[]> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await supabase.from("image_generation_configs").select("provider_name").order("provider_name");
  const set = new Set<string>();
  data?.forEach((r) => set.add(r.provider_name));
  return Array.from(set);
}

function buildUrl(locale: string, base: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v !== "all" && v.trim() !== "" && v !== undefined) usp.set(k, v);
  });
  const qs = usp.toString();
  return `${buildLocaleHref(locale, base)}${qs ? `?${qs}` : ""}`;
}

export default async function LlmConfigPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const route = sp.route ?? "all";
  const provider = sp.provider ?? "all";
  const active = sp.active ?? "all";
  const q = sp.q ?? "";
  const view = sp.view === "list" ? "list" : "card";
  const sort = SORT_FIELDS.includes(sp.sort as typeof SORT_FIELDS[number]) ? (sp.sort as typeof SORT_FIELDS[number]) : "priority";
  const order = sp.order === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const perPage = view === "list" ? 10 : 12;
  const t = await getTranslations({ locale, namespace: "llmConfig" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const result = await getConfigs({ route, provider, active, q, sort, order, page, perPage });
  const providers = await getDistinctProviders();

  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const configs = result?.data ?? [];

  const preserve = (overrides: Record<string, string | undefined>) =>
    buildUrl(locale, "/llm-config", {
      route,
      provider,
      active,
      q,
      view,
      sort,
      order,
      page: String(page),
      ...overrides,
    });

  const toggleOrder = order === "asc" ? "desc" : "asc";

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} homeHref={buildLocaleHref(locale, "/")} homeLabel={tc("home")} />
      <p className="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <FilterBar key={`${route}-${provider}-${active}-${q}-${view}-${sort}-${order}`} locale={locale} initial={{ route, provider, active, q }} providers={providers} view={view} sort={sort} order={order} />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">
              {total} configs · page {page}/{totalPages}
            </span>
            <div className="hidden gap-1.5 sm:flex">
              <Link href={preserve({ sort: "priority", order: "asc", page: "1" })} className={toolbarBtn(sort === "priority")}>
                priority
              </Link>
              <Link href={preserve({ sort: "updated_at", order: toggleOrder, page: "1" })} className={toolbarBtn(sort === "updated_at")}>
                updated <ArrowUpDown className="size-3.5" />
              </Link>
              <Link href={preserve({ sort: "provider_name", order: toggleOrder, page: "1" })} className={toolbarBtn(sort === "provider_name")}>
                provider
              </Link>
              <Link href={preserve({ order: toggleOrder, page: "1" })} className={toolbarBtn(false)}>
                {order === "asc" ? "↑ asc" : "↓ desc"}
              </Link>
            </div>
          </div>
          <div className={segWrap}>
            <Link href={preserve({ view: "card", page: "1" })} className={segLink(view === "card")}>
              <LayoutGrid className="size-4" /> Card
            </Link>
            <Link href={preserve({ view: "list", page: "1" })} className={segLink(view === "list")}>
              <List className="size-4" /> List
            </Link>
          </div>
        </div>

        <div className="mt-2 flex gap-1.5 sm:hidden">
          <Link href={preserve({ sort: "priority", order: "asc", page: "1" })} className={toolbarBtn(sort === "priority")}>
            priority
          </Link>
          <Link href={preserve({ sort: "updated_at", order: toggleOrder, page: "1" })} className={toolbarBtn(sort === "updated_at")}>
            updated
          </Link>
          <Link href={preserve({ order: toggleOrder, page: "1" })} className={toolbarBtn(false)}>
            {order}
          </Link>
        </div>
      </div>

      {!result ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Supabase env not configured.
        </div>
      ) : configs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          No configs match filter.
        </div>
      ) : view === "list" ? (
        <div className={tableWrap}>
          <div className={tableScroll}>
            <div className="min-w-[980px]">
              <Table>
                <TableHeader className={tableHeadRow}>
                  <TableRow>
                    <TableCell isHeader className={thCell}>
                      <Link href={preserve({ sort: "provider_name", order: sort === "provider_name" && order === "asc" ? "desc" : "asc", page: "1" })} className={sortLink}>
                        Provider / Model <ArrowUpDown className="size-3.5" />
                      </Link>
                    </TableCell>
                    <TableCell isHeader className={thCell}>Label</TableCell>
                    <TableCell isHeader className={thCell}>Route</TableCell>
                    <TableCell isHeader className={thCell}>
                      <Link href={preserve({ sort: "priority", order: sort === "priority" && order === "asc" ? "desc" : "asc", page: "1" })} className={sortLink}>
                        {t("priority")} <ArrowUpDown className="size-3.5" />
                      </Link>
                    </TableCell>
                    <TableCell isHeader className={thCell}>{t("active")}</TableCell>
                    <TableCell isHeader className={thCell}>
                      <Link href={preserve({ sort: "timeout_ms", order: sort === "timeout_ms" && order === "asc" ? "desc" : "asc", page: "1" })} className={sortLink}>
                        {t("timeout")}
                      </Link>
                    </TableCell>
                    <TableCell isHeader className={thCell}>{t("fallback")}</TableCell>
                    <TableCell isHeader className={thCell}>
                      <Link href={preserve({ sort: "updated_at", order: sort === "updated_at" && order === "asc" ? "desc" : "asc", page: "1" })} className={sortLink}>
                        Updated
                      </Link>
                    </TableCell>
                    <TableCell isHeader className={thCell}>Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className={tableBody}>
                  {configs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className={tdCell}>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{c.provider_name}</span>
                        <span className="block font-mono text-theme-xs text-gray-500 dark:text-gray-400">{c.model_name}</span>
                      </TableCell>
                      <TableCell className={`${tdCell} text-xs`}>{c.label ?? "—"}</TableCell>
                      <TableCell className={tdCell}>
                        <TailBadge color="light">{c.route_scope}</TailBadge>
                      </TableCell>
                      <TableCell className={tdCell}>{c.priority}</TableCell>
                      <TableCell className={tdCell}>
                        <TailBadge variant={c.is_active ? "solid" : "light"} color={c.is_active ? "success" : "light"}>{c.is_active ? "yes" : "no"}</TailBadge>
                      </TableCell>
                      <TableCell className={tdCell}>{c.timeout_ms}</TableCell>
                      <TableCell className={`${tdCell} text-xs`}>{c.fallback_policy}</TableCell>
                      <TableCell className={`${tdCell} text-xs`}>{c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className={tdCell}>
                        <div className="flex gap-1.5">
                          <Link href={buildLocaleHref(locale, `/llm-config/${c.id}`)} className={toolbarBtn(false)}>
                            {t("edit")}
                          </Link>
                          <Link href={buildLocaleHref(locale, `/llm-logs?config_id=${c.id}`)} title="View logs for this config" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5">
                            <ScrollText className="size-4" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-6">
          {configs.map((c) => (
            <div key={c.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                {c.provider_name} <span className="text-gray-400">/</span> {c.model_name}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <TailBadge variant={c.is_active ? "light" : "light"} color={c.is_active ? "success" : "light"}>{c.is_active ? "active" : "inactive"}</TailBadge>
                <TailBadge color="light">{c.route_scope}</TailBadge>
                <TailBadge color="light">p{c.priority}</TailBadge>
              </div>
              <div className="mt-3 space-y-1 text-theme-xs text-gray-500 dark:text-gray-400">
                <div>Label: {c.label ?? "—"}</div>
                <div>
                  {c.fallback_policy} · {c.timeout_ms}ms
                </div>
                <div className="truncate">base: {c.base_url ?? "—"}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={buildLocaleHref(locale, `/llm-config/${c.id}`)} className={`${toolbarBtn(false)} flex-1 justify-center`}>
                  {t("edit")}
                </Link>
                <Link href={buildLocaleHref(locale, `/llm-logs?config_id=${c.id}`)} className={`${toolbarBtn(false)} gap-1.5`}>
                  <ScrollText className="size-4" /> Log
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {result && totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={perPage}
            summary={(tot, shown, pg) => `${tot} total · ${shown} on page ${pg}`}
            getHref={(p) => preserve({ page: String(p) })}
          />
        </div>
      )}
    </div>
  );
}
