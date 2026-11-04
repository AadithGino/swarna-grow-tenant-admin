"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Surface } from "@/src/components/common/page-parts";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { formatOrderInr } from "@/src/features/ecommerce/ecommerce-order-ui";
import { paiseToRupeesNumber } from "@/src/lib/ui-amount-conversion";

export type RecordMoneyReceivedOrderRow = {
  orderId: string;
  orderNumber: string;
  expectedCodPaise: number;
};

type RecordMoneyReceivedPayload = {
  orderIds: string[];
  bankCreditReference: string;
  bankCreditRupees: string;
  totalCourierFeeRupees: string;
  bankCreditedAt?: string;
};

type Props = {
  selectedOrders: RecordMoneyReceivedOrderRow[];
  canOperate: boolean;
  isSubmitting: boolean;
  onSubmit: (payload: RecordMoneyReceivedPayload) => Promise<unknown>;
  onSuccess: (result: { outcomeLabel?: string | null }) => void;
  onError: (error: unknown) => void;
};

function toDateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function EcommerceRecordMoneyReceivedPanel({
  selectedOrders,
  canOperate,
  isSubmitting,
  onSubmit,
  onSuccess,
  onError,
}: Props) {
  const [bankRef, setBankRef] = useState("");
  const [bankRupees, setBankRupees] = useState("");
  const [feeRupees, setFeeRupees] = useState("0");
  const [bankDate, setBankDate] = useState(() => toDateInputValue(new Date()));

  const totals = useMemo(() => {
    const grossPaise = selectedOrders.reduce((s, o) => s + o.expectedCodPaise, 0);
    const feeNum = Number(String(feeRupees).replace(/,/g, ""));
    const feePaise = Number.isFinite(feeNum) ? Math.round(feeNum * 100) : 0;
    const netPaise = grossPaise - feePaise;
    return { grossPaise, feePaise, netPaise };
  }, [selectedOrders, feeRupees]);

  const bankNum = Number(String(bankRupees).replace(/,/g, ""));
  const bankPaisePreview = Number.isFinite(bankNum) ? Math.round(bankNum * 100) : null;
  const mismatchPaise =
    bankPaisePreview != null && Number.isFinite(totals.netPaise)
      ? bankPaisePreview - totals.netPaise
      : null;

  if (!selectedOrders.length) return null;

  return (
    <Surface title="Record money received">
      <div className="space-y-4 p-5 text-sm">
        <p className="text-muted-foreground">
          {selectedOrders.length} order{selectedOrders.length === 1 ? "" : "s"} selected · expected COD{" "}
          <strong className="tabular-nums text-foreground">{formatOrderInr(totals.grossPaise)}</strong>
        </p>
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-muted/20 px-3 py-2 text-xs">
          {selectedOrders.map((o) => (
            <li key={o.orderId} className="flex justify-between gap-2">
              <span className="font-medium">{o.orderNumber}</span>
              <span className="tabular-nums">{formatOrderInr(o.expectedCodPaise)}</span>
            </li>
          ))}
        </ul>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="bank-ref">Bank reference (NEFT / UTR)</Label>
            <Input
              id="bank-ref"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              placeholder="e.g. NEFT123456789"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bank-rupees">Bank amount received (₹)</Label>
            <Input
              id="bank-rupees"
              inputMode="decimal"
              value={bankRupees}
              onChange={(e) => setBankRupees(e.target.value)}
              placeholder={paiseToRupeesNumber(totals.netPaise).toFixed(2)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fee-rupees">Total courier fees (₹)</Label>
            <Input
              id="fee-rupees"
              inputMode="decimal"
              value={feeRupees}
              onChange={(e) => setFeeRupees(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bank-date">Bank credit date</Label>
            <Input
              id="bank-date"
              type="date"
              value={bankDate}
              onChange={(e) => setBankDate(e.target.value)}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Expected net after fees:{" "}
          <strong className="tabular-nums text-foreground">{formatOrderInr(Math.max(0, totals.netPaise))}</strong>
          {mismatchPaise != null && mismatchPaise !== 0 ? (
            <span className={mismatchPaise < 0 ? " text-amber-800" : " text-amber-800"}>
              {" "}
              · Bank entry is {mismatchPaise < 0 ? "short" : "over"} by {formatOrderInr(Math.abs(mismatchPaise))}
            </span>
          ) : mismatchPaise === 0 ? (
            <span className=" text-emerald-800"> · Matches expected net</span>
          ) : null}
        </p>

        {mismatchPaise != null && mismatchPaise !== 0 ? (
          <Notice tone="amber">
            The bank amount does not match the expected net. We will still record the deposit and mark a{" "}
            {mismatchPaise < 0 ? "short payment" : "over payment"} for follow-up.
          </Notice>
        ) : null}

        {canOperate ? (
          <Button
            type="button"
            disabled={
              isSubmitting
              || bankRef.trim().length < 2
              || bankRupees.trim().length < 1
              || totals.feePaise > totals.grossPaise
            }
            onClick={() => {
              const bankCreditedAt = bankDate
                ? new Date(`${bankDate}T12:00:00.000Z`).toISOString()
                : undefined;
              void onSubmit({
                orderIds: selectedOrders.map((o) => o.orderId),
                bankCreditReference: bankRef.trim(),
                bankCreditRupees: bankRupees.trim(),
                totalCourierFeeRupees: feeRupees.trim() || "0",
                bankCreditedAt,
              })
                .then((res) => {
                  const outcome =
                    res && typeof res === "object" && "reconciliation" in res
                      ? (res as { reconciliation?: { outcomeLabel?: string } }).reconciliation?.outcomeLabel
                      : undefined;
                  onSuccess({ outcomeLabel: outcome ?? null });
                  setBankRef("");
                  setBankRupees("");
                  setFeeRupees("0");
                })
                .catch(onError);
            }}
          >
            Record money received
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Fulfilment operate permission required.</p>
        )}
      </div>
    </Surface>
  );
}
