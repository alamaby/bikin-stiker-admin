"use client";
// Shell composed from TailAdmin free-nextjs-admin-dashboard AdminLayout pattern (MIT License).
// Adapted: SidebarProvider lives in root layout; this client shell consumes useSidebar
// for the dynamic content margin. Server layout passes locale/userEmail/notifications.

import React from "react";
import { useSidebar } from "@/context/SidebarContext";
import AppSidebar from "@/layout/AppSidebar";
import AppHeader from "@/layout/AppHeader";
import Backdrop from "@/layout/Backdrop";
import type { HeaderNotification } from "@/components/header/NotificationDropdown";

export default function AdminShell({
  locale,
  userEmail,
  notifications,
  children,
}: {
  locale: string;
  userEmail: string | null;
  notifications: HeaderNotification[];
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin = isMobileOpen ? "ml-0" : isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar locale={locale} />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader locale={locale} userEmail={userEmail} notifications={notifications} />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
