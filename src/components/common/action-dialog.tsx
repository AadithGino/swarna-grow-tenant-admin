"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  dialogScrollShellClass,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ApiErrorCallout } from "@/src/components/common/api-error-callout";
import { parseApiError, toastApiError } from "@/src/lib/api-error";

export function ActionDialog({
  trigger,
  title,
  description,
  children,
  actionLabel = "Save",
  onSubmit,
  open: controlledOpen,
  onOpenChange,
  submitDisabled,
  submitHint,
  className,
  onError,
  suppressDefaultErrorToast,
}: {
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  actionLabel?: string;
  onSubmit: () => Promise<void | false> | void | false;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  submitDisabled?: boolean;
  /** Shown beside Save when the action is disabled (e.g. no edits yet). */
  submitHint?: string;
  className?: string;
  /** When set, called on submit failure; dialog stays open. */
  onError?: (err: unknown) => void;
  /** Skip default toast when `onError` handles messaging. */
  suppressDefaultErrorToast?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) setSubmitError(null);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(dialogScrollShellClass, "sm:max-w-xl", className)}
      >
        <DialogBody className="overflow-y-auto pb-2">
          <DialogHeader className="text-left">
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-pretty">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4">
            {children}
            {submitError &&
            Object.keys(parseApiError(submitError).fieldErrors).length === 0 ? (
              <ApiErrorCallout error={submitError} className="mt-4" />
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {submitHint && submitDisabled && !busy ? (
            <p className="w-full text-sm text-muted-foreground sm:order-first sm:mr-auto sm:w-auto">
              {submitHint}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={busy || submitDisabled}
            onClick={async () => {
              setBusy(true);
              setSubmitError(null);
              try {
                const keepOpen = await onSubmit();
                if (keepOpen !== false) setOpen(false);
              } catch (err) {
                setSubmitError(err);
                if (onError) {
                  onError(err);
                } else if (!suppressDefaultErrorToast) {
                  toastApiError(err);
                }
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="animate-spin" />}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
