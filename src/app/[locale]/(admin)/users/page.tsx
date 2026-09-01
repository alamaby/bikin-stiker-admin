import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { UserFilterBar } from "./_components/filter-bar";

export const dynamic = "force-dynamic";

type SortField = "created_at" | "email" | "balance" | "tier" | "updated_at";
const SORT_FIELDS: SortField[] = ["created_at", "email", "balance", "tier", "updated_at"];

type Filters = {
  q?: string;
  tier?: string;
  status?: string;
  sort?: string;
  order?: string;
  page?: number;
  perPage?: number;
};

async function getUsers(filters: Filters) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const fetchLimit = 200;
  const [{ data: wallets }, { data: subs }, { data: profiles }, { data: authData }] = await Promise.all([
    supabase.from("user_wallets").select("user_id,balance,updated_at").order("updated_at", { ascending: false }).limit(fetchLimit),
    supabase.from("user_subscriptions").select("user_id,tier,expires_at,is_active").eq("is_active", true).limit(fetchLimit),
    supabase.from("user_profiles").select("user_id,display_name,avatar_url,is_deleted").limit(fetchLimit),
    supabase.auth.admin.listUsers({ page: 1, perPage: fetchLimit }),
  ]);

  const subMap = new Map(subs?.map((s) => [s.user_id, s]) ?? []);
  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authMap = new Map((authData?.users ?? []).map((u: any) => [u.id, u]) ?? []);

  // Base rows from wallets + auth (include users without wallet? also add auth-only)
  const walletIds = new Set((wallets ?? []).map((w) => w.user_id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allIds = new Set<string>([...walletIds, ...(authData?.users ?? []).map((u: any) => u.id)]);

  let rows = Array.from(allIds).map((uid) => {
    const w = wallets?.find((x) => x.user_id === uid);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a: any = authMap.get(uid);
    const s = subMap.get(uid);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: any = profileMap.get(uid);
    const bannedUntil = a?.banned_until ? new Date(a.banned_until) : null;
    const isSuspended = bannedUntil ? bannedUntil.getTime() > Date.now() : false;
    return {
      user_id: uid,
      email: a?.email ?? "—",
      display_name: p?.display_name ?? null,
      balance: w?.balance ?? 0,
      tier: s?.tier ?? "free",
      created_at: a?.created_at ?? w?.updated_at ?? null,
      updated_at: w?.updated_at ?? a?.created_at ?? null,
      isSuspended,
      banned_until: a?.banned_until ?? null,
      is_deleted: p?.is_deleted ?? false,
    };
  });

  // Filter q
  if (filters.q) {
    const term = filters.q.toLowerCase();
    rows = rows.filter((r) => r.email.toLowerCase().includes(term) || r.user_id.toLowerCase().includes(term) || (r.display_name ?? "").toLowerCase().includes(term));
  }
  if (filters.tier && filters.tier !== "all") {
    rows = rows.filter((r) => r.tier === filters.tier);
  }
  if (filters.status === "active") rows = rows.filter((r) => !r.isSuspended);
  if (filters.status === "suspended") rows = rows.filter((r) => r.isSuspended);

  // Sorting
  const sortField: SortField = SORT_FIELDS.includes(filters.sort as SortField) ? (filters.sort as SortField) : "created_at";
  const ascending = filters.order === "asc";
  rows.sort((a, b) => {
    let cmp = 0;
    if (sortField === "email") cmp = a.email.localeCompare(b.email);
    else if (sortField === "balance") cmp = a.balance - b.balance;
    else if (sortField === "tier") cmp = a.tier.localeCompare(b.tier);
    else if (sortField === "updated_at") cmp = new Date(a.updated_at ?? 0).getTime() - new Date(b.updated_at ?? 0).getTime();
    else cmp = new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
    return ascending ? cmp : -cmp;
  });

  const perPage = filters.perPage ?? 15;
  const page = Math.max(1, filters.page ?? 1);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const paged = rows.slice(start, start + perPage);

  return { data: paged, total, totalPages, page: safePage };
}

function buildUrl(locale: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v.trim() !== "" && v !== "all") usp.set(k, v);
  });
  const qs = usp.toString();
  return `/${locale}/users${qs ? `?${qs}` : ""}`;
}

