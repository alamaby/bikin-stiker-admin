import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScrollText, ArrowLeft } from "lucide-react";
import { DetailForm } from "./detail-form";

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
  const c = await getConfig(id);
  if (!c) notFound();

  const masked = t("masked");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${locale}/llm-config`}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <h1 className="text-xl font-bold">
          {c.provider_name} / {c.model_name}
        </h1>
        <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "active" : "inactive"}</Badge>
        <Badge variant="outline">{c.route_scope}</Badge>
      </div>

      <div className="flex gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/${locale}/llm-logs?config_id=${c.id}`}>
            <ScrollText className="h-4 w-4" /> Lihat Log untuk config ini
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground self-center">— menampilkan attempt + enhancement yang pakai config ini</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail & Edit</CardTitle>
          <CardDescription>ID {c.id.slice(0, 8)}… · created {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}</CardDescription>
        </CardHeader>
        <CardContent>
          <DetailForm config={c} locale={locale} masked={masked} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Raw</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(c, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
