import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LayoutGrid, List, ScrollText, Plus, Eye, ArrowUpDown, Calendar } from "lucide-react";
import { PresetFilterBar } from "./_components/filter-bar";
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
  tdSub,
  toolbarBtn,
  primaryBtnLink,
  ghostIconBtnLink,
  segWrap,
  segLink,
  sortLink,
} from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["sort_order", "label", "created_at", "updated_at", "valid_from", "valid_until", "required_role"] as const;
type SortField = typeof SORT_FIELDS[number];

function getValidStatus(p: Record<string, unknown> & { is_active: boolean; valid_from: string | null; valid_until: string | null }, now = new Date()) {
  if (!p.is_active) return { key: "inactive", label: "Nonaktif", color: "light" as const };
  if (p.valid_from && new Date(p.valid_from) > now) return { key: "scheduled", label: "Terjadwal", color: "light" as const };
  if (p.valid_until && new Date(p.valid_until) < now) return { key: "expired", label: "Kedaluwarsa", color: "error" as const };
  return { key: "active", label: "Aktif", color: "success" as const };
}

function formatWIB(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB";
  } catch {
    return iso;
  }
}

type Filters = {
  q?: string;
  role?: string;
  active?: string;
  valid?: string;
  sort?: string;
  order?: string;
  page?: number;
  perPage?: number;
};

async function getPresets(filters: Filters) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const sortField: SortField = SORT_FIELDS.includes(filters.sort as SortField) ? (filters.sort as SortField) : "sort_order";
  const ascending = filters.order === "desc" ? false : true;
  const perPage = filters.perPage ?? 12;
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let q = supabase.from("sticker_presets").select("*", { count: "exact" }).order(sortField, { ascending, nullsFirst: true });

  if (filters.q) {
    const term = `%${filters.q}%`;
    q = q.or(`id.ilike.${term},label.ilike.${term},description.ilike.${term},emoji.ilike.${term}`);
  }
  if (filters.role && filters.role !== "all") q = q.eq("required_role", filters.role);
  if (filters.active === "active") q = q.eq("is_active", true);
  if (filters.active === "inactive") q = q.eq("is_active", false);

  // valid filter in DB partially; scheduled/expired needs date logic but filter after fetch for simplicity if valid specified
  // We'll apply is_active already, then post-filter for valid status if needed
  const needsPostFilter = filters.valid && filters.valid !== "all";
  // To avoid fetching all, we fetch with range but if post-filter we fetch larger window
  if (needsPostFilter) {
    q = q.range(0, 199);
  } else {
    q = q.range(from, to);
  }

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);

  let rows = data ?? [];
  if (needsPostFilter) {
    const now = new Date();
    rows = rows.filter((p) => getValidStatus(p, now).key === filters.valid);
    // paginate after filter
    const totalFiltered = rows.length;
    const paged = rows.slice(from, to + 1);
    return { data: paged, total: totalFiltered };
  }

  return { data: rows, total: count ?? 0 };
}

function buildUrl(locale: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v.trim() !== "" && v !== "all") usp.set(k, v);
  });
  const qs = usp.toString();
  return `${buildLocaleHref(locale, "/presets")}${qs ? `?${qs}` : ""}`;
}

