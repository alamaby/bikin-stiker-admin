"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Users, SlidersHorizontal, ScrollText, Palette, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function AdminSidebar({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const items = [
    { href: `/${locale}`, label: t("dashboard"), icon: LayoutDashboard },
    { href: `/${locale}/users`, label: t("users"), icon: Users },
    { href: `/${locale}/llm-config`, label: t("llmConfig"), icon: SlidersHorizontal },
    { href: `/${locale}/llm-logs`, label: t("llmLogs"), icon: ScrollText },
    { href: `/${locale}/presets`, label: t("presets"), icon: Palette },
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  }

  const Nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b bg-background p-3 lg:hidden">
        <span className="font-semibold">Bikin Stiker Admin</span>
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-background p-4 lg:static lg:flex lg:flex-col",
          open ? "flex flex-col" : "hidden lg:flex"
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="text-lg font-bold">Bikin Stiker Admin</span>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        {Nav}
        <div className="mt-auto flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          <Button variant="outline" onClick={handleSignOut} className="w-full justify-start">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
