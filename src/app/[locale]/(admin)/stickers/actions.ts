"use server";

import { revalidatePath } from "next/cache";

function svc() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return import("@supabase/supabase-js").then(({ createClient }) => createClient(url, key, { auth: { persistSession: false } }));
}

export type ActionState = { success: boolean; message: string };

export async function flagStickerWithState(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500) || null;
  if (!id) return { success: false, message: "Missing id" };
  try {
    const supabase = await svc();
    const { error } = await supabase
      .from("sticker_generations")
      .update({ is_flagged: true, flagged_at: new Date().toISOString(), flag_reason: reason })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/[locale]/stickers");
    revalidatePath(`/[locale]/stickers/${id}`);
    return { success: true, message: "Stiker ditandai tidak pantas" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menandai stiker";
    return { success: false, message: msg };
  }
}

export async function unflagStickerWithState(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { success: false, message: "Missing id" };
  try {
    const supabase = await svc();
    const { error } = await supabase
      .from("sticker_generations")
      .update({ is_flagged: false, flagged_at: null, flag_reason: null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/[locale]/stickers");
    revalidatePath(`/[locale]/stickers/${id}`);
    return { success: true, message: "Tanda tidak pantas dicabut" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal mencabut tanda";
    return { success: false, message: msg };
  }
}
