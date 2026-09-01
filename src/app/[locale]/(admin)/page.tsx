import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const data = await getSummary();

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Supabase env not configured. Set SUPABASE_URL + SUPABASE_SECRET_KEY in Vercel / .env.local to see live data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const successRate = data.totalGen ? Math.round((data.successCount / Math.min(data.totalGen, 1000)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("totalUsers")}</CardTitle>
            <CardDescription>
              {t("newUsers7d")}: {data.users7} · {t("newUsers30d")}: {data.users30}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("totalGenerations")}</CardTitle>
            <CardDescription>
              {t("generations7d")}: {data.gen7} · {t("generations30d")}: {data.gen30}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.totalGen}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("successRate")}</CardTitle>
            <CardDescription>sample 1000</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{successRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("creditsCirculating")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.totalBalance}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("recentGenerations")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <ul className="space-y-2">
                {data.recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>
                    <span>{r.preset_name}</span>
                    <Badge variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                      {r.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("byProvider")}</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data.providerCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs yet</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(data.providerCounts).map(([k, v]) => (
                  <li key={k} className="flex justify-between text-sm">
                    <span>{k}</span>
                    <Badge variant="outline">{v}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
