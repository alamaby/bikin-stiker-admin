import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutGrid, List, ScrollText, Plus, Eye, ArrowUpDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { PresetFilterBar } from "./_components/filter-bar";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["sort_order", "label", "created_at", "updated_at", "valid_from", "valid_until", "required_role"] as const;
type SortField = typeof SORT_FIELDS[number];

function getValidStatus(p: Record<string, unknown> & { is_active: boolean; valid_from: string | null; valid_until: string | null }, now = new Date()) {
  if (!p.is_active) return { key: "inactive", label: "Nonaktif", variant: "secondary" as const };
  if (p.valid_from && new Date(p.valid_from) > now) return { key: "scheduled", label: "Terjadwal", variant: "outline" as const };
  if (p.valid_until && new Date(p.valid_until) < now) return { key: "expired", label: "Kedaluwarsa", variant: "destructive" as const };
  return { key: "active", label: "Aktif", variant: "default" as const };
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
  return `/${locale}/presets${qs ? `?${qs}` : ""}`;
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

  const result = await getPresets({ q, role, active, valid, sort, order, page, perPage });
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const presets = result?.data ?? [];

  const preserve = (overrides: Record<string, string | undefined>) =>
    buildUrl(locale, { q, role, active, valid, view, sort, order, page: String(page), ...overrides });

  const toggleOrder = order === "asc" ? "desc" : "asc";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/presets/new`}>
            <Plus className="h-4 w-4" /> Tambah Preset
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <PresetFilterBar locale={locale} initial={{ q, role, active, valid }} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              {total} preset · hal {page}/{totalPages} · sort {sort} {order}
            </span>
            <div className="flex items-center gap-1">
              <Button asChild variant={sort === "sort_order" ? "secondary" : "outline"} size="sm">
                <Link href={buildUrl(locale, { q, role, active, valid, view, sort: "sort_order", order: "asc", page: "1" })}>Urutan</Link>
              </Button>
              <Button asChild variant={sort === "valid_from" ? "secondary" : "outline"} size="sm">
                <Link href={buildUrl(locale, { q, role, active, valid, view, sort: "valid_from", order: toggleOrder, page: "1" })}>
                  Jadwal <ArrowUpDown className="h-3 w-3" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={buildUrl(locale, { q, role, active, valid, view, sort, order: toggleOrder, page: "1" })}>{order === "asc" ? "↑ asc" : "↓ desc"}</Link>
              </Button>
              <div className="ml-2 flex items-center gap-1 rounded-md border p-1">
                <Button asChild variant={view === "card" ? "secondary" : "ghost"} size="sm">
                  <Link href={buildUrl(locale, { q, role, active, valid, view: "card", sort, order, page: "1" })}>
                    <LayoutGrid className="h-4 w-4" /> Kartu
                  </Link>
                </Button>
                <Button asChild variant={view === "list" ? "secondary" : "ghost"} size="sm">
                  <Link href={buildUrl(locale, { q, role, active, valid, view: "list", sort, order, page: "1" })}>
                    <List className="h-4 w-4" /> List
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!result ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Supabase env not configured.</CardContent>
        </Card>
      ) : presets.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Tidak ada preset cocok filter.</CardContent>
        </Card>
      ) : view === "list" ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">
                      <Link href={preserve({ sort: "sort_order", order: sort === "sort_order" && order === "asc" ? "desc" : "asc", page: "1" })} className="inline-flex items-center gap-1 hover:underline">
                        ID / Label <ArrowUpDown className="h-3 w-3" />
                      </Link>
                    </th>
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-left">Jadwal Aktif (WIB)</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {presets.map((p) => {
                    const st = getValidStatus(p);
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{p.emoji ?? ""}</span>
                            <div>
                              <div className="font-mono text-xs font-medium">{p.id}</div>
                              <div className="text-xs">{p.label}</div>
                            </div>
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">sort {p.sort_order}</div>
                        </td>
                        <td className="p-2">
                          <Badge variant={p.required_role === "plus" ? "default" : "secondary"}>{p.required_role}</Badge>
                        </td>
                        <td className="p-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{formatWIB(p.valid_from)} → {formatWIB(p.valid_until)}</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant={st.variant}>{st.label}</Badge>
                          {!p.is_active && <span className="ml-1 text-xs text-muted-foreground">(nonaktif)</span>}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/${locale}/presets/${p.id}`}>
                                <Eye className="h-4 w-4" /> Detail
                              </Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/${locale}/llm-logs?preset=${p.id}`} title="Lihat log LLM untuk preset ini">
                                <ScrollText className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {presets.map((p) => {
            const st = getValidStatus(p);
            return (
              <Card key={p.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-xl">{p.emoji ?? ""}</span> {p.label}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap gap-1">
                    <Badge variant={p.required_role === "plus" ? "default" : "secondary"}>{p.required_role}</Badge>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <Badge variant="outline">sort {p.sort_order}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-2">
                  <p className="font-mono text-xs text-muted-foreground">{p.id}</p>
                  <p className="line-clamp-2 text-xs">{p.description ?? ""}</p>
                  <div className="rounded bg-muted p-2 text-xs">
                    <div className="flex items-center gap-1 font-medium">
                      <Calendar className="h-3 w-3" /> Jadwal Aktif
                    </div>
                    <div>{formatWIB(p.valid_from)}</div>
                    <div>s.d. {formatWIB(p.valid_until)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/${locale}/presets/${p.id}`}>
                        <Eye className="h-4 w-4" /> Detail
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/${locale}/llm-logs?preset=${p.id}`}>
                        <ScrollText className="h-4 w-4" /> Log
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {total} total · {presets.length} di hal {page}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={buildUrl(locale, { q, role, active, valid, view, sort, order, page: String(page - 1) })} aria-disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Link>
            </Button>
            <span className="flex items-center px-2 text-sm">
              {page} / {totalPages}
            </span>
            <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
              <Link href={buildUrl(locale, { q, role, active, valid, view, sort, order, page: String(page + 1) })} aria-disabled={page >= totalPages}>
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
