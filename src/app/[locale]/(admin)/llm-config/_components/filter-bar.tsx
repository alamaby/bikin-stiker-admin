"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { FormLabel, TextInput, SelectInput } from "@/components/form/controls";
import { filterActions, filterSubmitBtn, toolbarBtn } from "@/components/tables/table-styles";

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
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <div>
        <FormLabel>Route</FormLabel>
        <SelectInput value={route} onChange={(e) => setRoute(e.target.value)} disabled={pending}>
          <option value="all">All</option>
          <option value="default">default</option>
          <option value="reasoning">reasoning</option>
          <option value="experiment">experiment</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>Provider</FormLabel>
        <SelectInput value={provider} onChange={(e) => setProvider(e.target.value)} disabled={pending}>
          <option value="all">All</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </SelectInput>
      </div>
      <div>
        <FormLabel>Status</FormLabel>
        <SelectInput value={active} onChange={(e) => setActive(e.target.value)} disabled={pending}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>Q</FormLabel>
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="label / provider / model" disabled={pending} />
      </div>
      <div className={filterActions}>
        <button type="submit" className={filterSubmitBtn} disabled={pending} aria-busy={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Filter
        </button>
        <button type="button" className={toolbarBtn(false)} onClick={handleClear} disabled={pending}>
          Clear
        </button>
      </div>
    </form>
  );
}
