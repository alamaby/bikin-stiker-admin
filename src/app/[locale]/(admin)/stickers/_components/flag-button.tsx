"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { flagStickerWithState, unflagStickerWithState } from "../actions";
import { toolbarBtn } from "@/components/tables/table-styles";

export function FlagButton({ id, isFlagged }: { id: string; isFlagged: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const t = useTranslations("stickers");

  async function handleFlag() {
    setConfirmOpen(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const res = await flagStickerWithState({ success: false, message: "" }, fd);
      setMessage(res.message);
      setSuccess(res.success);
      setTimeout(() => setMessage(null), 3000);
    });
  }

  async function handleUnflag() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const res = await unflagStickerWithState({ success: false, message: "" }, fd);
      setMessage(res.message);
      setSuccess(res.success);
      setTimeout(() => setMessage(null), 3000);
    });
  }

  return (
    <div className="inline-flex flex-col gap-1">
      {message && (
        <Alert
          variant={success ? "success" : "error"}
          title={success ? t("successTitle") : t("errorTitle")}
          message={message}
          onClose={() => setMessage(null)}
        />
      )}
      {isFlagged ? (
        <button
          onClick={handleUnflag}
          disabled={pending}
          aria-busy={pending}
          className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
        >
          {pending ? <Loader2 className="size-3 animate-spin" /> : null} {t("unflagShort")}
        </button>
      ) : (
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
          aria-busy={pending}
          className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
        >
          {t("flagShort")}
        </button>
      )}
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} className="max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{t("flagTitle")}</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          ID: <span className="font-mono font-medium text-gray-800 dark:text-white/90">{id}</span>
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setConfirmOpen(false)} className={toolbarBtn(false)}>
            Batal
          </button>
          <button
            onClick={handleFlag}
            className="inline-flex h-10 items-center rounded-lg bg-error-500 px-4 text-sm font-medium text-white hover:bg-error-600"
          >
            {t("flagConfirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
