import { locales } from "@/i18n/config";

export function stripLocale(pathname: string): string {
  const segs = pathname.split("/");
  if (segs.length > 1 && (locales as readonly string[]).includes(segs[1])) {
    const rest = segs.slice(2).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname || "/";
}

export function buildLocaleHref(locale: string, path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `/${locale}${path === "/" ? "" : path}`;
}

export function isActivePath(pathname: string, locale: string, href: string): boolean {
  const cleanPath = stripLocale(pathname);
  const cleanHref = stripLocale(href.startsWith(`/${locale}`) ? href : `/${locale}${href}`);
  if (cleanHref === "/") return cleanPath === "/";
  return cleanPath === cleanHref || cleanPath.startsWith(`${cleanHref}/`);
}
