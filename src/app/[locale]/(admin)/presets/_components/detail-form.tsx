"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { upsertPresetWithState, type ActionState } from "../actions";
import Alert from "@/components/ui/alert/Alert";
import { FormLabel, TextInput, SelectInput, CheckBox } from "@/components/form/controls";
import { toolbarBtn, filterSubmitBtn } from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";

const initialState: ActionState = { success: false, message: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={filterSubmitBtn} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Menyimpan...
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
            title={state.success ? "Berhasil" : "Gagal"}
            message={state.message}
            onClose={() => setShowToast(false)}
          />
        </div>
      )}

      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <div>
          <FormLabel>ID * {isNew ? "" : "(tidak dapat diubah)"}</FormLabel>
          <TextInput name="id" defaultValue={p?.id ?? ""} placeholder="e.g. kawaii" required readOnly={!isNew} className={!isNew ? "bg-gray-50 dark:bg-white/5" : ""} disabled={isPending} />
        </div>
        <div>
          <FormLabel>Label *</FormLabel>
          <TextInput name="label" defaultValue={p?.label ?? ""} required disabled={isPending} />
        </div>
        <div className="md:col-span-2">
          <FormLabel>Description</FormLabel>
          <TextInput name="description" defaultValue={p?.description ?? ""} disabled={isPending} />
        </div>
        <div>
          <FormLabel>Emoji</FormLabel>
          <TextInput name="emoji" defaultValue={p?.emoji ?? ""} placeholder="🎨" disabled={isPending} />
        </div>
        <div>
          <FormLabel>Role</FormLabel>
          <SelectInput name="required_role" defaultValue={p?.required_role ?? "free"} disabled={isPending}>
            <option value="guest">guest</option>
            <option value="free">free</option>
            <option value="plus">plus</option>
          </SelectInput>
        </div>
        <div className="md:col-span-2">
          <FormLabel>Style Descriptor *</FormLabel>
          <TextInput name="style_descriptor" defaultValue={p?.style_descriptor ?? ""} required placeholder="kawaii cute pastel chibi cartoon" disabled={isPending} />
        </div>
        <div className="md:col-span-2">
          <FormLabel>Reasoning Guidance</FormLabel>
          <TextInput name="reasoning_guidance" defaultValue={p?.reasoning_guidance ?? ""} placeholder="Always include pastel colors..." disabled={isPending} />
        </div>
        <div>
          <FormLabel>Sort Order</FormLabel>
          <TextInput name="sort_order" type="number" defaultValue={p?.sort_order ?? 100} disabled={isPending} />
        </div>
        <div>
          <FormLabel>Cost Override</FormLabel>
          <TextInput name="cost_override" type="number" defaultValue={p?.cost_override ?? ""} placeholder="1" disabled={isPending} />
        </div>
        <div>
          <FormLabel>Valid From (WIB)</FormLabel>
          <TextInput name="valid_from" type="datetime-local" defaultValue={p?.valid_from ? new Date(new Date(p.valid_from).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16) : ""} disabled={isPending} />
        </div>
        <div>
          <FormLabel>Valid Until (WIB)</FormLabel>
          <TextInput name="valid_until" type="datetime-local" defaultValue={p?.valid_until ? new Date(new Date(p.valid_until).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16) : ""} disabled={isPending} />
        </div>
        <div className="flex items-center gap-2">
          <CheckBox name="is_active" defaultChecked={p?.is_active ?? true} disabled={isPending} />
          <FormLabel className="mb-0">Aktif</FormLabel>
        </div>
        <div className="flex gap-2 md:col-span-2">
          <SubmitButton label={isNew ? "Buat Preset" : "Simpan"} />
          <Link href={buildLocaleHref(locale, "/presets")} className={toolbarBtn(false)}>
            Batal
          </Link>
        </div>
      </form>
    </>
  );
}
