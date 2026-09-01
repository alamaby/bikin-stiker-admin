"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

export function UserFilterBar({
  locale,
  initial,
}: {
  locale: string;
  initial: { q: string; tier: string; status: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [q, setQ] = React.useState(initial.q);
  const [tier, setTier] = React.useState(initial.tier);
  const [status, setStatus] = React.useState(initial.status);

  function push(params: Record<string, string>) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v.trim() !== "" && v !== "all") usp.set(k, v);
    });
    startTransition(() => router.push(`/${locale}/users?${usp.toString()}`));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    push({ q, tier, status, page: "1" });
  }

  function handleClear() {
    startTransition(() => router.push(`/${locale}/users`));
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
      <div className="grid gap-1">
        <label className="text-xs font-medium">Cari</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="email / id / display" className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending} />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Tier</label>
        <select value={tier} onChange={(e) => setTier(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending}>
          <option value="all">Semua</option>
          <option value="free">free</option>
          <option value="plus">plus</option>
          <option value="guest">guest</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending}>
          <option value="all">Semua</option>
          <option value="active">Aktif</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      <div className="flex items-end gap-2">
        <Button type="submit" size="sm" variant="secondary" disabled={pending} aria-busy={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Filter
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={pending}>
          Clear
        </Button>
      </div>
    </form>
  );
}
