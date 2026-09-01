import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function UnauthorizedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>403 – Unauthorized</CardTitle>
          <CardDescription>{t("notAdmin")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/${locale}/login`} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
