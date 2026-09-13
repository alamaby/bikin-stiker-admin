"use client";
// Adapted from TailAdmin free-nextjs-admin-dashboard UserDropdown (MIT License).
// Changes: avatar initial (no image asset), real userEmail prop, Supabase sign-out,
// locale-aware login redirect. Uses lucide icons instead of inline SVG.

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, ChevronDown } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { createClient } from "@/lib/supabase/client";

export default function UserDropdown({ userEmail, locale }: { userEmail: string | null; locale: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const t = useTranslations("common");

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      closeDropdown();
      router.push(`/${locale}/login`);
      router.refresh();
    }
  }

  const initial = (userEmail?.trim().charAt(0) ?? "A").toUpperCase() || "A";
  const displayName = userEmail?.split("@")[0] ?? "Admin";

  return (
    <div className="relative">
      <button onClick={toggleDropdown} className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400">
        <span className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-brand-500 text-lg font-semibold text-white">
          {initial}
        </span>
        <span className="mr-1 hidden font-medium text-theme-sm sm:block">{displayName}</span>
        <ChevronDown className={`size-4 stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div>
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">{displayName}</span>
          <span className="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">{userEmail ?? "—"}</span>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 text-theme-sm hover:bg-gray-100 hover:text-gray-700 group dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 disabled:opacity-50"
        >
          <LogOut className="size-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400" />
          {signingOut ? t("signingOut") : t("signOut")}
        </button>
      </Dropdown>
    </div>
  );
}
