"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertPresetWithState, type ActionState } from "../actions";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

const initialState: ActionState = { success: false, message: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
        </>
      ) : (
        label
      )}
    </Button>
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
        <div className={`flex items-center gap-2 rounded-md border p-3 text-sm ${state.success ? "border-green-600/30 bg-green-50 dark:bg-green-950/30" : "border-destructive/30 bg-destructive/10"}`} role="status" aria-live="polite">
          {state.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
          <span>{state.message}</span>
          <button onClick={() => setShowToast(false)} className="ml-auto text-xs underline">
            Tutup
          </button>
        </div>
      )}

      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1">
          <Label>ID * {isNew ? "" : "(tidak dapat diubah)"}</Label>
          <Input name="id" defaultValue={p?.id ?? ""} placeholder="e.g. kawaii" required readOnly={!isNew} className={!isNew ? "bg-muted" : ""} disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Label *</Label>
          <Input name="label" defaultValue={p?.label ?? ""} required disabled={isPending} />
        </div>
        <div className="grid gap-1 md:col-span-2">
          <Label>Description</Label>
          <Input name="description" defaultValue={p?.description ?? ""} disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Emoji</Label>
          <Input name="emoji" defaultValue={p?.emoji ?? ""} placeholder="🎨" disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Role</Label>
          <select name="required_role" defaultValue={p?.required_role ?? "free"} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={isPending}>
            <option value="guest">guest</option>
            <option value="free">free</option>
            <option value="plus">plus</option>
          </select>
        </div>
        <div className="grid gap-1 md:col-span-2">
          <Label>Style Descriptor *</Label>
          <Input name="style_descriptor" defaultValue={p?.style_descriptor ?? ""} required placeholder="kawaii cute pastel chibi cartoon" disabled={isPending} />
        </div>
        <div className="grid gap-1 md:col-span-2">
          <Label>Reasoning Guidance</Label>
          <Input name="reasoning_guidance" defaultValue={p?.reasoning_guidance ?? ""} placeholder="Always include pastel colors..." disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Sort Order</Label>
          <Input name="sort_order" type="number" defaultValue={p?.sort_order ?? 100} disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Cost Override</Label>
          <Input name="cost_override" type="number" defaultValue={p?.cost_override ?? ""} placeholder="1" disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Valid From (WIB)</Label>
          <Input name="valid_from" type="datetime-local" defaultValue={p?.valid_from ? new Date(new Date(p.valid_from).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16) : ""} disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Valid Until (WIB)</Label>
          <Input name="valid_until" type="datetime-local" defaultValue={p?.valid_until ? new Date(new Date(p.valid_until).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16) : ""} disabled={isPending} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="is_active" defaultChecked={p?.is_active ?? true} className="h-4 w-4" disabled={isPending} />
          <Label>Aktif</Label>
        </div>
        <div className="md:col-span-2 flex gap-2">
          <SubmitButton label={isNew ? "Buat Preset" : "Simpan"} />
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/presets`}>Batal</Link>
          </Button>
        </div>
      </form>
    </>
  );
}
