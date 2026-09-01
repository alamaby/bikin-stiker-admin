"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLlmConfigWithState, type ActionState } from "../actions";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

const initialState: ActionState = { success: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
        </>
      ) : (
        "Save"
      )}
    </Button>
  );
}

export function DetailForm({ config, locale, masked }: { config: any; locale: string; masked: string }) {
  const [state, formAction, isPending] = useActionState(updateLlmConfigWithState, initialState);
  const [showToast, setShowToast] = React.useState(false);

  // Show toast when action completes
  React.useEffect(() => {
    if (state.message) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowToast(true);
      const tm = setTimeout(() => setShowToast(false), 3500);
      return () => clearTimeout(tm);
    }
  }, [state.message]);

  return (
    <>
      {showToast && state.message && (
        <div
          className={`flex items-center gap-2 rounded-md border p-3 text-sm ${state.success ? "border-green-600/30 bg-green-50 dark:bg-green-950/30" : "border-destructive/30 bg-destructive/10"}`}
          role="status"
          aria-live="polite"
        >
          {state.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
          <span>{state.message}</span>
          <button onClick={() => setShowToast(false)} className="ml-auto text-xs underline">
            Tutup
          </button>
        </div>
      )}

      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="id" value={config.id} />
        <div className="grid gap-1">
          <Label>Provider *</Label>
          <select name="provider_name" defaultValue={config.provider_name} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={isPending}>
            <option value="openrouter">openrouter</option>
            <option value="gemini">gemini</option>
            <option value="pollinations">pollinations</option>
            <option value="pixazo">pixazo</option>
            <option value="ollama">ollama</option>
            <option value="cerebras">cerebras</option>
            <option value="cloudflare">cloudflare</option>
          </select>
        </div>
        <div className="grid gap-1">
          <Label>Route Scope *</Label>
          <select name="route_scope" defaultValue={config.route_scope} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={isPending}>
            <option value="default">default</option>
            <option value="reasoning">reasoning</option>
            <option value="experiment">experiment</option>
          </select>
        </div>
        <div className="grid gap-1">
          <Label>Model *</Label>
          <Input name="model_name" defaultValue={config.model_name} required disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Base URL</Label>
          <Input name="base_url" defaultValue={config.base_url ?? ""} placeholder="https://..." disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Label</Label>
          <Input name="label" defaultValue={config.label ?? ""} disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Priority</Label>
          <Input name="priority" type="number" defaultValue={config.priority} disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Timeout (ms)</Label>
          <Input name="timeout_ms" type="number" defaultValue={config.timeout_ms} disabled={isPending} />
        </div>
        <div className="grid gap-1">
          <Label>Fallback</Label>
          <select name="fallback_policy" defaultValue={config.fallback_policy} className="h-9 rounded-md border bg-background px-3 text-sm" disabled={isPending}>
            <option value="retryable_only">retryable_only</option>
            <option value="always">always</option>
            <option value="never">never</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" name="is_active" defaultChecked={config.is_active} className="h-4 w-4" disabled={isPending} />
          <Label>Active</Label>
        </div>
        <div className="grid gap-1 md:col-span-2">
          <Label>Notes</Label>
          <Input name="notes" defaultValue={config.notes ?? ""} disabled={isPending} />
        </div>
        <div className="grid gap-1 md:col-span-2">
          <Label>request_options (JSON)</Label>
          <textarea
            name="request_options"
            defaultValue={JSON.stringify(config.request_options ?? {}, null, 2)}
            rows={6}
            className="rounded-md border bg-background p-3 font-mono text-xs disabled:opacity-50"
            placeholder='{"temperature":0.7}'
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">Harus JSON valid. Kosongkan untuk tidak mengubah.</p>
        </div>
        <div className="grid gap-1 md:col-span-2">
          <Label>API Key (masked – kosongkan untuk keep)</Label>
          <Input name="api_key" type="password" placeholder={masked} autoComplete="off" disabled={isPending} />
          <p className="text-xs text-muted-foreground">Replace-only. Untuk Vault gunakan SQL manual.</p>
        </div>
        <div className="md:col-span-2 flex gap-2">
          <SubmitButton />
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/llm-config`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </>
  );
}
