"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { deletePresetWithState } from "../actions";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";

export function DeleteButton({ id, onDone }: { id: string; onDone?: () => void }) {
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const t = useTranslations("common");
  const tp = useTranslations("presets");

  function handleConfirm() {
    setConfirmOpen(false);
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
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        aria-busy={pending}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-error-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {tp("delete")}
      </button>
      {message && <Alert variant={success ? "success" : "error"} title={success ? t("successTitle") : t("errorTitle")} message={message} onClose={() => setMessage(null)} />}
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} className="max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{tp("deleteTitle")}</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {tp("deleteBodyPrefix")} <span className="font-mono font-medium text-gray-800 dark:text-white/90">{id}</span> {tp("deleteBodySuffix")}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setConfirmOpen(false)}
            className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleConfirm}
            className="inline-flex h-10 items-center rounded-lg bg-error-500 px-4 text-sm font-medium text-white hover:bg-error-600"
          >
            {tp("deleteConfirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
