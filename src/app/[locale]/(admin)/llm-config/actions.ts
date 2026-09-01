"use server";

import { revalidatePath } from "next/cache";

export type ActionState = { success: boolean; message: string };

async function doUpdate(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const priority = Number(formData.get("priority"));
  const is_active = formData.get("is_active") === "on" || formData.get("is_active") === "true";
  const timeout_ms = Number(formData.get("timeout_ms"));
  const fallback_policy = String(formData.get("fallback_policy") ?? "");
  const api_key = String(formData.get("api_key") ?? "").trim();
  const base_url = String(formData.get("base_url") ?? "").trim();
  const model_name = String(formData.get("model_name") ?? "").trim();
  const provider_name = String(formData.get("provider_name") ?? "").trim();
  const route_scope = String(formData.get("route_scope") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const request_options_raw = String(formData.get("request_options") ?? "").trim();

  if (!id) throw new Error("Missing id");

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  let request_options: unknown | undefined;
  if (request_options_raw) {
    try {
      request_options = JSON.parse(request_options_raw);
    } catch {
      throw new Error("request_options must be valid JSON");
    }
  }

  const update: Record<string, unknown> = {
    priority: Number.isFinite(priority) ? priority : undefined,
    is_active,
    timeout_ms: Number.isFinite(timeout_ms) ? timeout_ms : undefined,
    fallback_policy: fallback_policy || undefined,
    base_url: base_url || undefined,
    model_name: model_name || undefined,
    provider_name: provider_name || undefined,
    route_scope: route_scope || undefined,
    label: label || undefined,
    notes: notes || undefined,
    request_options,
    updated_at: new Date().toISOString(),
  };
  if (api_key) update.api_key = api_key;
  Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

  if (update.route_scope && !["default", "experiment", "reasoning"].includes(String(update.route_scope))) {
    throw new Error("Invalid route_scope");
  }
  if (update.fallback_policy && !["retryable_only", "always", "never"].includes(String(update.fallback_policy))) {
    throw new Error("Invalid fallback_policy");
  }

  const { error } = await supabase.from("image_generation_configs").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/llm-config");
  revalidatePath(`/[locale]/llm-config/${id}`);
}

export async function updateLlmConfig(formData: FormData) {
  await doUpdate(formData);
}

export async function updateLlmConfigWithState(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await doUpdate(formData);
    return { success: true, message: "Konfigurasi berhasil disimpan" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menyimpan";
    return { success: false, message: msg };
  }
}
