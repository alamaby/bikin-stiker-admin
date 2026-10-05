"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth-guard";

function svc() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return import("@supabase/supabase-js").then(({ createClient }) => createClient(url, key, { auth: { persistSession: false } }));
}

export type ActionState = { success: boolean; message: string };

function parseWibToUtcIso(input: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // If no timezone offset is provided (standard datetime-local format YYYY-MM-DDTHH:mm), treat as WIB (+07:00)
  const hasTimezone = /[Z+-]\d{2}(?::?\d{2})?$/.test(trimmed) || trimmed.endsWith("Z");
  const isoCandidate = hasTimezone ? trimmed : `${trimmed}:00+07:00`;
  const d = new Date(isoCandidate);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function doUpsert(formData: FormData) {
  await requireAdmin();
  const supabase = await svc();
  const id = String(formData.get("id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  const style_descriptor = String(formData.get("style_descriptor") ?? "").trim();
  const reasoning_guidance = String(formData.get("reasoning_guidance") ?? "").trim() || null;
  const required_role = String(formData.get("required_role") ?? "free");
  const sort_order = Number(formData.get("sort_order"));
  const is_active = formData.get("is_active") === "on";
  const cost_override = formData.get("cost_override") ? Number(formData.get("cost_override")) : null;
  const valid_from = String(formData.get("valid_from") ?? "").trim() || null;
  const valid_until = String(formData.get("valid_until") ?? "").trim() || null;

  if (!id || !label || !style_descriptor) throw new Error("Missing required fields (id/label/style_descriptor)");

  const payload: Record<string, unknown> = {
    id,
    label,
    description: description || label,
    emoji,
    style_descriptor,
    reasoning_guidance,
    required_role,
    sort_order: Number.isFinite(sort_order) ? sort_order : 100,
    is_active,
    cost_override,
    valid_from: parseWibToUtcIso(valid_from),
    valid_until: parseWibToUtcIso(valid_until),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("sticker_presets").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/presets");
  revalidatePath(`/[locale]/presets/${id}`);
}

export async function upsertPreset(formData: FormData) {
  await doUpsert(formData);
}

export async function upsertPresetWithState(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await doUpsert(formData);
    return { success: true, message: "Preset berhasil disimpan" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menyimpan preset";
    return { success: false, message: msg };
  }
}

export async function createPresetAndRedirect(formData: FormData) {
  await doUpsert(formData);
  const id = String(formData.get("id") ?? "").trim();
  const locale = String(formData.get("locale") ?? "id") || "id";
  redirect(`/${locale}/presets/${id}`);
}

async function doDelete(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Missing id");
  const supabase = await svc();
  const { error } = await supabase.from("sticker_presets").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/presets");
}

export async function deletePreset(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  await doDelete(id);
}

export async function deletePresetWithState(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  try {
    await doDelete(id);
    return { success: true, message: `Preset "${id}" dihapus` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal hapus";
    return { success: false, message: msg };
  }
}
