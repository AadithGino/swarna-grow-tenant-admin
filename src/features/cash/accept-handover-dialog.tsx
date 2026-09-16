"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/src/components/common/page-parts";
import { money } from "@/src/lib/format";
import {
  useAcceptHandoverMutation,
  useRejectHandoverMutation,
  useResolveHandoverDiscrepancyMutation,
} from "@/src/store/api/admin-api";

export function AcceptHandoverDialog({
  handover,
  open,
  onOpenChange,
}: {
  handover: { id: string; handoverNo: string; amount: number; status: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [acceptedPaise, setAcceptedPaise] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [accept] = useAcceptHandoverMutation();
  const [reject] = useRejectHandoverMutation();
  const [resolve] = useResolveHandoverDiscrepancyMutation();
  if (!handover) return null;
  const submitted = handover.amount;
  const accepted = acceptedPaise / 100 || submitted;
  const variance = submitted - accepted;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Accept {handover.handoverNo}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Submitted {money(submitted)}. Edit accepted amount if your count
            differs — any shortfall stays on staff balance until resolved.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <FieldLabel>Accepted amount (₹)</FieldLabel>
              <Input
                type="number"
                defaultValue={submitted}
                onChange={(e) =>
                  setAcceptedPaise(Math.round(Number(e.target.value) * 100))
                }
              />
            </div>
            {variance !== 0 && (
              <p className="text-sm text-amber-800">
                Variance {money(Math.abs(variance))}{" "}
                {variance > 0 ? "short" : "over"}
              </p>
            )}
            <Textarea
              placeholder="Acceptance remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </DialogBody>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            className="text-red-700"
            onClick={async () => {
              await reject({ id: handover.id, reason: remarks || "Rejected" }).unwrap();
              toast.success("Handover rejected");
              onOpenChange(false);
            }}
          >
            Reject
          </Button>
          <div className="flex gap-2">
            {handover.status === "DISCREPANCY" ? (
              <Button
                onClick={async () => {
                  await resolve({
                    id: handover.id,
                    acceptedAmountPaise: acceptedPaise || Math.round(submitted * 100),
                    remarks: remarks || "Resolved",
                  }).unwrap();
                  toast.success("Discrepancy resolved");
                  onOpenChange(false);
                }}
              >
                Resolve
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  const amountPaise =
                    acceptedPaise || Math.round(submitted * 100);
                  if (variance !== 0) {
                    await accept({
                      id: handover.id,
                      acceptedAmountPaise: amountPaise,
                      remarks: remarks || "Accepted with variance",
                    }).unwrap();
                  } else {
                    await accept({ id: handover.id, remarks }).unwrap();
                  }
                  toast.success("Handover accepted");
                  onOpenChange(false);
                }}
              >
                Accept
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
