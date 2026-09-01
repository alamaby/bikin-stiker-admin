import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SuspendSection } from "./suspend-button";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return <p>Missing Supabase env</p>;

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: wallet } = await supabase.from("user_wallets").select("*").eq("user_id", id).maybeSingle();
  const { data: sub } = await supabase.from("user_subscriptions").select("*").eq("user_id", id).order("expires_at", { ascending: false }).limit(1).maybeSingle();
  const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", id).maybeSingle();
  const { data: txs } = await supabase.from("credit_transactions").select("id,amount,type,created_at,reason").eq("user_id", id).order("created_at", { ascending: false }).limit(10);
  const { data: gens } = await supabase.from("sticker_generations").select("id,preset_name,status,cost,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10);
  const { data: authUser } = await supabase.auth.admin.getUserById(id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user: any = authUser.user;
  const bannedUntil = user?.banned_until ?? null;
  // eslint-disable-next-line react-hooks/purity
  const isSuspended = bannedUntil ? new Date(bannedUntil).getTime() > Date.now() : false;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${locale}/users`}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Detail Pengguna</h1>
        {isSuspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="outline">Aktif</Badge>}
      </div>
      <p className="font-mono text-xs text-muted-foreground">{id}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wallet</CardTitle>
            <CardDescription>Balance & profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Email: {user?.email ?? "—"}</p>
            <p>Display: {profile?.display_name ?? "—"}</p>
            <p>Balance: {wallet?.balance ?? 0}</p>
            <p>Updated: {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleString("id-ID") : "—"}</p>
            <p>Deleted: {profile?.is_deleted ? "Ya" : "Tidak"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Tier: {sub ? <Badge>{sub.tier}</Badge> : "free"}</p>
            <p>Expires: {sub?.expires_at ? new Date(sub.expires_at).toLocaleString("id-ID") : "—"}</p>
            <p>Active: {String(sub?.is_active ?? true)}</p>
            {isSuspended && <p className="text-xs text-destructive">Banned sampai {bannedUntil ? new Date(bannedUntil).toLocaleString("id-ID") : "—"}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suspend / Aktifkan</CardTitle>
          <CardDescription>Suspend memblokir login sementara (via Supabase Auth ban). Bisa dicabut kapan saja.</CardDescription>
        </CardHeader>
        <CardContent>
          <SuspendSection id={id} isSuspended={isSuspended} bannedUntil={bannedUntil} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaksi Terbaru (10)</CardTitle>
        </CardHeader>
        <CardContent>
          {!txs?.length ? (
            <p className="text-sm text-muted-foreground">No transactions</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {txs.map((t) => (
                <li key={t.id} className="flex justify-between border-b py-1 text-xs">
                  <span>{t.type}</span>
                  <span className={t.amount < 0 ? "text-destructive" : "text-green-600"}>{t.amount}</span>
                  <span>{new Date(t.created_at).toLocaleString("id-ID")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generasi Terbaru (10)</CardTitle>
        </CardHeader>
        <CardContent>
          {!gens?.length ? (
            <p className="text-sm text-muted-foreground">No generations</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {gens.map((g) => (
                <li key={g.id} className="flex justify-between border-b py-1 text-xs">
                  <span>{g.preset_name}</span>
                  <Badge variant={g.status === "success" ? "default" : g.status === "failed" ? "destructive" : "secondary"}>{g.status}</Badge>
                  <span>{new Date(g.created_at).toLocaleString("id-ID")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
