import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DetailForm } from "../_components/detail-form";

export const dynamic = "force-dynamic";

export default async function NewPresetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "presets" });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${locale}/presets`}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        </Button>
        <h1 className="text-xl font-bold">{t("create")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Preset Baru</CardTitle>
          <CardDescription>Isi ID unik, label, dan style descriptor. Tanggal valid dalam WIB.</CardDescription>
        </CardHeader>
        <CardContent>
          <DetailForm locale={locale} isNew />
        </CardContent>
      </Card>
    </div>
  );
}
