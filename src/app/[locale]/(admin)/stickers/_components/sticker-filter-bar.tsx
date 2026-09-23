"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Loader2, ChevronDown, X } from "lucide-react";
import { FormLabel, TextInput, SelectInput } from "@/components/form/controls";
import { DatePicker } from "@/components/form/date-picker";
import {
  filterGrid4,
  filterActions,
  filterSubmitBtn,
  toolbarBtn,
} from "@/components/tables/table-styles";
import { countActiveFilters } from "@/lib/stickers";
import type { ProviderModelMap } from "@/lib/stickers";

const PROVIDERS = ["openrouter", "gemini", "pollinations", "pixazo", "ollama", "cerebras", "cloudflare"];

export function StickerFilterBar({
  locale,
  initial,
  modelMap,
  defaultOpen,
}: {
  locale: string;
  initial: { q: string; status: string; provider: string; model: string; rating: string; flagged: string; date_from: string; date_to: string };
  modelMap: ProviderModelMap;
  defaultOpen: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("filters");
  const [pending, startTransition] = React.useTransition();
  const [q, setQ] = React.useState(initial.q);
  const [status, setStatus] = React.useState(initial.status);
  const [provider, setProvider] = React.useState(initial.provider);
  const [model, setModel] = React.useState(initial.model);
  const [rating, setRating] = React.useState(initial.rating);
  const [flagged, setFlagged] = React.useState(initial.flagged);
  const [dateFrom, setDateFrom] = React.useState(initial.date_from);
  const [dateTo, setDateTo] = React.useState(initial.date_to);
  const [open, setOpen] = React.useState(defaultOpen);

  const filters = React.useMemo(
    () => ({ q, status, provider, model, rating, flagged, date_from: dateFrom, date_to: dateTo }),
    [q, status, provider, model, rating, flagged, dateFrom, dateTo],
  );

  const activeCount = countActiveFilters(filters);

  function modelsFor(p: string): string[] {
    if (p === "all") {
      const union = new Set<string>();
      for (const list of Object.values(modelMap)) {
        for (const m of list) union.add(m);
      }
      return Array.from(union).sort();
    }
    return modelMap[p] ?? [];
  }

  function push(params: Record<string, string>) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v.trim() !== "" && v !== "all") usp.set(k, v);
    });
    startTransition(() => router.push(`/${locale}/stickers?${usp.toString()}`));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    push({ q, status, provider, model, rating, flagged, date_from: dateFrom, date_to: dateTo, page: "1" });
  }

  function handleClear() {
    setQ("");
    setStatus("all");
    setProvider("all");
    setModel("all");
    setRating("all");
    setFlagged("all");
    setDateFrom("");
    setDateTo("");
    startTransition(() => router.push(`/${locale}/stickers`));
  }

  function removeParam(key: string) {
    const overrides: Record<string, string> = { page: "1" };
    if (key === "q") overrides.q = "";
    else if (key === "status") overrides.status = "all";
    else if (key === "provider") {
      overrides.provider = "all";
      overrides.model = "all";
    } else if (key === "model") overrides.model = "all";
    else if (key === "rating") overrides.rating = "all";
    else if (key === "flagged") overrides.flagged = "all";
    else if (key === "date_from") overrides.date_from = "";
    else if (key === "date_to") overrides.date_to = "";
    push(overrides);
  }

  const chips = React.useMemo(() => {
    const arr: Array<{ key: string; label: string }> = [];
    if (q) arr.push({ key: "q", label: `${t("q")}: ${q}` });
    if (status !== "all") arr.push({ key: "status", label: `${t("status")}: ${status}` });
    if (provider !== "all") arr.push({ key: "provider", label: `${t("provider")}: ${provider}` });
    if (rating !== "all") arr.push({ key: "rating", label: `${t("rating")}: ${rating}` });
    if (flagged !== "all") arr.push({ key: "flagged", label: `${t("flagged")}: ${flagged}` });
    if (dateFrom) arr.push({ key: "date_from", label: `${t("dateFrom")}: ${dateFrom}` });
    if (dateTo) arr.push({ key: "date_to", label: `${t("dateTo")}: ${dateTo}` });
    if (model && model !== "all") arr.push({ key: "model", label: `${t("model")}: ${model}` });
    return arr;
  }, [q, status, provider, model, rating, flagged, dateFrom, dateTo, t]);

  let modelOptions = modelsFor(provider);
  if (model && model !== "all" && !modelOptions.includes(model)) {
    modelOptions = [model, ...modelOptions];
  }

  function handleProviderChange(newProvider: string) {
    if (provider === newProvider) return;
    if (model && model !== "all" && newProvider !== "all" && !(modelMap[newProvider] ?? []).includes(model)) {
      setModel("all");
    }
    setProvider(newProvider);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={toolbarBtn(false) + " gap-1"}
          aria-expanded={open}
          aria-controls="sticker-filter-panel"
        >
          {t("filter")} ({activeCount})
          <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => removeParam(chip.key)}
            className={toolbarBtn(false) + " h-7 text-xs gap-1"}
          >
            {chip.label}
            <X className="size-3" />
          </button>
        ))}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className={toolbarBtn(false) + " h-7 text-xs ml-auto"}
          >
            {t("clear")}
          </button>
        )}
      </div>
      {open && (
        <div id="sticker-filter-panel" className="mt-3">
          <form onSubmit={handleSubmit} className={filterGrid4}>
            <div className="lg:col-span-2">
              <FormLabel>{t("q")}</FormLabel>
              <TextInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("promptPlaceholder")}
                disabled={pending}
                className="h-9"
              />
            </div>
            <div>
              <FormLabel>{t("status")}</FormLabel>
              <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} disabled={pending} className="h-9">
                <option value="all">{t("all")}</option>
                <option value="pending">{t("pending") ?? "Pending"}</option>
                <option value="success">{t("success")}</option>
                <option value="failed">{t("fail")}</option>
              </SelectInput>
            </div>
            <div>
              <FormLabel>{t("provider")}</FormLabel>
              <SelectInput value={provider} onChange={(e) => handleProviderChange(e.target.value)} disabled={pending} className="h-9">
                <option value="all">{t("all")}</option>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FormLabel>{t("model") ?? "Model"}</FormLabel>
              <SelectInput
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={pending}
                className="h-9 font-mono text-xs"
              >
                <option value="all">{t("all")}</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FormLabel>{t("rating") ?? "Rating"}</FormLabel>
              <SelectInput value={rating} onChange={(e) => setRating(e.target.value)} disabled={pending} className="h-9">
                <option value="all">{t("all")}</option>
                <option value="up">{t("up") ?? "Up"}</option>
                <option value="down">{t("down") ?? "Down"}</option>
                <option value="unrated">{t("unrated") ?? "Unrated"}</option>
              </SelectInput>
            </div>
            <div>
              <FormLabel>{t("flagged") ?? "Flagged"}</FormLabel>
              <SelectInput value={flagged} onChange={(e) => setFlagged(e.target.value)} disabled={pending} className="h-9">
                <option value="all">{t("all")}</option>
                <option value="flagged">{t("flagged") ?? "Flagged"}</option>
                <option value="clean">{t("clean") ?? "Clean"}</option>
              </SelectInput>
            </div>
            <div>
              <FormLabel>{t("dateFrom")}</FormLabel>
              <DatePicker
                value={dateFrom}
                onChange={setDateFrom}
                disabled={pending}
                ariaLabel={t("pickDate")}
              />
            </div>
            <div>
              <FormLabel>{t("dateTo")}</FormLabel>
              <DatePicker
                value={dateTo}
                onChange={setDateTo}
                disabled={pending}
                ariaLabel={t("clearDate")}
              />
            </div>
            <div className={`${filterActions} lg:col-span-4`}>
              <button type="submit" className={filterSubmitBtn} disabled={pending} aria-busy={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} {t("filter")}
              </button>
              <button type="button" className={toolbarBtn(false)} onClick={handleClear} disabled={pending}>
                {t("clear")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
