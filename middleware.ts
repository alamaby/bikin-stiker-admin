import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { locales, defaultLocale } from "@/i18n/config";

function getLocaleFromRequest(request: NextRequest): string {
  const pathnameLocale = request.nextUrl.pathname.split("/")[1];
  if (locales.includes(pathnameLocale as (typeof locales)[number])) return pathnameLocale;
  const accept = request.headers.get("accept-language") ?? "";
  if (accept.toLowerCase().includes("en")) return "en";
  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Skip static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/supabase")
  ) {
    return response;
  }

  // Locale handling – redirect if missing locale prefix
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale && pathname !== "/") {
    const locale = getLocaleFromRequest(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }
  if (pathname === "/") {
    const locale = getLocaleFromRequest(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  // Auth gate for admin routes – allow /[locale]/login and /[locale]/unauthorized
  const segments = pathname.split("/");
  const locale = segments[1];
  const isLogin = pathname === `/${locale}/login` || pathname.endsWith("/login");
  const isUnauthorized = pathname.includes("/unauthorized");
  if (isLogin || isUnauthorized) return response;

  // Check auth for all other /[locale]/* routes
  if (hasLocale) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = `/${locale}/login`;
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      const allow = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (!allow.includes((user.email ?? "").toLowerCase())) {
        const url2 = request.nextUrl.clone();
        url2.pathname = `/${locale}/unauthorized`;
        return NextResponse.redirect(url2);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
