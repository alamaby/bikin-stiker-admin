import "server-only";

import type { HeaderNotification } from "@/components/header/NotificationDropdown";

function timeAgo(iso: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diff / 60000));
  if (mins < 60) return locale === "id" ? `${mins} mnt lalu` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === "id" ? `${hours} jam lalu` : `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return locale === "id" ? `${days} hari lalu` : `${days} days ago`;
}

export async function getHeaderNotifications(locale: string): Promise<HeaderNotification[]> {
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
        title: locale === "id" ? `${failedAttempts} generasi gagal` : `${failedAttempts} failed generations`,
        detail: locale === "id" ? "dalam 24 jam terakhir" : "in the last 24 hours",
        time: locale === "id" ? "ringkasan" : "summary",
        href: null,
        tone: "error",
      });
    }
    (recentFails ?? []).forEach((f) => {
      items.push({
        id: f.id,
        title: `${f.provider_name} / ${f.model_name}`,
        detail: (f.error_message ?? "failed").slice(0, 80),
        time: timeAgo(f.created_at, locale),
        href: null,
        tone: "error",
      });
    });
    return items.slice(0, 6);
  } catch {
    return [];
  }
}
