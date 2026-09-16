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
  className,
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
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
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
          <div className="py-4">{children}</div>
        </DialogBody>
        <DialogFooter>
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
              try {
                const keepOpen = await onSubmit();
                if (keepOpen !== false) setOpen(false);
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
