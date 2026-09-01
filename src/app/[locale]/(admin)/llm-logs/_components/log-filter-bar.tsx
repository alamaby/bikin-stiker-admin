"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

export function LogFilterBar({
  locale,
  initial,
}: {
  locale: string;
  initial: { q: string; provider: string; success: string; type: string; config_id: string; preset: string; date_from: string; date_to: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [q, setQ] = React.useState(initial.q);
  const [provider, setProvider] = React.useState(initial.provider);
  const [success, setSuccess] = React.useState(initial.success);
  const [type, setType] = React.useState(initial.type);
  const [configId, setConfigId] = React.useState(initial.config_id);
  const [preset, setPreset] = React.useState(initial.preset);
  const [dateFrom, setDateFrom] = React.useState(initial.date_from);
  const [dateTo, setDateTo] = React.useState(initial.date_to);

  function push(params: Record<string, string>) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v.trim() !== "" && v !== "all") usp.set(k, v);
    });
    startTransition(() => router.push(`/${locale}/llm-logs?${usp.toString()}`));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    push({ q, provider, success, type, config_id: configId, preset, date_from: dateFrom, date_to: dateTo, page: "1" });
  }

  function handleClear() {
    startTransition(() => router.push(`/${locale}/llm-logs`));
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <div className="grid gap-1">
        <label className="text-xs font-medium">Tipe</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending}>
          <option value="all">Semua</option>
          <option value="image">Image</option>
          <option value="reasoning">Reasoning</option>
          <option value="surprise">Surprise</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Provider</label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending}>
          <option value="all">Semua</option>
          <option value="openrouter">openrouter</option>
          <option value="gemini">gemini</option>
          <option value="pollinations">pollinations</option>
          <option value="pixazo">pixazo</option>
          <option value="ollama">ollama</option>
          <option value="cerebras">cerebras</option>
          <option value="cloudflare">cloudflare</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Status</label>
        <select value={success} onChange={(e) => setSuccess(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending}>
          <option value="all">Semua</option>
          <option value="success">Sukses</option>
          <option value="fail">Gagal</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Config ID</label>
        <input value={configId} onChange={(e) => setConfigId(e.target.value)} placeholder="config_id (opsional)" className="h-9 rounded-md border bg-background px-3 text-sm font-mono text-xs" disabled={pending} />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Preset</label>
        <input value={preset} onChange={(e) => setPreset(e.target.value)} placeholder="preset id" className="h-9 rounded-md border bg-background px-3 text-sm font-mono text-xs" disabled={pending} />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Cari prompt/provider/model</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="prompt / provider / model / error" className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending} />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Dari tanggal</label>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending} />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Sampai tanggal</label>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending} />
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
