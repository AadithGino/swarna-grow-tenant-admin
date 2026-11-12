"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Surface } from "@/src/components/common/page-parts";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { toastEcommerceOrderMutationError } from "@/src/lib/ecommerce-order-mutation-error";
import type { EcommerceFulfilmentHandoverBlock, EcommerceOrderDetail } from "@/src/types/ecommerce-order";

const PICKUP_CODE_MAX_ATTEMPTS = 5;

function formatExpiry(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export type ConfirmPickupCollectionArgs = {
  orderId: string;
  expectedVersion: number;
  pickupCode: string;
  recipientName: string;
  staffHandoverConfirmed: true;
  idempotencyKey: string;
};

export function EcommercePickupCollectionPanel({
  order,
  canOperate,
  confirmCollection,
  isConfirming,
  reissueCode,
  isReissuing = false,
  onSuccess,
  onError,
}: {
  order: EcommerceOrderDetail;
  canOperate: boolean;
  confirmCollection: (args: ConfirmPickupCollectionArgs) => Promise<Record<string, unknown>>;
  isConfirming: boolean;
  reissueCode?: () => Promise<Record<string, unknown>>;
  isReissuing?: boolean;
  onSuccess: () => void;
  onError: (err: unknown) => void;
}) {
  const handover: EcommerceFulfilmentHandoverBlock | null | undefined = order.fulfilmentHandover;
  const [pickupCode, setPickupCode] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [attested, setAttested] = useState(false);

  const expiryLabel = useMemo(() => formatExpiry(handover?.pickupCodeExpiresAt), [handover?.pickupCodeExpiresAt]);
  const attempts = Number(handover?.pickupCodeFailedAttempts ?? 0);
  const attemptsRemaining = Math.max(0, PICKUP_CODE_MAX_ATTEMPTS - attempts);

  if (String(order.status) !== "READY_FOR_PICKUP" || !canOperate) return null;

  const codeValid = /^\d{6}$/.test(pickupCode.trim());
  const nameValid = recipientName.trim().length >= 2;
  const codeUnavailable = handover?.pickupCodeActive === false || !expiryLabel || attemptsRemaining === 0;
  const canSubmit = codeValid && nameValid && attested && !isConfirming && !isReissuing && !codeUnavailable;

  return (
    <Surface
      title="Confirm store collection"
      description="Enter the pickup code the customer shows in their app, then confirm physical handover."
    >
      <div className="space-y-4 p-5 text-sm">
        {expiryLabel ? (
          <p className="text-muted-foreground">
            Customer code expires {expiryLabel}
            {handover?.pickupCodeActive === false ? " (expired — reissue the pickup code)" : ""}
          </p>
        ) : (
          <p className="text-amber-800">No active pickup code on this order. Reissue the pickup code.</p>
        )}
        {attempts > 0 ? (
          <p className="text-amber-800">
            {attemptsRemaining > 0
              ? `${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left before the code is locked.`
              : "Too many failed attempts. Reissue the pickup code."}
          </p>
        ) : null}
        {reissueCode ? <Button type="button" variant="outline" disabled={isReissuing || isConfirming} onClick={() => {
          void reissueCode().then(() => { setPickupCode(""); setAttested(false); toast.success("Pickup code released to the customer app (push + live). Ask them to open their order."); onSuccess(); })
            .catch(err => { toastEcommerceOrderMutationError(err, { onVersionConflict: onSuccess }); onError(err); });
        }}>{isReissuing ? "Releasing…" : "Release / reissue pickup code"}</Button> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="pickup-code">Customer pickup code</Label>
            <Input
              id="pickup-code"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              className="font-mono tracking-widest"
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6 digits"
            />
          </div>
          <div>
            <Label htmlFor="pickup-recipient">Collected by (name)</Label>
            <Input
              id="pickup-recipient"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Customer or nominee name"
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-dashed p-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={attested}
            onChange={(e) => setAttested(e.target.checked)}
          />
          <span>I handed the order to this person in person at the store.</span>
        </label>
        <Button
          type="button"
          className="rounded-xl"
          disabled={!canSubmit}
          onClick={() => {
            void confirmCollection({
              orderId: order.id,
              expectedVersion: Number(order.version ?? 1),
              pickupCode: pickupCode.trim(),
              recipientName: recipientName.trim(),
              staffHandoverConfirmed: true,
              idempotencyKey: newIdempotencyKey(),
            })
              .then((res) => {
                if (res.alreadyCollected === true) {
                  toast.message("Order was already marked collected.");
                } else {
                  toast.success("Collection confirmed — order marked collected.");
                }
                setPickupCode("");
                setRecipientName("");
                setAttested(false);
                onSuccess();
              })
              .catch((err) => {
                toastEcommerceOrderMutationError(err, { onVersionConflict: onSuccess });
                onError(err);
              });
          }}
        >
          {isConfirming ? "Confirming…" : "Confirm collection"}
        </Button>
      </div>
    </Surface>
  );
}
