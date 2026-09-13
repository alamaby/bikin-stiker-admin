"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";
import { FormLabel, TextInput, SelectInput } from "@/components/form/controls";
import { filterGrid4, filterActions, filterSubmitBtn, toolbarBtn } from "@/components/tables/table-styles";

export function PresetFilterBar({
  locale,
  initial,
}: {
  locale: string;
  initial: { q: string; role: string; active: string; valid: string };
}) {
  const router = useRouter();
  const t = useTranslations("filters");
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
    <form onSubmit={handleSubmit} className={`${filterGrid4} lg:grid-cols-5`}>
      <div>
        <FormLabel>{t("searchLabel")}</FormLabel>
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="id / label / emoji / deskripsi" disabled={pending} />
      </div>
      <div>
        <FormLabel>{t("role")}</FormLabel>
        <SelectInput value={role} onChange={(e) => setRole(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          <option value="guest">guest</option>
          <option value="free">free</option>
          <option value="plus">plus</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>{t("active")}</FormLabel>
        <SelectInput value={active} onChange={(e) => setActive(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          <option value="active">{t("active")}</option>
          <option value="inactive">{t("inactive")}</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>{t("schedule")}</FormLabel>
        <SelectInput value={valid} onChange={(e) => setValid(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          <option value="active">{t("scheduledNow")}</option>
          <option value="scheduled">{t("scheduledFuture")}</option>
          <option value="expired">{t("expired")}</option>
        </SelectInput>
      </div>
      <div className={filterActions}>
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
