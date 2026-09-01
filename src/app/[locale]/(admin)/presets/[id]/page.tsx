import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ScrollText, Calendar } from "lucide-react";
import { DetailForm } from "../_components/detail-form";
import { DeleteButton } from "../_components/delete-button";

export const dynamic = "force-dynamic";

function getValidStatus(p: Record<string, unknown> & { is_active: boolean; valid_from: string | null; valid_until: string | null }, now = new Date()) {
  if (!p.is_active) return { key: "inactive", label: "Nonaktif", variant: "secondary" as const };
  if (p.valid_from && new Date(p.valid_from) > now) return { key: "scheduled", label: "Terjadwal", variant: "outline" as const };
  if (p.valid_until && new Date(p.valid_until) < now) return { key: "expired", label: "Kedaluwarsa", variant: "destructive" as const };
  return { key: "active", label: "Aktif", variant: "default" as const };
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
  const p = await getPreset(id);
  if (!p) notFound();
  const st = getValidStatus(p);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${locale}/presets`}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        </Button>
        <span className="text-xl">{p.emoji ?? ""}</span>
        <h1 className="text-xl font-bold">{p.label}</h1>
        <Badge variant={st.variant}>{st.label}</Badge>
        <Badge variant={p.required_role === "plus" ? "default" : "secondary"}>{p.required_role}</Badge>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3 text-sm">
          <span className="font-mono text-xs">{p.id}</span>
          <span className="text-muted-foreground">sort {p.sort_order}</span>
          <span className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3" /> {formatWIB(p.valid_from)} → {formatWIB(p.valid_until)}
          </span>
          <div className="ml-auto flex gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/${locale}/llm-logs?preset=${p.id}`}>
                <ScrollText className="h-4 w-4" /> Lihat Log LLM untuk preset ini
              </Link>
            </Button>
            <DeleteButton id={p.id} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail & Edit</CardTitle>
          <CardDescription>
            Dibuat {p.created_at ? new Date(p.created_at).toLocaleString("id-ID") : "—"} · Diperbarui {p.updated_at ? new Date(p.updated_at).toLocaleString("id-ID") : "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailForm preset={p} locale={locale} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Raw</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(p, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
