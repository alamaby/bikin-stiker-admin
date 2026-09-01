"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

export function FilterBar({
  locale,
  initial,
  providers,
  view,
  sort,
  order,
}: {
  locale: string;
  initial: { route: string; provider: string; active: string; q: string };
  providers: string[];
  view: string;
  sort: string;
  order: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [route, setRoute] = React.useState(initial.route);
  const [provider, setProvider] = React.useState(initial.provider);
  const [active, setActive] = React.useState(initial.active);
  const [q, setQ] = React.useState(initial.q);

  // Sync when URL changes via navigation - use key remount instead of effect sync
  // Keep initial values as default; user typing is local state, URL change will remount via key in parent
  void initial;

  function push(params: Record<string, string>) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== "all" && v.trim() !== "") usp.set(k, v);
    });
    startTransition(() => router.push(`/${locale}/llm-config?${usp.toString()}`));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    push({ route, provider, active, q, view, sort, order, page: "1" });
  }

  function handleClear() {
    push({ view, sort, order });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
      <div className="grid gap-1">
        <label className="text-xs font-medium">Route</label>
        <select value={route} onChange={(e) => setRoute(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending}>
          <option value="all">All</option>
          <option value="default">default</option>
          <option value="reasoning">reasoning</option>
          <option value="experiment">experiment</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Provider</label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending}>
          <option value="all">All</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Status</label>
        <select value={active} onChange={(e) => setActive(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={pending}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Q</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="label / provider / model" className="h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50" disabled={pending} />
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
