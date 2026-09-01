"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function PromptCell({ text, max = 80 }: { text: string; max?: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  if (!text) return <span className="text-muted-foreground">—</span>;
  const isLong = text.length > max;
  const display = expanded || !isLong ? text : text.slice(0, max) + "…";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="max-w-[420px]">
      <p className="whitespace-pre-wrap break-words text-xs leading-4">{display}</p>
      <div className="mt-1 flex gap-1">
        {isLong && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Ciutkan" : "Lihat lengkap"}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCopy} disabled={copied}>
          {copied ? "Tersalin!" : "Salin"}
        </Button>
      </div>
    </div>
  );
}
