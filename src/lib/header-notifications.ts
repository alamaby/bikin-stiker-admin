import "server-only";

import { getTranslations } from "next-intl/server";
import type { HeaderNotification } from "@/components/header/NotificationDropdown";

export async function getHeaderNotifications(locale: string): Promise<HeaderNotification[]> {
  const t = await getTranslations({ locale, namespace: "header" });
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ count: failedAttempts }, { data: recentFails }] = await Promise.all([
      supabase
        .from("image_generation_attempt_logs")
        .select("*", { count: "exact", head: true })
        .eq("success", false)
        .gte("created_at", since),
      supabase
        .from("image_generation_attempt_logs")
        .select("id,provider_name,model_name,error_message,created_at")
        .eq("success", false)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const items: HeaderNotification[] = [];
    if ((failedAttempts ?? 0) > 0) {
      items.push({
        id: "failed-24h",
        title: `${failedAttempts} ${t("failedSummary")}`,
        detail: t("failedSummaryDetail"),
        time: t("summary"),
        href: null,
        tone: "error",
      });
    }
    (recentFails ?? []).forEach((f) => {
      const mins = Math.max(1, Math.floor((Date.now() - new Date(f.created_at).getTime()) / 60000));
      const time =
        mins < 60
          ? `${mins} ${t("minutesAgo")}`
          : mins < 1440
            ? `${Math.floor(mins / 60)} ${t("hoursAgo")}`
            : `${Math.floor(mins / 1440)} ${t("daysAgo")}`;
      items.push({
        id: f.id,
        title: `${f.provider_name} / ${f.model_name}`,
        detail: (f.error_message ?? "failed").slice(0, 80),
        time,
        href: null,
        tone: "error",
      });
    });
    return items.slice(0, 6);
  } catch {
    return [];
  }
}
