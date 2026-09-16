"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { money } from "@/src/lib/format";

export function PositionChangedDialog({
  open,
  onOpenChange,
  previousAmount,
  newAmount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previousAmount: number;
  newAmount: number;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Allowance changed</DialogTitle>
            <DialogDescription>
              The payable amount changed while you were on this screen. Confirm
              the new amount before posting — we never silently reduce what you
              submit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4 text-center">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Was</p>
              <p className="text-lg font-bold line-through opacity-70">
                {money(previousAmount)}
              </p>
            </div>
            <div className="rounded-xl border-2 border-[#730321] bg-[#fff8f8] p-4">
              <p className="text-xs text-muted-foreground">Now</p>
              <p className="text-lg font-bold">{money(newAmount)}</p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Use {money(newAmount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
