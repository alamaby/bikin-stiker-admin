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

  return (
    <div>
      <PageBreadcrumb pageTitle={user?.email ?? "Detail Pengguna"} homeHref={buildLocaleHref(locale, "/users")} homeLabel={tc("home")} />
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Link href={buildLocaleHref(locale, "/users")} className={toolbarBtn(false)}>
          <ArrowLeft className="size-4" /> Kembali
        </Link>
        {isSuspended ? <TailBadge variant="solid" color="error">Suspended</TailBadge> : <TailBadge color="light">Aktif</TailBadge>}
      </div>
      <p className="mb-6 font-mono text-xs text-gray-500 dark:text-gray-400">{id}</p>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Wallet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Balance & profile</p>
          </div>
          <div className="space-y-2 border-t border-gray-100 p-4 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300 sm:p-6">
            <p>Email: {user?.email ?? "—"}</p>
            <p>Display: {profile?.display_name ?? "—"}</p>
            <p>Balance: {wallet?.balance ?? 0}</p>
            <p>Updated: {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleString("id-ID") : "—"}</p>
            <p>Deleted: {profile?.is_deleted ? "Ya" : "Tidak"}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Subscription</h3>
          </div>
          <div className="space-y-2 border-t border-gray-100 p-4 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300 sm:p-6">
            <p>Tier: {sub ? <TailBadge color={sub.tier === "plus" ? "primary" : "light"}>{sub.tier}</TailBadge> : "free"}</p>
            <p>Expires: {sub?.expires_at ? new Date(sub.expires_at).toLocaleString("id-ID") : "—"}</p>
            <p>Active: {String(sub?.is_active ?? true)}</p>
            {isSuspended && <p className="text-xs text-error-600 dark:text-error-400">Banned sampai {bannedUntil ? new Date(bannedUntil).toLocaleString("id-ID") : "—"}</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:mt-6">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Suspend / Aktifkan</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Suspend memblokir login sementara (via Supabase Auth ban). Bisa dicabut kapan saja.</p>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          <SuspendSection id={id} isSuspended={isSuspended} bannedUntil={bannedUntil} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:mt-6">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Transaksi Terbaru (10)</h3>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          {!txs?.length ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No transactions</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {txs.map((t) => (
                <li key={t.id} className="flex justify-between border-b border-gray-100 py-1 text-xs text-gray-700 dark:border-white/5 dark:text-gray-300">
                  <span>{t.type}</span>
                  <span className={t.amount < 0 ? "text-error-600 dark:text-error-400" : "text-success-600 dark:text-success-400"}>{t.amount}</span>
                  <span>{new Date(t.created_at).toLocaleString("id-ID")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:mt-6">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Generasi Terbaru (10)</h3>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          {!gens?.length ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No generations</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {gens.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 border-b border-gray-100 py-1 text-xs text-gray-700 dark:border-white/5 dark:text-gray-300">
                  <span>{g.preset_name}</span>
                  <TailBadge variant="light" color={g.status === "success" ? "success" : g.status === "failed" ? "error" : "light"}>{g.status}</TailBadge>
                  <span>{new Date(g.created_at).toLocaleString("id-ID")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
