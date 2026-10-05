import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";
import { isAdminEmail } from "@/env";

/**
 * Ensures the caller is authenticated and has an admin email whitelisted in ADMIN_EMAILS.
 * Throws an Error if not authorized, preventing unprivileged execution of Server Actions.
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized: Sesi tidak valid atau telah berakhir");
  }

  if (!isAdminEmail(user.email)) {
    throw new Error("Forbidden: Akun tidak memiliki hak akses admin");
  }

  return user;
}
