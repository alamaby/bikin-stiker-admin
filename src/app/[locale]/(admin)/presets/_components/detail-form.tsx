"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { upsertPresetWithState, type ActionState } from "../actions";
import Alert from "@/components/ui/alert/Alert";
import { FormLabel, TextInput, SelectInput, CheckBox } from "@/components/form/controls";
import { toolbarBtn, filterSubmitBtn } from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";

const initialState: ActionState = { success: false, message: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("common");
  return (
    <button type="submit" className={filterSubmitBtn} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> {t("saving")}
        </>
      ) : (
        label
      )}
    </button>
  );
}

export function DetailForm({ preset, locale, isNew }: { preset?: any; locale: string; isNew?: boolean }) {
  const [state, formAction, isPending] = useActionState(upsertPresetWithState, initialState);
  const [showToast, setShowToast] = React.useState(false);
  const t = useTranslations("common");
  const tp = useTranslations("presets");

  React.useEffect(() => {
    if (state.message) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowToast(true);
      const tm = setTimeout(() => setShowToast(false), 3500);
      return () => clearTimeout(tm);
    }
  }, [state.message]);

  const p = preset;
  return (
    <>
      {showToast && state.message && (
        <div className="mb-4">
          <Alert
            variant={state.success ? "success" : "error"}
            title={state.success ? t("successTitle") : t("errorTitle")}
            message={state.message}
            onClose={() => setShowToast(false)}
          />
        </div>
      )}

      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        <div>
          <FormLabel>
            {tp("id")} * {isNew ? "" : tp("idCannotBeChanged")}
          </FormLabel>
          <TextInput name="id" defaultValue={p?.id ?? ""} placeholder="e.g. kawaii" required readOnly={!isNew} className={!isNew ? "bg-gray-50 dark:bg-white/5" : ""} disabled={isPending} />
        </div>
        <div>
          <FormLabel>{tp("label")} *</FormLabel>
          <TextInput name="label" defaultValue={p?.label ?? ""} required disabled={isPending} />
        </div>
        <div className="md:col-span-2">
          <FormLabel>Description</FormLabel>
          <TextInput name="description" defaultValue={p?.description ?? ""} disabled={isPending} />
        </div>
        <div>
          <FormLabel>{tp("emoji")}</FormLabel>
          <TextInput name="emoji" defaultValue={p?.emoji ?? ""} placeholder="🎨" disabled={isPending} />
        </div>
        <div>
          <FormLabel>{tp("role")}</FormLabel>
          <SelectInput name="required_role" defaultValue={p?.required_role ?? "free"} disabled={isPending}>
            <option value="guest">guest</option>
            <option value="free">free</option>
            <option value="plus">plus</option>
          </SelectInput>
        </div>
        <div className="md:col-span-2">
          <FormLabel>{tp("styleDescriptor")} *</FormLabel>
          <TextInput name="style_descriptor" defaultValue={p?.style_descriptor ?? ""} required placeholder="kawaii cute pastel chibi cartoon" disabled={isPending} />
        </div>
        <div className="md:col-span-2">
          <FormLabel>{tp("reasoningGuidance")}</FormLabel>
          <TextInput name="reasoning_guidance" defaultValue={p?.reasoning_guidance ?? ""} placeholder="Always include pastel colors..." disabled={isPending} />
        </div>
        <div>
          <FormLabel>{tp("sortOrder")}</FormLabel>
          <TextInput name="sort_order" type="number" defaultValue={p?.sort_order ?? 100} disabled={isPending} />
        </div>
        <div>
          <FormLabel>{tp("costOverride")}</FormLabel>
          <TextInput name="cost_override" type="number" defaultValue={p?.cost_override ?? ""} placeholder="1" disabled={isPending} />
        </div>
        <div>
          <FormLabel>{tp("validFromWib")}</FormLabel>
          <TextInput name="valid_from" type="datetime-local" defaultValue={p?.valid_from ? new Date(new Date(p.valid_from).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16) : ""} disabled={isPending} />
        </div>
        <div>
          <FormLabel>{tp("validUntilWib")}</FormLabel>
          <TextInput name="valid_until" type="datetime-local" defaultValue={p?.valid_until ? new Date(new Date(p.valid_until).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16) : ""} disabled={isPending} />
        </div>
        <div className="flex items-center gap-2">
          <CheckBox name="is_active" defaultChecked={p?.is_active ?? true} disabled={isPending} />
          <FormLabel className="mb-0">{tp("active")}</FormLabel>
        </div>
        <div className="flex gap-2 md:col-span-2">
          <SubmitButton label={isNew ? tp("createPresetBtn") : t("save")} />
          <Link href={buildLocaleHref(locale, "/presets")} className={toolbarBtn(false)}>
            {t("cancel")}
          </Link>
        </div>
      </form>
    </>
  );
}
