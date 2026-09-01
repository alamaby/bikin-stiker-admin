"use server";

import { revalidatePath } from "next/cache";

export type ActionState = { success: boolean; message: string };

async function getServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function suspendUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return { success: false, message: "Missing id" };
  try {
    const supabase = await getServiceClient();
    // Ban for 10 years (87600h) as "suspend indefinitely"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.auth.admin.updateUserById(id, { ban_duration: "87600h", user_metadata: { suspend_reason: reason || undefined } } as any);
    if (error) throw new Error(error.message);
    // Also mark profile? optional
    revalidatePath(`/[locale]/users/${id}`);
    revalidatePath("/[locale]/users");
    return { success: true, message: "Pengguna berhasil disuspend" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal suspend";
    return { success: false, message: msg };
  }
}

export async function unsuspendUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { success: false, message: "Missing id" };
  try {
    const supabase = await getServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.auth.admin.updateUserById(id, { ban_duration: "none" } as any);
    if (error) throw new Error(error.message);
    revalidatePath(`/[locale]/users/${id}`);
    revalidatePath("/[locale]/users");
    return { success: true, message: "Suspend dicabut, pengguna aktif kembali" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal unsuspend";
    return { success: false, message: msg };
  }
}
