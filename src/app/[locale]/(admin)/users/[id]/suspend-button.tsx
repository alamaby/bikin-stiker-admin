"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suspendUser, unsuspendUser, type ActionState } from "./actions";
import { Loader2, ShieldOff, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

const initial: ActionState = { success: false, message: "" };

function SubmitButton({ isSuspended, pending }: { isSuspended: boolean; pending: boolean }) {
  const { pending: formPending } = useFormStatus();
  const isPending = pending || formPending;
  return (
    <Button type="submit" variant={isSuspended ? "outline" : "destructive"} size="sm" disabled={isPending} aria-busy={isPending}>
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
        </>
      ) : isSuspended ? (
        <>
          <ShieldCheck className="h-4 w-4" /> Cabut Suspend
        </>
      ) : (
        <>
          <ShieldOff className="h-4 w-4" /> Suspend
        </>
      )}
    </Button>
  );
}

export function SuspendSection({ id, isSuspended, bannedUntil }: { id: string; isSuspended: boolean; bannedUntil: string | null }) {
  const [suspendState, suspendAction, suspendPending] = useActionState(suspendUser, initial);
  const [unsuspendState, unsuspendAction, unsuspendPending] = useActionState(unsuspendUser, initial);
  const [showSuspendToast, setShowSuspendToast] = React.useState(false);
  const [showUnsuspendToast, setShowUnsuspendToast] = React.useState(false);
  const [reason, setReason] = React.useState("");

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
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-medium">Pengguna sedang disuspend</p>
          {bannedUntil && <p className="text-xs text-muted-foreground">Sampai {new Date(bannedUntil).toLocaleString("id-ID")}</p>}
          <p className="text-xs text-muted-foreground">Pengguna tidak dapat login atau generate stiker selama suspend.</p>
        </div>
        {showUnsuspendToast && unsuspendState.message && (
          <div className={`flex items-center gap-2 rounded-md border p-3 text-sm ${unsuspendState.success ? "border-green-600/30 bg-green-50 dark:bg-green-950/30" : "border-destructive/30 bg-destructive/10"}`}>
            {unsuspendState.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
            <span>{unsuspendState.message}</span>
          </div>
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
        <div className={`flex items-center gap-2 rounded-md border p-3 text-sm ${suspendState.success ? "border-green-600/30 bg-green-50 dark:bg-green-950/30" : "border-destructive/30 bg-destructive/10"}`}>
          {suspendState.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
          <span>{suspendState.message}</span>
        </div>
      )}
      <form action={suspendAction} className="space-y-2">
        <input type="hidden" name="id" value={id} />
        <div className="grid gap-1">
          <Label>Alasan suspend (opsional)</Label>
          <Input name="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Misal: spam, abuse" disabled={suspendPending} />
        </div>
        <SubmitButton isSuspended={false} pending={suspendPending} />
        <p className="text-xs text-muted-foreground">Suspend akan memblokir login selama ~10 tahun (bisa dicabut kapan saja).</p>
      </form>
    </div>
  );
}
