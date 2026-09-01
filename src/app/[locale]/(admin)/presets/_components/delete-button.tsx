"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { deletePresetWithState } from "../actions";

export function DeleteButton({ id, onDone }: { id: string; onDone?: () => void }) {
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  function handleClick() {
    if (!confirm(`Hapus preset "${id}"?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const res = await deletePresetWithState({ success: false, message: "" }, fd);
      setMessage(res.message);
      setSuccess(res.success);
      if (res.success) onDone?.();
      setTimeout(() => setMessage(null), 3000);
    });
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <Button variant="destructive" size="sm" onClick={handleClick} disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Hapus
      </Button>
      {message && <span className={`text-xs ${success ? "text-green-600" : "text-destructive"}`}>{message}</span>}
    </div>
  );
}
