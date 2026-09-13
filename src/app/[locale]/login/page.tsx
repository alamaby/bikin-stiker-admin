"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import Alert from "@/components/ui/alert/Alert";
import { FormLabel, TextInput } from "@/components/form/controls";

function CompactLocaleSwitcher() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? "id";

  function switchLocale(next: string) {
    router.push(`/${next}/login`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-gray-200 p-1 dark:border-gray-800">
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase ${
            locale === l ? "bg-brand-500 text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// Split out because useSearchParams() requires a Suspense boundary during prerender
// (https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout).
function LoginCard() {
  const t = useTranslations("login");
  const tc = useTranslations("common");
  const params = useParams();
  const locale = (params.locale as string) ?? "id";
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? `/${locale}`;

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (!data.user) throw new Error("No user");
      // Client-side whitelist check for UX (middleware also enforces)
      const allow = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (!allow.includes((data.user.email ?? "").toLowerCase())) {
        await supabase.auth.signOut();
        setError(t("notAdmin"));
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("error");
      setError(msg.includes("Invalid login credentials") ? t("error") : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <FormLabel htmlFor="email">{tc("email")}</FormLabel>
          <TextInput
            id="email"
            type="email"
            required
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <FormLabel htmlFor="password">{tc("password")}</FormLabel>
          <TextInput
            id="password"
            type="password"
            required
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <Alert variant="error" title={t("failedTitle")} message={error} onClose={() => setError(null)} />}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? tc("loading") : t("submit")}
        </button>
      </form>
    </div>
  );
}

function LoginBrand() {
  const tc = useTranslations("common");
  const params = useParams();
  const locale = (params.locale as string) ?? "id";
  return (
    <Link href={`/${locale}`} className="text-lg font-bold text-gray-900 dark:text-white">
      {tc("appName")}
    </Link>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-gray-50 p-6 dark:bg-gray-900 sm:p-0">
      <div className="flex h-full min-h-screen flex-col justify-center">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <LoginBrand />
            <div className="flex items-center gap-2">
              <CompactLocaleSwitcher />
              <ThemeToggleButton />
            </div>
          </div>
          <React.Suspense
            fallback={
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
                <div className="h-6 w-32 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
                <div className="mt-2 h-4 w-48 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
              </div>
            }
          >
            <LoginCard />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}
