import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScrollText, ArrowLeft } from "lucide-react";
import { DetailForm } from "./detail-form";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TailBadge from "@/components/ui/badge/TailBadge";
import { toolbarBtn } from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";

export const dynamic = "force-dynamic";

async function getConfig(id: string) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await supabase.from("image_generation_configs").select("*").eq("id", id).maybeSingle();
  return data;
}

export default async function LlmConfigDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "llmConfig" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const c = await getConfig(id);
  if (!c) notFound();

  const masked = t("masked");

  return (
    <div>
      <PageBreadcrumb pageTitle={`${c.provider_name} / ${c.model_name}`} homeHref={buildLocaleHref(locale, "/llm-config")} homeLabel={tc("home")} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link href={buildLocaleHref(locale, "/llm-config")} className={toolbarBtn(false)}>
          <ArrowLeft className="size-4" /> Back
        </Link>
        <TailBadge variant={c.is_active ? "light" : "light"} color={c.is_active ? "success" : "light"}>{c.is_active ? "active" : "inactive"}</TailBadge>
        <TailBadge color="light">{c.route_scope}</TailBadge>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={buildLocaleHref(locale, `/llm-logs?config_id=${c.id}`)} className={toolbarBtn(true)}>
          <ScrollText className="size-4" /> Lihat Log untuk config ini
        </Link>
        <span className="text-xs text-gray-500 dark:text-gray-400">— menampilkan attempt + enhancement yang pakai config ini</span>
      </div>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Detail & Edit</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ID {c.id.slice(0, 8)}... · created {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}</p>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          <DetailForm config={c} locale={locale} masked={masked} />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5">
          <h3 className="text-sm font-medium text-gray-800 dark:text-white/90">Raw</h3>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-white/5 dark:text-gray-300">{JSON.stringify(c, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
