"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { flagStickerWithState, unflagStickerWithState } from "../actions";
import { toolbarBtn } from "@/components/tables/table-styles";
import { TextInput } from "@/components/form/controls";

export function FlagForm({ id, isFlagged }: { id: string; isFlagged: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const t = useTranslations("common");
  const ts = useTranslations("stickers");

  async function handleFlag() {
    setConfirmOpen(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      if (reason.trim()) fd.set("reason", reason.trim());
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
    <div className="space-y-3">
      {message && (
        <Alert
          variant={success ? "success" : "error"}
          title={success ? t("successTitle") : t("errorTitle")}
          message={message}
          onClose={() => setMessage(null)}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {isFlagged ? (
          <button
            onClick={handleUnflag}
            disabled={pending}
            aria-busy={pending}
            className={toolbarBtn(false)}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null} {ts("unflag")}
          </button>
        ) : (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
            aria-busy={pending}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-warning-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-warning-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null} {ts("flag")}
          </button>
        )}
      </div>
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} className="max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{ts("flagTitle")}</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {ts("flagBodyPrefix", { id })}{" "}
          <span className="font-mono font-medium text-gray-800 dark:text-white/90">{id}</span>
          {" "} {ts("flagBodySuffix")}
        </p>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">{ts("flagReason")}</label>
          <TextInput
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={ts("flagReasonPlaceholder")}
            maxLength={500}
            className="font-mono text-xs"
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setConfirmOpen(false)} className={toolbarBtn(false)}>{t("cancel")}</button>
          <button
            onClick={handleFlag}
            className="inline-flex h-10 items-center rounded-lg bg-error-500 px-4 text-sm font-medium text-white hover:bg-error-600"
          >
            {ts("flagConfirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
