import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutGrid, List, ScrollText, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { FilterBar } from "./_components/filter-bar";

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
  return `/${locale}${base}${qs ? `?${qs}` : ""}`;
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <FilterBar key={`${route}-${provider}-${active}-${q}-${view}-${sort}-${order}`} locale={locale} initial={{ route, provider, active, q }} providers={providers} view={view} sort={sort} order={order} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {total} configs · page {page}/{totalPages}
              </span>

              <div className="hidden sm:flex gap-1">
                <Button asChild variant="outline" size="sm">
                  <Link href={preserve({ sort: "priority", order: "asc", page: "1" })}>priority</Link>
                </Button>
                <Button asChild variant={sort === "updated_at" ? "secondary" : "outline"} size="sm">
                  <Link href={preserve({ sort: "updated_at", order: toggleOrder, page: "1" })}>
                    updated <ArrowUpDown className="h-3 w-3" />
                  </Link>
                </Button>
                <Button asChild variant={sort === "provider_name" ? "secondary" : "outline"} size="sm">
                  <Link href={preserve({ sort: "provider_name", order: toggleOrder, page: "1" })}>provider</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={preserve({ order: toggleOrder, page: "1" })}>{order === "asc" ? "↑ asc" : "↓ desc"}</Link>
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-md border p-1">
              <Button asChild variant={view === "card" ? "secondary" : "ghost"} size="sm">
                <Link href={preserve({ view: "card", page: "1" })}>
                  <LayoutGrid className="h-4 w-4" /> Card
                </Link>
              </Button>
              <Button asChild variant={view === "list" ? "secondary" : "ghost"} size="sm">
                <Link href={preserve({ view: "list", page: "1" })}>
                  <List className="h-4 w-4" /> List
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex gap-1 sm:hidden">
            <Button asChild variant={sort === "priority" ? "secondary" : "outline"} size="sm">
              <Link href={preserve({ sort: "priority", order: "asc", page: "1" })}>priority</Link>
            </Button>
            <Button asChild variant={sort === "updated_at" ? "secondary" : "outline"} size="sm">
              <Link href={preserve({ sort: "updated_at", order: toggleOrder, page: "1" })}>updated</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={preserve({ order: toggleOrder, page: "1" })}>{order}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {!result ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Supabase env not configured.</CardContent>
        </Card>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No configs match filter.</CardContent>
        </Card>
      ) : view === "list" ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">
                      <Link href={preserve({ sort: "provider_name", order: sort === "provider_name" && order === "asc" ? "desc" : "asc", page: "1" })} className="inline-flex items-center gap-1 hover:underline">
                        Provider / Model <ArrowUpDown className="h-3 w-3" />
                      </Link>
                    </th>
                    <th className="p-2 text-left">Label</th>
                    <th className="p-2 text-left">Route</th>
                    <th className="p-2 text-left">
                      <Link href={preserve({ sort: "priority", order: sort === "priority" && order === "asc" ? "desc" : "asc", page: "1" })} className="inline-flex items-center gap-1 hover:underline">
                        {t("priority")} <ArrowUpDown className="h-3 w-3" />
                      </Link>
                    </th>
                    <th className="p-2 text-left">{t("active")}</th>
                    <th className="p-2 text-left">
                      <Link href={preserve({ sort: "timeout_ms", order: sort === "timeout_ms" && order === "asc" ? "desc" : "asc", page: "1" })} className="hover:underline">
                        {t("timeout")}
                      </Link>
                    </th>
                    <th className="p-2 text-left">{t("fallback")}</th>
                    <th className="p-2 text-left">
                      <Link href={preserve({ sort: "updated_at", order: sort === "updated_at" && order === "asc" ? "desc" : "asc", page: "1" })} className="hover:underline">
                        Updated
                      </Link>
                    </th>
                    <th className="p-2 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2">
                        <div className="font-medium">{c.provider_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{c.model_name}</div>
                      </td>
                      <td className="p-2 text-xs">{c.label ?? "—"}</td>
                      <td className="p-2">
                        <Badge variant="outline">{c.route_scope}</Badge>
                      </td>
                      <td className="p-2">{c.priority}</td>
                      <td className="p-2">
                        <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "yes" : "no"}</Badge>
                      </td>
                      <td className="p-2">{c.timeout_ms}</td>
                      <td className="p-2 text-xs">{c.fallback_policy}</td>
                      <td className="p-2 text-xs">{c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "—"}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/${locale}/llm-config/${c.id}`}>{t("edit")}</Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/${locale}/llm-logs?config_id=${c.id}`} title="View logs for this config">
                              <ScrollText className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {configs.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {c.provider_name} <span className="text-muted-foreground">/</span> {c.model_name}
                </CardTitle>
                <CardDescription className="flex flex-wrap gap-2">
                  <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "active" : "inactive"}</Badge>
                  <Badge variant="outline">{c.route_scope}</Badge>
                  <Badge variant="outline">p{c.priority}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="text-xs text-muted-foreground">
                  <div>Label: {c.label ?? "—"}</div>
                  <div>
                    {c.fallback_policy} · {c.timeout_ms}ms
                  </div>
                  <div className="truncate">base: {c.base_url ?? "—"}</div>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/${locale}/llm-config/${c.id}`}>{t("edit")}</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/${locale}/llm-logs?config_id=${c.id}`}>
                      <ScrollText className="h-4 w-4" /> Log
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {result && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {total} total · {configs.length} on page {page}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={preserve({ page: String(page - 1) })} aria-disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Link>
            </Button>
            <span className="flex items-center px-2 text-sm">
              {page} / {totalPages}
            </span>
            <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
              <Link href={preserve({ page: String(page + 1) })} aria-disabled={page >= totalPages}>
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
