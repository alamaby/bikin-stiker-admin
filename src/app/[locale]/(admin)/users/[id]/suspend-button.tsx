"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Loader2, ShieldOff, ShieldCheck } from "lucide-react";
import { suspendUser, unsuspendUser, type ActionState } from "./actions";
import Alert from "@/components/ui/alert/Alert";
import { FormLabel, TextInput } from "@/components/form/controls";

const initial: ActionState = { success: false, message: "" };

function SubmitButton({ isSuspended, pending }: { isSuspended: boolean; pending: boolean }) {
  const { pending: formPending } = useFormStatus();
  const isPending = pending || formPending;
  const base = "inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium shadow-theme-xs transition disabled:cursor-not-allowed disabled:opacity-50";
  const tone = isSuspended
    ? "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
    : "bg-error-500 text-white hover:bg-error-600";
  return (
    <button type="submit" className={`${base} ${tone}`} disabled={isPending} aria-busy={isPending}>
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Memproses...
        </>
      ) : isSuspended ? (
        <>
          <ShieldCheck className="size-4" /> Cabut Suspend
        </>
      ) : (
        <>
          <ShieldOff className="size-4" /> Suspend
        </>
      )}
    </button>
  );
}

export function SuspendSection({ id, isSuspended, bannedUntil }: { id: string; isSuspended: boolean; bannedUntil: string | null }) {
  const [suspendState, suspendAction, suspendPending] = useActionState(suspendUser, initial);
  const [unsuspendState, unsuspendAction, unsuspendPending] = useActionState(unsuspendUser, initial);
  const [showSuspendToast, setShowSuspendToast] = React.useState(false);
  const [showUnsuspendToast, setShowUnsuspendToast] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const t = useTranslations("common");

  React.useEffect(() => {
    if (suspendState.message) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSuspendToast(true);
      const t = setTimeout(() => setShowSuspendToast(false), 3500);
      return () => clearTimeout(t);
    }
  }, [suspendState.message]);

  React.useEffect(() => {
    if (unsuspendState.message) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowUnsuspendToast(true);
      const t = setTimeout(() => setShowUnsuspendToast(false), 3500);
      return () => clearTimeout(t);
    }
  }, [unsuspendState.message]);

  if (isSuspended) {
    return (
      <div className="space-y-3">
        <Alert
          variant="warning"
          title="Pengguna sedang disuspend"
          message={`${bannedUntil ? `Sampai ${new Date(bannedUntil).toLocaleString("id-ID")}. ` : ""}Pengguna tidak dapat login atau generate stiker selama suspend.`}
        />
        {showUnsuspendToast && unsuspendState.message && (
          <Alert
            variant={unsuspendState.success ? "success" : "error"}
            title={unsuspendState.success ? t("successTitle") : t("errorTitle")}
            message={unsuspendState.message}
            onClose={() => setShowUnsuspendToast(false)}
          />
        )}
        <form action={unsuspendAction} className="flex gap-2">
          <input type="hidden" name="id" value={id} />
          <SubmitButton isSuspended={true} pending={unsuspendPending} />
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showSuspendToast && suspendState.message && (
        <Alert
          variant={suspendState.success ? "success" : "error"}
          title={suspendState.success ? t("successTitle") : t("errorTitle")}
          message={suspendState.message}
          onClose={() => setShowSuspendToast(false)}
        />
      )}
      <form action={suspendAction} className="space-y-2">
        <input type="hidden" name="id" value={id} />
        <div>
          <FormLabel>Alasan suspend (opsional)</FormLabel>
          <TextInput name="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Misal: spam, abuse" disabled={suspendPending} />
        </div>
        <SubmitButton isSuspended={false} pending={suspendPending} />
        <p className="text-xs text-gray-500 dark:text-gray-400">Suspend akan memblokir login selama ~10 tahun (bisa dicabut kapan saja).</p>
      </form>
    </div>
  );
}
