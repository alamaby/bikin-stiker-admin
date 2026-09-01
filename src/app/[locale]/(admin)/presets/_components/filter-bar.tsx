"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

export function PresetFilterBar({
  locale,
  initial,
}: {
  locale: string;
  initial: { q: string; role: string; active: string; valid: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [q, setQ] = React.useState(initial.q);
  const [role, setRole] = React.useState(initial.role);
  const [active, setActive] = React.useState(initial.active);
  const [valid, setValid] = React.useState(initial.valid);

  function push(params: Record<string, string>) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v.trim() !== "" && v !== "all") usp.set(k, v);
    });
    startTransition(() => router.push(`/${locale}/presets?${usp.toString()}`));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    push({ q, role, active, valid, page: "1" });
  }

  function handleClear() {
    startTransition(() => router.push(`/${locale}/presets`));
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <div className="grid gap-1">
        <label className="text-xs font-medium">Cari</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="id / label / emoji / deskripsi" className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending} />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending}>
          <option value="all">Semua</option>
          <option value="guest">guest</option>
          <option value="free">free</option>
          <option value="plus">plus</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Aktif</label>
        <select value={active} onChange={(e) => setActive(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending}>
          <option value="all">Semua</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Jadwal</label>
        <select value={valid} onChange={(e) => setValid(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending}>
          <option value="all">Semua</option>
          <option value="active">Sedang aktif</option>
          <option value="scheduled">Terjadwal</option>
          <option value="expired">Kedaluwarsa</option>
        </select>
      </div>
      <div className="flex items-end gap-2 lg:col-span-4">
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
