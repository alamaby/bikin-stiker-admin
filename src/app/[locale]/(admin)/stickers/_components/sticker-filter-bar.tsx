"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";
import { FormLabel, TextInput, SelectInput } from "@/components/form/controls";
import { filterGrid4, filterActions, filterSubmitBtn, toolbarBtn } from "@/components/tables/table-styles";

const PROVIDERS = ["openrouter", "gemini", "pollinations", "pixazo", "ollama", "cerebras", "cloudflare"];

export function StickerFilterBar({
  locale,
  initial,
}: {
  locale: string;
  initial: { q: string; status: string; provider: string; model: string; rating: string; flagged: string; date_from: string; date_to: string };
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
    startTransition(() => router.push(`/${locale}/stickers`));
  }

  return (
    <form onSubmit={handleSubmit} className={filterGrid4}>
      <div className="lg:col-span-2">
        <FormLabel>{t("q")}</FormLabel>
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("promptPlaceholder")} disabled={pending} />
      </div>
      <div>
        <FormLabel>{t("status")}</FormLabel>
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          <option value="pending">{t("pending") ?? "Pending"}</option>
          <option value="success">{t("success")}</option>
          <option value="failed">{t("fail")}</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>{t("provider")}</FormLabel>
        <SelectInput value={provider} onChange={(e) => setProvider(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </SelectInput>
      </div>
      <div>
        <FormLabel>{t("model") ?? "Model"}</FormLabel>
        <TextInput value={model} onChange={(e) => setModel(e.target.value)} placeholder="flux-1-schnell" disabled={pending} />
      </div>
      <div>
        <FormLabel>{t("rating") ?? "Rating"}</FormLabel>
        <SelectInput value={rating} onChange={(e) => setRating(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          <option value="up">{t("up") ?? "Up"}</option>
          <option value="down">{t("down") ?? "Down"}</option>
          <option value="unrated">{t("unrated") ?? "Unrated"}</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>{t("flagged") ?? "Flagged"}</FormLabel>
        <SelectInput value={flagged} onChange={(e) => setFlagged(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          <option value="flagged">{t("flagged") ?? "Flagged"}</option>
          <option value="clean">{t("clean") ?? "Clean"}</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>{t("dateFrom")}</FormLabel>
        <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={pending} />
      </div>
      <div>
        <FormLabel>{t("dateTo")}</FormLabel>
        <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} disabled={pending} />
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
  );
}
