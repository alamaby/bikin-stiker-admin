"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { updateLlmConfigWithState, type ActionState } from "../actions";
import Alert from "@/components/ui/alert/Alert";
import { FormLabel, TextInput, SelectInput, TextArea, CheckBox } from "@/components/form/controls";
import { toolbarBtn, filterSubmitBtn } from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";

const initialState: ActionState = { success: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("common");
  return (
    <button type="submit" className={filterSubmitBtn} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> {t("saving")}
        </>
      ) : (
        t("save")
      )}
    </button>
  );
}

export function DetailForm({ config, locale, masked }: { config: any; locale: string; masked: string }) {
  const [state, formAction, isPending] = useActionState(updateLlmConfigWithState, initialState);
  const [showToast, setShowToast] = React.useState(false);
  const t = useTranslations("common");
  const tl = useTranslations("llmConfig");

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
        <input type="hidden" name="id" value={config.id} />
        <div>
          <FormLabel>{tl("provider")} *</FormLabel>
          <SelectInput name="provider_name" defaultValue={config.provider_name} disabled={isPending}>
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
          <FormLabel>Route Scope *</FormLabel>
          <SelectInput name="route_scope" defaultValue={config.route_scope} disabled={isPending}>
            <option value="default">default</option>
            <option value="reasoning">reasoning</option>
            <option value="experiment">experiment</option>
          </SelectInput>
        </div>
        <div>
          <FormLabel>{tl("model")} *</FormLabel>
          <TextInput name="model_name" defaultValue={config.model_name} required disabled={isPending} />
        </div>
        <div>
          <FormLabel>Base URL</FormLabel>
          <TextInput name="base_url" defaultValue={config.base_url ?? ""} placeholder="https://..." disabled={isPending} />
        </div>
        <div>
          <FormLabel>Label</FormLabel>
          <TextInput name="label" defaultValue={config.label ?? ""} disabled={isPending} />
        </div>
        <div>
          <FormLabel>{tl("priority")}</FormLabel>
          <TextInput name="priority" type="number" defaultValue={config.priority} disabled={isPending} />
        </div>
        <div>
          <FormLabel>{tl("timeout")}</FormLabel>
          <TextInput name="timeout_ms" type="number" defaultValue={config.timeout_ms} disabled={isPending} />
        </div>
        <div>
          <FormLabel>{tl("fallback")}</FormLabel>
          <SelectInput name="fallback_policy" defaultValue={config.fallback_policy} disabled={isPending}>
            <option value="retryable_only">retryable_only</option>
            <option value="always">always</option>
            <option value="never">never</option>
          </SelectInput>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <CheckBox name="is_active" defaultChecked={config.is_active} disabled={isPending} />
          <FormLabel className="mb-0">{tl("active")}</FormLabel>
        </div>
        <div className="md:col-span-2">
          <FormLabel>Notes</FormLabel>
          <TextInput name="notes" defaultValue={config.notes ?? ""} disabled={isPending} />
        </div>
        <div className="md:col-span-2">
          <FormLabel>request_options (JSON)</FormLabel>
          <TextArea
            name="request_options"
            defaultValue={JSON.stringify(config.request_options ?? {}, null, 2)}
            rows={6}
            placeholder='{"temperature":0.7}'
            disabled={isPending}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tl("jsonNote")}</p>
        </div>
        <div className="md:col-span-2">
          <FormLabel>API Key (masked – kosongkan untuk keep)</FormLabel>
          <TextInput name="api_key" type="password" placeholder={masked} autoComplete="off" disabled={isPending} />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tl("apiKeyNote")}</p>
        </div>
        <div className="flex gap-2 md:col-span-2">
          <SubmitButton />
          <Link href={buildLocaleHref(locale, "/llm-config")} className={toolbarBtn(false)}>
            {t("cancel")}
          </Link>
        </div>
      </form>
    </>
  );
}
