"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import {
  useCreateCustomerDigitalMetalsBankDestinationMutation,
  useGetCustomerDigitalMetalsBankDestinationsQuery,
  usePatchCustomerDigitalMetalsBankDestinationMutation,
} from "@/src/store/api/customer-api";
import {
  bankDestinationStatusLabel,
  CustomerDmPageShell,
  CustomerDmSurface,
} from "@/src/features/customer/customer-digital-metals-shared";

export function CustomerDigitalMetalsBankPage() {
  const { tenantSlug } = useCustomerTenant();
  const list = useGetCustomerDigitalMetalsBankDestinationsQuery();
  const [create, createState] = useCreateCustomerDigitalMetalsBankDestinationMutation();
  const [showForm, setShowForm] = useState(false);
  const [holder, setHolder] = useState("");
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const portfolioBack = customerPath(tenantSlug, "digital-metals");

  if (list.isLoading) return <PageSkeleton cards={1} />;
  if (list.isError) {
    return <QueryError error={list.error} onRetry={list.refetch} />;
  }

  async function onCreate() {
    try {
      await create({
        accountHolderName: holder.trim(),
        accountNumber: account.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        bankName: bankName.trim(),
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      toast.success("Bank account saved. Your jeweller will verify it before payouts.");
      setShowForm(false);
      setAccount("");
      list.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  const items = list.data?.items ?? [];

  return (
    <CustomerDmPageShell
      title="Bank accounts"
      subtitle="Sell payouts are sent only to accounts verified manually by your jeweller — not instant automated verification."
      backHref={portfolioBack}
      testId="customer-dm-bank-list"
    >
      {items.length === 0 && !showForm ? (
        <CustomerDmSurface testId="customer-dm-bank-empty">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#f6edf0] text-[var(--customer-primary,#730321)]">
            <Banknote className="size-7" aria-hidden />
          </span>
          <p className="mt-4 text-center text-sm text-[#5c3d42]">
            Add the bank account where you want sell proceeds credited.
          </p>
          <Button type="button" className="mx-auto mt-4 flex min-h-11 w-full max-w-xs" onClick={() => setShowForm(true)}>
            Add bank account
          </Button>
        </CustomerDmSurface>
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((b) => (
            <li key={b.id} className="rounded-2xl border border-[#eaded9] bg-white px-4 py-4 text-sm shadow-sm">
              <p className="font-semibold text-[#28161a]">{b.accountHolderName}</p>
              <p className="mt-1 text-[#5c3d42]">
                ****{b.accountLast4} · {b.ifsc}
                {b.bankName ? ` · ${b.bankName}` : null}
              </p>
              <p
                className={`mt-2 text-xs font-medium ${b.status === "ACTIVE" ? "text-emerald-800" : b.status === "PENDING_VERIFICATION" ? "text-amber-900" : "text-[#8a6a70]"}`}
              >
                {bankDestinationStatusLabel(b.status)}
              </p>
              <Link
                href={customerPath(tenantSlug, "digital-metals", "bank-edit", b.id)}
                className="mt-3 inline-flex min-h-10 items-center text-xs font-medium text-[var(--customer-primary,#730321)] underline underline-offset-2"
              >
                Edit or reconfirm account
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {showForm || items.length > 0 ? (
        showForm ? (
          <CustomerDmSurface className="mt-6">
            <h2 className="text-sm font-semibold text-[#28161a]">New bank account</h2>
            <div className="mt-4 space-y-3 max-w-md">
              <div>
                <Label htmlFor="holder">Account holder name</Label>
                <Input id="holder" value={holder} onChange={(e) => setHolder(e.target.value)} className="mt-1.5 min-h-11" />
              </div>
              <div>
                <Label htmlFor="account">Account number</Label>
                <Input
                  id="account"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  inputMode="numeric"
                  className="mt-1.5 min-h-11"
                />
              </div>
              <div>
                <Label htmlFor="ifsc">IFSC</Label>
                <Input
                  id="ifsc"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  className="mt-1.5 min-h-11 uppercase"
                  autoCapitalize="characters"
                />
              </div>
              <div>
                <Label htmlFor="bank">Bank name (optional)</Label>
                <Input id="bank" value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1.5 min-h-11" />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="min-h-11" disabled={createState.isLoading} onClick={() => void onCreate()}>
                  Save account
                </Button>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CustomerDmSurface>
        ) : (
          <Button type="button" className="mt-4 min-h-11" onClick={() => setShowForm(true)}>
            Add another account
          </Button>
        )
      ) : null}
    </CustomerDmPageShell>
  );
}

export function CustomerDigitalMetalsBankEditPage({ destinationId }: { destinationId: string }) {
  const { tenantSlug } = useCustomerTenant();
  const list = useGetCustomerDigitalMetalsBankDestinationsQuery();
  const [patch, patchState] = usePatchCustomerDigitalMetalsBankDestinationMutation();
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const row = list.data?.items?.find((b) => b.id === destinationId);

  if (list.isLoading) return <PageSkeleton cards={1} />;
  if (list.isError) {
    return <QueryError error={list.error} onRetry={list.refetch} />;
  }
  if (!row) {
    return (
      <CustomerDmPageShell title="Bank account" backHref={customerPath(tenantSlug, "digital-metals", "bank")}>
        <CustomerDmSurface>
          <p className="text-sm text-[#5c3d42]">Bank account not found.</p>
        </CustomerDmSurface>
      </CustomerDmPageShell>
    );
  }

  async function onReconfirm() {
    try {
      await patch({
        destinationId,
        confirmAccountNumber: confirmAccountNumber.trim(),
      }).unwrap();
      toast.success("Account reconfirmed.");
      list.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <CustomerDmPageShell
      title="Reconfirm bank account"
      subtitle="Re-enter your full account number so your jeweller can keep payout details accurate."
      backHref={customerPath(tenantSlug, "digital-metals", "bank")}
      testId="customer-dm-bank-edit"
    >
      <CustomerDmSurface>
        <p className="font-medium text-[#28161a]">{row.accountHolderName}</p>
        <p className="text-sm text-[#5c3d42]">
          ****{row.accountLast4} · {row.ifsc}
        </p>
        <p className="mt-2 text-xs text-[#8a6a70]">{bankDestinationStatusLabel(row.status)}</p>
        <div className="mt-6 space-y-3 max-w-md">
          <Label htmlFor="confirm-acct">Full account number</Label>
          <Input
            id="confirm-acct"
            value={confirmAccountNumber}
            onChange={(e) => setConfirmAccountNumber(e.target.value)}
            inputMode="numeric"
            className="min-h-11"
          />
          <Button type="button" className="min-h-11" disabled={patchState.isLoading} onClick={() => void onReconfirm()}>
            Reconfirm
          </Button>
        </div>
      </CustomerDmSurface>
    </CustomerDmPageShell>
  );
}
