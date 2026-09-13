import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL required").url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
  SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  ADMIN_EMAILS: z.string().min(1, "ADMIN_EMAILS required"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

function getEnv() {
  const raw = {
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    // In build time allow missing env for static generation – log only in dev
    if (process.env.NODE_ENV !== "production" || process.env.CI) {
      console.warn("Env validation warning:", parsed.error.flatten().fieldErrors);
    }
    // Return best-effort raw with defaults to avoid hard crash in dev
    return {
      ...raw,
      SUPABASE_URL: raw.SUPABASE_URL ?? "https://placeholder.supabase.co",
      ADMIN_EMAILS: raw.ADMIN_EMAILS ?? "alam.aby.b@gmail.com,alamaby@gmail.com",
    } as z.infer<typeof envSchema>;
  }
  return parsed.data;
}

export const env = getEnv();

export function getAnonKey(): string {
  const k = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  if (!k) throw new Error("Missing SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY");
  return k;
}

export function getServiceRoleKey(): string | null {
  return env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function getAdminEmails(): string[] {
  return env.ADMIN_EMAILS.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
