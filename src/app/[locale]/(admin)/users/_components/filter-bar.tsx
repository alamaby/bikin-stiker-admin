"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";
import { FormLabel, TextInput, SelectInput } from "@/components/form/controls";
import { filterGrid4, filterActions, filterSubmitBtn, toolbarBtn } from "@/components/tables/table-styles";

export function UserFilterBar({
  locale,
  initial,
}: {
  locale: string;
  initial: { q: string; tier: string; status: string };
}) {
  const router = useRouter();
  const t = useTranslations("filters");
  const tu = useTranslations("users");
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
    <form onSubmit={handleSubmit} className={filterGrid4}>
      <div>
        <FormLabel>{t("searchLabel")}</FormLabel>
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={tu("searchPlaceholder")} disabled={pending} />
      </div>
      <div>
        <FormLabel>{t("tier")}</FormLabel>
        <SelectInput value={tier} onChange={(e) => setTier(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          <option value="free">free</option>
          <option value="plus">plus</option>
          <option value="guest">guest</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>{t("status")}</FormLabel>
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} disabled={pending}>
          <option value="all">{t("all")}</option>
          <option value="active">{t("active")}</option>
          <option value="suspended">{t("suspended")}</option>
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
