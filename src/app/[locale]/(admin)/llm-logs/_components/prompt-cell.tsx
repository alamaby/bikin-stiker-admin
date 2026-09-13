"use client";

import * as React from "react";
import { toolbarBtn } from "@/components/tables/table-styles";

export function PromptCell({ text, max = 80 }: { text: string; max?: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  if (!text) return <span className="text-gray-400">—</span>;
  const isLong = text.length > max;
  const display = expanded || !isLong ? text : text.slice(0, max) + "...";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="max-w-[420px]">
      <p className="whitespace-pre-wrap break-words text-xs leading-4 text-gray-700 dark:text-gray-300">{display}</p>
      <div className="mt-1 flex gap-1">
        {isLong && (
          <button className={`${toolbarBtn(false)} h-6 px-2 text-xs`} onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Ciutkan" : "Lihat lengkap"}
          </button>
        )}
        <button className={`${toolbarBtn(false)} h-6 px-2 text-xs`} onClick={handleCopy} disabled={copied}>
          {copied ? "Tersalin!" : "Salin"}
        </button>
      </div>
    </div>
  );
}
