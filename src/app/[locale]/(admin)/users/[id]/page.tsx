import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { SuspendSection } from "./suspend-button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TailBadge from "@/components/ui/badge/TailBadge";
import { toolbarBtn } from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const tc = await getTranslations({ locale, namespace: "common" });
  const tu = await getTranslations({ locale, namespace: "users" });
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return <p>Missing Supabase env</p>;

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: wallet } = await supabase.from("user_wallets").select("*").eq("user_id", id).maybeSingle();
  const { data: sub } = await supabase.from("user_subscriptions").select("*").eq("user_id", id).order("expires_at", { ascending: false }).limit(1).maybeSingle();
  const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", id).maybeSingle();
  const { data: txs } = await supabase.from("credit_transactions").select("id,amount,type,created_at,reason").eq("user_id", id).order("created_at", { ascending: false }).limit(10);
  const { data: gens } = await supabase.from("sticker_generations").select("id,preset_name,status,cost,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10);
  const { data: authUser } = await supabase.auth.admin.getUserById(id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user: any = authUser.user;
  const bannedUntil = user?.banned_until ?? null;
  // eslint-disable-next-line react-hooks/purity
  const isSuspended = bannedUntil ? new Date(bannedUntil).getTime() > Date.now() : false;
  const dateLocale = locale === "en" ? "en-US" : "id-ID";

  return (
    <div>
      <PageBreadcrumb pageTitle={user?.email ?? tu("detail")} homeHref={buildLocaleHref(locale, "/users")} homeLabel={tc("home")} />
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Link href={buildLocaleHref(locale, "/users")} className={toolbarBtn(false)}>
          <ArrowLeft className="size-4" /> {tc("back")}
        </Link>
        {isSuspended ? (
          <TailBadge variant="solid" color="error">
            Suspended
          </TailBadge>
        ) : (
          <TailBadge color="light">{tc("active")}</TailBadge>
        )}
      </div>
      <p className="mb-6 font-mono text-xs text-gray-500 dark:text-gray-400">{id}</p>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{tu("wallet")}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tu("balanceAndProfile")}</p>
          </div>
          <div className="space-y-2 border-t border-gray-100 p-4 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300 sm:p-6">
            <p>
              {tc("email")}: {user?.email ?? "—"}
            </p>
            <p>
              {tu("displayName")}: {profile?.display_name ?? "—"}
            </p>
            <p>
              {tu("columns.balance")}: {wallet?.balance ?? 0}
            </p>
            <p>
              {tu("updated")}: {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleString(dateLocale) : "—"}
            </p>
            <p>
              {tu("deleted")}: {profile?.is_deleted ? tc("yes") : tc("no")}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{tu("subscription")}</h3>
          </div>
          <div className="space-y-2 border-t border-gray-100 p-4 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300 sm:p-6">
            <p>
              {tu("columns.tier")}: {sub ? <TailBadge color={sub.tier === "plus" ? "primary" : "light"}>{sub.tier}</TailBadge> : "free"}
            </p>
            <p>
              {tu("expires")}: {sub?.expires_at ? new Date(sub.expires_at).toLocaleString(dateLocale) : "—"}
            </p>
            <p>
              {tc("active")}: {sub?.is_active ? tc("yes") : tc("no")}
            </p>
            {isSuspended && (
              <p className="text-xs text-error-600 dark:text-error-400">
                {tu("bannedUntil")} {bannedUntil ? new Date(bannedUntil).toLocaleString(dateLocale) : "—"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:mt-6">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{tu("suspendOrActivate")}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tu("suspendDescription")}</p>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          <SuspendSection id={id} isSuspended={isSuspended} bannedUntil={bannedUntil} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:mt-6">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{tu("recentTransactions")}</h3>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          {!txs?.length ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{tu("noTransactions")}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {txs.map((t) => (
                <li key={t.id} className="flex justify-between border-b border-gray-100 py-1 text-xs text-gray-700 dark:border-white/5 dark:text-gray-300">
                  <span>{t.type}</span>
                  <span className={t.amount < 0 ? "text-error-600 dark:text-error-400" : "text-success-600 dark:text-success-400"}>{t.amount}</span>
                  <span>{new Date(t.created_at).toLocaleString(dateLocale)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:mt-6">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{tu("recentGenerations")}</h3>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          {!gens?.length ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{tu("noGenerations")}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {gens.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 border-b border-gray-100 py-1 text-xs text-gray-700 dark:border-white/5 dark:text-gray-300">
                  <span>{g.preset_name}</span>
                  <TailBadge variant="light" color={g.status === "success" ? "success" : g.status === "failed" ? "error" : "light"}>
                    {g.status}
                  </TailBadge>
                  <span>{new Date(g.created_at).toLocaleString(dateLocale)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
