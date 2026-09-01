"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/") || "/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      <Button variant={locale === "id" ? "secondary" : "ghost"} size="sm" onClick={() => switchLocale("id")}>
        ID
      </Button>
      <Button variant={locale === "en" ? "secondary" : "ghost"} size="sm" onClick={() => switchLocale("en")}>
        EN
      </Button>
    </div>
  );
}
