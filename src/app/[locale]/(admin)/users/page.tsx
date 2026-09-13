import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { UserFilterBar } from "./_components/filter-bar";
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
  tdTitle,
  tdSub,
  toolbarBtn,
  sortLink,
} from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";

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
  return `${buildLocaleHref(locale, "/users")}${qs ? `?${qs}` : ""}`;
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
  const tc = await getTranslations({ locale, namespace: "common" });

  const result = await getUsers({ q, tier, status, sort, order, page, perPage });

  const preserve = (overrides: Record<string, string | undefined>) => buildUrl(locale, { q, tier, status, sort, order, page: String(page), ...overrides });
  const toggleOrder = order === "asc" ? "desc" : "asc";

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} homeHref={buildLocaleHref(locale, "/")} homeLabel={tc("home")} />
      <p className="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <UserFilterBar locale={locale} initial={{ q, tier, status }} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
            {result ? `${result.total} pengguna · hal ${result.page}/${result.totalPages}` : "—"} · sort {sort} {order}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Link href={buildUrl(locale, { q, tier, status, sort: "created_at", order: sort === "created_at" ? toggleOrder : "desc", page: "1" })} className={toolbarBtn(sort === "created_at")}>
              Tanggal <ArrowUpDown className="size-3.5" />
            </Link>
            <Link href={buildUrl(locale, { q, tier, status, sort: "balance", order: toggleOrder, page: "1" })} className={toolbarBtn(sort === "balance")}>
              Saldo
            </Link>
            <Link href={buildUrl(locale, { q, tier, status, sort, order: toggleOrder, page: "1" })} className={toolbarBtn(false)}>
              {order === "asc" ? "↑ asc" : "↓ desc"}
            </Link>
          </div>
        </div>
      </div>

      {!result ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Supabase env not configured. Set SUPABASE_URL + SUPABASE_SECRET_KEY.
        </div>
      ) : result.data.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          {t("noData")}
        </div>
      ) : (
        <>
          <div className={tableWrap}>
            <div className={tableScroll}>
              <div className="min-w-[860px]">
                <Table>
                  <TableHeader className={tableHeadRow}>
                    <TableRow>
                      <TableCell isHeader className={thCell}>
                        <Link href={preserve({ sort: "email", order: sort === "email" && order === "asc" ? "desc" : "asc", page: "1" })} className={sortLink}>
                          {t("columns.email")} <ArrowUpDown className="size-3.5" />
                        </Link>
                      </TableCell>
                      <TableCell isHeader className={thCell}>
                        <Link href={preserve({ sort: "balance", order: sort === "balance" && order === "asc" ? "desc" : "asc", page: "1" })} className={sortLink}>
                          {t("columns.balance")} <ArrowUpDown className="size-3.5" />
                        </Link>
                      </TableCell>
                      <TableCell isHeader className={thCell}>{t("columns.tier")}</TableCell>
                      <TableCell isHeader className={thCell}>Status</TableCell>
                      <TableCell isHeader className={thCell}>
                        <Link href={preserve({ sort: "created_at", order: sort === "created_at" && order === "asc" ? "desc" : "asc", page: "1" })} className={sortLink}>
                          {t("columns.created")} <ArrowUpDown className="size-3.5" />
                        </Link>
                      </TableCell>
                      <TableCell isHeader className={thCell}>Detail</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={tableBody}>
                    {result.data.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className={tdCell}>
                          <span className={tdTitle}>{u.email}</span>
                          <span className={`${tdSub} font-mono`}>{u.user_id.slice(0, 8)}...</span>
                          {u.display_name && <span className={tdSub}>{u.display_name}</span>}
                        </TableCell>
                        <TableCell className={tdCell}>{u.balance}</TableCell>
                        <TableCell className={tdCell}>
                          <TailBadge color={u.tier === "plus" ? "primary" : "light"}>{u.tier}</TailBadge>
                        </TableCell>
                        <TableCell className={tdCell}>
                          {u.isSuspended ? <TailBadge variant="solid" color="error">Suspended</TailBadge> : <TailBadge color="light">Aktif</TailBadge>}
                          {u.isSuspended && u.banned_until && <span className={`${tdSub} mt-1 text-[11px]`}>sampai {new Date(u.banned_until).toLocaleDateString()}</span>}
                        </TableCell>
                        <TableCell className={`${tdCell} text-xs`}>{u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID") : "—"}</TableCell>
                        <TableCell className={tdCell}>
                          <Link href={buildLocaleHref(locale, `/users/${u.user_id}`)} className={toolbarBtn(false)}>
                            {t("detail")}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              pageSize={perPage}
              summary={(total, shown, pg) => `${total} total · ${shown} di hal ${pg}`}
              getHref={(p) => buildUrl(locale, { q, tier, status, sort, order, page: String(p) })}
            />
          </div>
        </>
      )}
    </div>
  );
}
