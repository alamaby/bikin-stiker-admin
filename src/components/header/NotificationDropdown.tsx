"use client";
// Adapted from TailAdmin free-nextjs-admin-dashboard NotificationDropdown (MIT License).
// Changes: real operational items passed as props (failed generations 24h + recent failures),
// lucide Bell icon, locale-aware "view all" link to llm-logs.

import React, { useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, XCircle } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";

export type HeaderNotification = {
  id: string;
  title: string;
  detail: string;
  time: string;
  href: string | null;
  tone: "error" | "warning";
};

export default function NotificationDropdown({
  items,
  locale,
}: {
  items: HeaderNotification[];
  locale: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const hasNew = items.length > 0 && !seen;

  function toggleDropdown() {
    setIsOpen((v) => !v);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
    setSeen(true);
  };

  return (
    <div className="relative">
      <button
        className="dropdown-toggle relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
        aria-label="Notifications"
      >
        {hasNew && (
          <span className="absolute right-0 top-0.5 z-10 flex h-2 w-2 rounded-full bg-orange-400">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
          </span>
        )}
        <Bell className="size-5" />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex max-h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notification {items.length > 0 && <span className="text-sm font-normal text-gray-500">({items.length})</span>}
          </h5>
          <button onClick={toggleDropdown} className="dropdown-toggle text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" aria-label="Close notifications">
            <XCircle className="size-6" />
          </button>
        </div>
        <ul className="custom-scrollbar flex h-auto flex-col overflow-y-auto">
          {items.length === 0 && (
            <li className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No failed generations in the last 24h. All clear.
            </li>
          )}
          {items.map((n) => (
            <li key={n.id}>
              <DropdownItem
                onItemClick={closeDropdown}
                tag={n.href ? "a" : "button"}
                href={n.href ?? undefined}
                className="flex gap-3 rounded-lg border-b border-gray-100 p-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    n.tone === "error" ? "bg-error-50 text-error-500 dark:bg-error-500/15" : "bg-warning-50 text-warning-500 dark:bg-warning-500/15"
                  }`}
                >
                  <AlertTriangle className="size-5" />
                </span>
                <span className="block min-w-0">
                  <span className="mb-1.5 block space-x-1 text-theme-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-800 dark:text-white/90">{n.title}</span>
                    <span>{n.detail}</span>
                  </span>
                  <span className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
                    <span>LLM</span>
                    <span className="h-1 w-1 rounded-full bg-gray-400"></span>
                    <span>{n.time}</span>
                  </span>
                </span>
              </DropdownItem>
            </li>
          ))}
        </ul>
        <Link
          href={`/${locale}/llm-logs?success=fail`}
          onClick={closeDropdown}
          className="mt-3 block rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Failed Logs
        </Link>
      </Dropdown>
    </div>
  );
}
