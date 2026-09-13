import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Alert from "@/components/ui/alert/Alert";
import { buildLocaleHref } from "@/lib/locale-href";

export default async function UnauthorizedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">403 – Unauthorized</h1>
        <div className="mt-4">
          <Alert variant="error" title="Akses ditolak" message={t("notAdmin")} />
        </div>
        <Link
          href={buildLocaleHref(locale, "/login")}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
