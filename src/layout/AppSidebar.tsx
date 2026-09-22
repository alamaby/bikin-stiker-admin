"use client";
// Ported from TailAdmin free-nextjs-admin-dashboard (MIT License)
// Adapted: locale-aware hrefs, lucide icons, grouped MENU/MANAJEMEN for Bikin Stiker.
// All items are flat links (no submenus); active state strips the locale prefix.

import React, { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Users, SlidersHorizontal, ScrollText, Palette, Images } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { buildLocaleHref, isActivePath } from "@/lib/locale-href";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

export default function AppSidebar({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const pathname = usePathname();

  // Close the mobile drawer after navigation (desktop unaffected: isMobileOpen is always false there).
  const closeMobile = () => {
    if (isMobileOpen) toggleMobileSidebar();
  };

  const navItems: NavItem[] = [
    { icon: <LayoutDashboard className="size-5" />, name: t("dashboard"), path: buildLocaleHref(locale, "/") },
    { icon: <Users className="size-5" />, name: t("users"), path: buildLocaleHref(locale, "/users") },
  ];

  const manageItems: NavItem[] = [
    { icon: <SlidersHorizontal className="size-5" />, name: t("llmConfig"), path: buildLocaleHref(locale, "/llm-config") },
    { icon: <ScrollText className="size-5" />, name: t("llmLogs"), path: buildLocaleHref(locale, "/llm-logs") },
    { icon: <Images className="size-5" />, name: t("stickers"), path: buildLocaleHref(locale, "/stickers") },
    { icon: <Palette className="size-5" />, name: t("presets"), path: buildLocaleHref(locale, "/presets") },
  ];

  const isActive = useCallback((path: string) => isActivePath(pathname, locale, path), [pathname, locale]);

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) => (
        <li key={nav.name}>
          <Link
            href={nav.path}
            onClick={closeMobile}
            className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"} ${
              !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
            }`}
          >
            <span className={isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}>{nav.icon}</span>
            {(isExpanded || isHovered || isMobileOpen) && <span className="menu-item-text">{nav.name}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link href={buildLocaleHref(locale, "/")} className="flex items-center gap-2">
          {isExpanded || isHovered || isMobileOpen ? (
            <span className="text-lg font-bold text-gray-900 dark:text-white">Bikin Stiker Admin</span>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white">B</span>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                {isExpanded || isHovered || isMobileOpen ? t("menu") : "•"}
              </h2>
              {renderMenuItems(navItems)}
            </div>
            <div>
              <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                {isExpanded || isHovered || isMobileOpen ? t("manage") : "•"}
              </h2>
              {renderMenuItems(manageItems)}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
}
