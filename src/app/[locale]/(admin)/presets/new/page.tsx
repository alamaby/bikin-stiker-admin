import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DetailForm } from "../_components/detail-form";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { toolbarBtn } from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";

export const dynamic = "force-dynamic";

export default async function NewPresetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "presets" });
  const tc = await getTranslations({ locale, namespace: "common" });

  return (
    <div>
      <PageBreadcrumb pageTitle={t("create")} homeHref={buildLocaleHref(locale, "/presets")} homeLabel={tc("home")} />
      <div className="mb-6 flex items-center gap-2">
        <Link href={buildLocaleHref(locale, "/presets")} className={toolbarBtn(false)}>
          <ArrowLeft className="size-4" /> Kembali
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Tambah Preset Baru</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Isi ID unik, label, dan style descriptor. Tanggal valid dalam WIB.</p>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          <DetailForm locale={locale} isNew />
        </div>
      </div>
    </div>
  );
}