export default async function PresetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = sp.q ?? "";
  const role = sp.role ?? "all";
  const active = sp.active ?? "all";
  const valid = sp.valid ?? "all";
  const view = sp.view === "list" ? "list" : "card";
  const sort = SORT_FIELDS.includes(sp.sort as SortField) ? (sp.sort as SortField) : "sort_order";
  const order = sp.order === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const perPage = view === "list" ? 10 : 12;
  const t = await getTranslations({ locale, namespace: "presets" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const result = await getPresets({ q, role, active, valid, sort, order, page, perPage });
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const presets = result?.data ?? [];

  const preserve = (overrides: Record<string, string | undefined>) =>
    buildUrl(locale, { q, role, active, valid, view, sort, order, page: String(page), ...overrides });

  const toggleOrder = order === "asc" ? "desc" : "asc";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="mb-6">
          <PageBreadcrumb pageTitle={t("title")} homeHref={buildLocaleHref(locale, "/")} homeLabel={tc("home")} />
          <p className="-mt-4 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
        </div>
        <Link href={buildLocaleHref(locale, "/presets/new")} className={`${primaryBtnLink()} -mt-2 mb-6`}>
          <Plus className="size-4" /> Tambah Preset
        </Link>
      </div>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <PresetFilterBar locale={locale} initial={{ q, role, active, valid }} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
            {total} preset · hal {page}/{totalPages} · sort {sort} {order}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={buildUrl(locale, { q, role, active, valid, view, sort: "sort_order", order: "asc", page: "1" })} className={toolbarBtn(sort === "sort_order")}>
              Urutan
            </Link>
            <Link href={buildUrl(locale, { q, role, active, valid, view, sort: "valid_from", order: toggleOrder, page: "1" })} className={toolbarBtn(sort === "valid_from")}>
              Jadwal <ArrowUpDown className="size-3.5" />
            </Link>
            <Link href={buildUrl(locale, { q, role, active, valid, view, sort, order: toggleOrder, page: "1" })} className={toolbarBtn(false)}>
              {order === "asc" ? "↑ asc" : "↓ desc"}
            </Link>
            <div className={`ml-1 ${segWrap}`}>
              <Link href={buildUrl(locale, { q, role, active, valid, view: "card", sort, order, page: "1" })} className={segLink(view === "card")}>
                <LayoutGrid className="size-4" /> Kartu
              </Link>
              <Link href={buildUrl(locale, { q, role, active, valid, view: "list", sort, order, page: "1" })} className={segLink(view === "list")}>
                <List className="size-4" /> List
              </Link>
            </div>
          </div>
        </div>
      </div>

      {!result ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Supabase env not configured.
        </div>
      ) : presets.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Tidak ada preset cocok filter.
        </div>
      ) : view === "list" ? (
        <div className={tableWrap}>
          <div className={tableScroll}>
            <div className="min-w-[920px]">
              <Table>
                <TableHeader className={tableHeadRow}>
                  <TableRow>
                    <TableCell isHeader className={thCell}>
                      <Link href={preserve({ sort: "sort_order", order: sort === "sort_order" && order === "asc" ? "desc" : "asc", page: "1" })} className={sortLink}>
                        ID / Label <ArrowUpDown className="size-3.5" />
                      </Link>
                    </TableCell>
                    <TableCell isHeader className={thCell}>Role</TableCell>
                    <TableCell isHeader className={thCell}>Jadwal Aktif (WIB)</TableCell>
                    <TableCell isHeader className={thCell}>Status</TableCell>
                    <TableCell isHeader className={thCell}>Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className={tableBody}>
                  {presets.map((p) => {
                    const st = getValidStatus(p);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className={tdCell}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{p.emoji ?? ""}</span>
                            <div>
                              <span className="block font-mono font-medium text-theme-xs text-gray-800 dark:text-white/90">{p.id}</span>
                              <span className="block text-theme-xs text-gray-500 dark:text-gray-400">{p.label}</span>
                            </div>
                          </div>
                          <span className={`${tdSub} mt-1 font-mono text-[10px]`}>sort {p.sort_order}</span>
                        </TableCell>
                        <TableCell className={tdCell}>
                          <TailBadge color={p.required_role === "plus" ? "primary" : "light"}>{p.required_role}</TailBadge>
                        </TableCell>
                        <TableCell className={`${tdCell} text-xs`}>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5 text-gray-400" />
                            <span>{formatWIB(p.valid_from)} → {formatWIB(p.valid_until)}</span>
                          </span>
                        </TableCell>
                        <TableCell className={tdCell}>
                          <TailBadge variant="light" color={st.color}>{st.label}</TailBadge>
                          {!p.is_active && <span className="ml-1 text-xs text-gray-500">(nonaktif)</span>}
                        </TableCell>
                        <TableCell className={tdCell}>
                          <div className="flex gap-1.5">
                            <Link href={buildLocaleHref(locale, `/presets/${p.id}`)} className={toolbarBtn(false)}>
                              <Eye className="size-4" /> Detail
                            </Link>
                            <Link href={buildLocaleHref(locale, `/llm-logs?preset=${p.id}`)} title="Lihat log LLM untuk preset ini" className={ghostIconBtnLink()}>
                              <ScrollText className="size-4" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-6">
          {presets.map((p) => {
            const st = getValidStatus(p);
            return (
              <div key={p.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <h3 className="flex items-center gap-2 text-base font-medium text-gray-800 dark:text-white/90">
                  <span className="text-xl">{p.emoji ?? ""}</span> {p.label}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <TailBadge color={p.required_role === "plus" ? "primary" : "light"}>{p.required_role}</TailBadge>
                  <TailBadge variant="light" color={st.color}>{st.label}</TailBadge>
                  <TailBadge color="light">sort {p.sort_order}</TailBadge>
                </div>
                <p className="mt-2 font-mono text-theme-xs text-gray-500 dark:text-gray-400">{p.id}</p>
                <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{p.description ?? ""}</p>
                <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-700 dark:bg-white/5 dark:text-gray-300">
                  <div className="flex items-center gap-1 font-medium">
                    <Calendar className="size-3.5" /> Jadwal Aktif
                  </div>
                  <div>{formatWIB(p.valid_from)}</div>
                  <div>s.d. {formatWIB(p.valid_until)}</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={buildLocaleHref(locale, `/presets/${p.id}`)} className={`${toolbarBtn(false)} flex-1 justify-center`}>
                    <Eye className="size-4" /> Detail
                  </Link>
                  <Link href={buildLocaleHref(locale, `/llm-logs?preset=${p.id}`)} className={`${toolbarBtn(false)} gap-1.5`}>
                    <ScrollText className="size-4" /> Log
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={perPage}
            summary={(tot, shown, pg) => `${tot} total · ${shown} di hal ${pg}`}
            getHref={(p) => buildUrl(locale, { q, role, active, valid, view, sort, order, page: String(p) })}
          />
        </div>
      )}
    </div>
  );
}