export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = sp.q ?? "";
  const tier = sp.tier ?? "all";
  const status = sp.status ?? "all";
  const sort = SORT_FIELDS.includes(sp.sort as SortField) ? (sp.sort as SortField) : "created_at";
  const order = sp.order === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const perPage = 15;
  const t = await getTranslations({ locale, namespace: "users" });

  const result = await getUsers({ q, tier, status, sort, order, page, perPage });

  const preserve = (overrides: Record<string, string | undefined>) => buildUrl(locale, { q, tier, status, sort, order, page: String(page), ...overrides });
  const toggleOrder = order === "asc" ? "desc" : "asc";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <UserFilterBar locale={locale} initial={{ q, tier, status }} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              {result ? `${result.total} pengguna · hal ${result.page}/${result.totalPages}` : "—"} · sort {sort} {order}
            </span>
            <div className="flex gap-1">
              <Button asChild variant={sort === "created_at" ? "secondary" : "outline"} size="sm">
                <Link href={buildUrl(locale, { q, tier, status, sort: "created_at", order: sort === "created_at" ? toggleOrder : "desc", page: "1" })}>
                  Tanggal <ArrowUpDown className="h-3 w-3" />
                </Link>
              </Button>
              <Button asChild variant={sort === "balance" ? "secondary" : "outline"} size="sm">
                <Link href={buildUrl(locale, { q, tier, status, sort: "balance", order: toggleOrder, page: "1" })}>Saldo</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={buildUrl(locale, { q, tier, status, sort, order: toggleOrder, page: "1" })}>{order === "asc" ? "↑ asc" : "↓ desc"}</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!result ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Supabase env not configured. Set SUPABASE_URL + SUPABASE_SECRET_KEY.</CardContent>
        </Card>
      ) : result.data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t("noData")}</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">
                        <Link href={preserve({ sort: "email", order: sort === "email" && order === "asc" ? "desc" : "asc", page: "1" })} className="inline-flex items-center gap-1 hover:underline">
                          {t("columns.email")} <ArrowUpDown className="h-3 w-3" />
                        </Link>
                      </th>
                      <th className="p-3 text-left">
                        <Link href={preserve({ sort: "balance", order: sort === "balance" && order === "asc" ? "desc" : "asc", page: "1" })} className="inline-flex items-center gap-1 hover:underline">
                          {t("columns.balance")} <ArrowUpDown className="h-3 w-3" />
                        </Link>
                      </th>
                      <th className="p-3 text-left">{t("columns.tier")}</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">
                        <Link href={preserve({ sort: "created_at", order: sort === "created_at" && order === "asc" ? "desc" : "asc", page: "1" })} className="inline-flex items-center gap-1 hover:underline">
                          {t("columns.created")} <ArrowUpDown className="h-3 w-3" />
                        </Link>
                      </th>
                      <th className="p-3 text-left">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((u) => (
                      <tr key={u.user_id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <div className="font-medium">{u.email}</div>
                          <div className="font-mono text-xs text-muted-foreground">{u.user_id.slice(0, 8)}…</div>
                          {u.display_name && <div className="text-xs">{u.display_name}</div>}
                        </td>
                        <td className="p-3">{u.balance}</td>
                        <td className="p-3">
                          <Badge variant={u.tier === "plus" ? "default" : "secondary"}>{u.tier}</Badge>
                        </td>
                        <td className="p-3">
                          {u.isSuspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="outline">Aktif</Badge>}
                          {u.isSuspended && u.banned_until && <div className="text-[11px] text-muted-foreground">sampai {new Date(u.banned_until).toLocaleDateString()}</div>}
                        </td>
                        <td className="p-3 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID") : "—"}</td>
                        <td className="p-3">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/${locale}/users/${u.user_id}`}>{t("detail")}</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {result.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {result.total} total · {result.data.length} di hal {result.page}
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" disabled={result.page <= 1}>
                  <Link href={buildUrl(locale, { q, tier, status, sort, order, page: String(result.page - 1) })} aria-disabled={result.page <= 1}>
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Link>
                </Button>
                <span className="flex items-center px-2 text-sm">
                  {result.page} / {result.totalPages}
                </span>
                <Button asChild variant="outline" size="sm" disabled={result.page >= result.totalPages}>
                  <Link href={buildUrl(locale, { q, tier, status, sort, order, page: String(result.page + 1) })} aria-disabled={result.page >= result.totalPages}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
