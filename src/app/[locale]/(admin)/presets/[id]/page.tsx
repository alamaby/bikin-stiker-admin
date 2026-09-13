import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft, ScrollText, Calendar } from "lucide-react";
import { DetailForm } from "../_components/detail-form";
import { DeleteButton } from "../_components/delete-button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TailBadge from "@/components/ui/badge/TailBadge";
import { toolbarBtn } from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function getValidStatus(p: Record<string, unknown> & { is_active: boolean; valid_from: string | null; valid_until: string | null }, now = new Date()) {
  if (!p.is_active) return { key: "inactive", label: "Nonaktif", color: "light" as const };
  if (p.valid_from && new Date(p.valid_from) > now) return { key: "scheduled", label: "Terjadwal", color: "light" as const };
  if (p.valid_until && new Date(p.valid_until) < now) return { key: "expired", label: "Kedaluwarsa", color: "error" as const };
  return { key: "active", label: "Aktif", color: "success" as const };
}

function formatWIB(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB";
  } catch {
    return iso;
  }
}

async function getPreset(id: string) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await supabase.from("sticker_presets").select("*").eq("id", id).maybeSingle();
  return data;
}

export default async function PresetDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const tc = await getTranslations({ locale, namespace: "common" });
  const p = await getPreset(id);
  if (!p) notFound();
  const st = getValidStatus(p);

  return (
    <div>
      <PageBreadcrumb pageTitle={p.label} homeHref={buildLocaleHref(locale, "/presets")} homeLabel={tc("home")} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link href={buildLocaleHref(locale, "/presets")} className={toolbarBtn(false)}>
          <ArrowLeft className="size-4" /> Kembali
        </Link>
        <span className="text-xl">{p.emoji ?? ""}</span>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">{p.label}</h1>
        <TailBadge variant="light" color={st.color}>{st.label}</TailBadge>
        <TailBadge color={p.required_role === "plus" ? "primary" : "light"}>{p.required_role}</TailBadge>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{p.id}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">sort {p.sort_order}</span>
        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="size-3.5" /> {formatWIB(p.valid_from)} → {formatWIB(p.valid_until)}
        </span>
        <div className="ml-auto flex gap-2">
          <Link href={buildLocaleHref(locale, `/llm-logs?preset=${p.id}`)} className={toolbarBtn(false)}>
            <ScrollText className="size-4" /> Lihat Log LLM untuk preset ini
          </Link>
          <DeleteButton id={p.id} />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Detail & Edit</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Dibuat {p.created_at ? new Date(p.created_at).toLocaleString("id-ID") : "—"} · Diperbarui {p.updated_at ? new Date(p.updated_at).toLocaleString("id-ID") : "—"}
          </p>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          <DetailForm preset={p} locale={locale} />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5">
          <h3 className="text-sm font-medium text-gray-800 dark:text-white/90">Raw</h3>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-white/5 dark:text-gray-300">{JSON.stringify(p, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
