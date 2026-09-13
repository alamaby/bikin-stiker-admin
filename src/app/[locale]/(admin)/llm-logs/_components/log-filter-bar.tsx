"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";
import { FormLabel, TextInput, SelectInput } from "@/components/form/controls";
import { filterGrid4, filterActions, filterSubmitBtn, toolbarBtn } from "@/components/tables/table-styles";

export function LogFilterBar({
  locale,
  initial,
}: {
  locale: string;
  initial: { q: string; provider: string; success: string; type: string; config_id: string; preset: string; date_from: string; date_to: string };
}) {
  const router = useRouter();
  const t = useTranslations("filters");
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
    <form onSubmit={handleSubmit} className={filterGrid4}>
      <div>
        <FormLabel>{t("type")}</FormLabel>
        <SelectInput value={type} onChange={(e) => setType(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          <option value="image">Image</option>
          <option value="reasoning">Reasoning</option>
          <option value="surprise">Surprise</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>{t("provider")}</FormLabel>
        <SelectInput value={provider} onChange={(e) => setProvider(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          <option value="openrouter">openrouter</option>
          <option value="gemini">gemini</option>
          <option value="pollinations">pollinations</option>
          <option value="pixazo">pixazo</option>
          <option value="ollama">ollama</option>
          <option value="cerebras">cerebras</option>
          <option value="cloudflare">cloudflare</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>{t("status")}</FormLabel>
        <SelectInput value={success} onChange={(e) => setSuccess(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          <option value="success">{t("success")}</option>
          <option value="fail">{t("fail")}</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>{t("configId")}</FormLabel>
        <TextInput value={configId} onChange={(e) => setConfigId(e.target.value)} placeholder={t("configIdPlaceholder")} className="font-mono text-xs" disabled={pending} />
      </div>
      <div>
        <FormLabel>{t("preset")}</FormLabel>
        <TextInput value={preset} onChange={(e) => setPreset(e.target.value)} placeholder={t("presetPlaceholder")} className="font-mono text-xs" disabled={pending} />
      </div>
      <div>
        <FormLabel>{t("promptSearch")}</FormLabel>
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("promptPlaceholder")} disabled={pending} />
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
