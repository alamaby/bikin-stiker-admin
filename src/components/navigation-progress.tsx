"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = React.useState(false);
  const prevRef = React.useRef<string>("");

  const key = `${pathname}?${searchParams.toString()}`;

  React.useEffect(() => {
    if (prevRef.current && prevRef.current !== key) {
      setPending(true);
      const t = setTimeout(() => setPending(false), 400);
      return () => clearTimeout(t);
    }
    prevRef.current = key;
  }, [key]);

  // beforeunload fallback
  React.useEffect(() => {
    const handler = () => setPending(true);
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  if (!pending) return null;
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-50 h-0.5 w-full overflow-hidden">
      <div className="h-full w-full animate-[progress_0.8s_ease-in-out_infinite] bg-primary" />
      <style>{`@keyframes progress {0%{transform:translateX(-100%)}50%{transform:translateX(0%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}
