import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Users, ImagePlus, BadgeCheck, Coins, ScrollText } from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TailBadge from "@/components/ui/badge/TailBadge";
import { buildLocaleHref } from "@/lib/locale-href";

export const dynamic = "force-dynamic";

async function getSummary() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const now = new Date();
  const ago7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const ago30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: totalUsers }, { count: users7 }, { count: users30 }] = await Promise.all([
    supabase.from("user_wallets").select("*", { count: "exact", head: true }),
    supabase.from("user_wallets").select("*", { count: "exact", head: true }).gte("updated_at", ago7),
    supabase.from("user_wallets").select("*", { count: "exact", head: true }).gte("updated_at", ago30),
  ]);

  const [{ count: totalGen }, { count: gen7 }, { count: gen30 }] = await Promise.all([
    supabase.from("sticker_generations").select("*", { count: "exact", head: true }),
    supabase.from("sticker_generations").select("*", { count: "exact", head: true }).gte("created_at", ago7),
    supabase.from("sticker_generations").select("*", { count: "exact", head: true }).gte("created_at", ago30),
  ]);

  const { data: successRows } = await supabase.from("sticker_generations").select("status").eq("status", "success").limit(1000);
  const { data: recent } = await supabase.from("sticker_generations").select("id,preset_name,status,created_at").order("created_at", { ascending: false }).limit(5);
  const { data: providers } = await supabase.from("image_generation_attempt_logs").select("provider_name").order("created_at", { ascending: false }).limit(100);
  const { data: wallets } = await supabase.from("user_wallets").select("balance").limit(1000);

  const totalBalance = wallets?.reduce((sum, w) => sum + (w.balance ?? 0), 0) ?? 0;
  const providerCounts =
    providers?.reduce<Record<string, number>>((acc, r) => {
      acc[r.provider_name] = (acc[r.provider_name] ?? 0) + 1;
      return acc;
    }, {}) ?? {};

  return {
    totalUsers: totalUsers ?? 0,
    users7: users7 ?? 0,
    users30: users30 ?? 0,
    totalGen: totalGen ?? 0,
    gen7: gen7 ?? 0,
    gen30: gen30 ?? 0,
    successCount: successRows?.length ?? 0,
    recent: recent ?? [],
    totalBalance,
    providerCounts,
  };
}

function MetricCard({
  icon,
  label,
  value,
  footer,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  footer?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90">
        {icon}
      </div>
      <div className="mt-5 flex items-end justify-between gap-2">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">{value}</h4>
        </div>
        {footer}
      </div>
    </>
  );
  const cls = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6";
  return href ? (
    <Link href={href} className={`${cls} transition hover:shadow-theme-sm`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const data = await getSummary();

  if (!data) {
    return (
      <div>
        <PageBreadcrumb pageTitle={t("title")} homeHref={buildLocaleHref(locale, "/")} homeLabel={tc("home")} />
        <p className="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Supabase env not configured. Set SUPABASE_URL + SUPABASE_SECRET_KEY in Vercel / .env.local to see live data.
          </p>
        </div>
      </div>
    );
  }

  const successRate = data.totalGen ? Math.round((data.successCount / Math.min(data.totalGen, 1000)) * 100) : 0;

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} homeHref={buildLocaleHref(locale, "/")} homeLabel={tc("home")} />
      <p className="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <MetricCard
          icon={<Users className="size-6" />}
          label={t("totalUsers")}
          value={data.totalUsers}
          href={buildLocaleHref(locale, "/users")}
          footer={
            <TailBadge color="light" size="sm">
              +{data.users7} / 7d
            </TailBadge>
          }
        />
        <MetricCard
          icon={<ImagePlus className="size-6" />}
          label={t("totalGenerations")}
          value={data.totalGen}
          href={buildLocaleHref(locale, "/llm-logs")}
          footer={
            <TailBadge color="light" size="sm">
              +{data.gen7} / 7d
            </TailBadge>
          }
        />
        <MetricCard
          icon={<BadgeCheck className="size-6" />}
          label={t("successRate")}
          value={`${successRate}%`}
          footer={
            <TailBadge color="light" size="sm">
              sample 1000
            </TailBadge>
          }
        />
        <MetricCard
          icon={<Coins className="size-6" />}
          label={t("creditsCirculating")}
          value={data.totalBalance}
          footer={
            <TailBadge color="light" size="sm">
              +{data.gen30} / 30d
            </TailBadge>
          }
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 md:gap-6 md:mt-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{t("recentGenerations")}</h3>
            <Link href={buildLocaleHref(locale, "/llm-logs")} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline dark:text-brand-400">
              <ScrollText className="size-4" /> {t("allLogs")}
            </Link>
          </div>
          <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
            {data.recent.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No data</p>
            ) : (
              <ul className="space-y-2">
                {data.recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 p-2 text-sm dark:border-white/5">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{r.id.slice(0, 8)}</span>
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{r.preset_name}</span>
                    <TailBadge variant="light" color={r.status === "success" ? "success" : r.status === "failed" ? "error" : "light"}>
                      {r.status}
                    </TailBadge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{t("byProvider")}</h3>
          </div>
          <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
            {Object.keys(data.providerCounts).length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No logs yet</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(data.providerCounts).map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{k}</span>
                    <TailBadge color="light">{v}</TailBadge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-theme-xs text-gray-500 dark:text-gray-400">
              {t("newUsers30d")}: {data.users30} · {t("generations30d")}: {data.gen30}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
