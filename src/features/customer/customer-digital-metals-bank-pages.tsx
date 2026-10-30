"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Landmark, Plus } from "lucide-react";
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
      title="Payout bank accounts"
      subtitle="Money from selling metal is paid only into accounts your jeweller has checked by hand — there is no instant automated check."
      backHref={portfolioBack}
      backLabel="Wallet"
      testId="customer-dm-bank-list"
    >
      {items.length === 0 && !showForm ? (
        <CustomerDmSurface testId="customer-dm-bank-empty" className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-[rgba(var(--customer-primary-rgb,115,3,33),0.07)] text-[var(--customer-primary,#730321)]">
            <Banknote className="size-7" aria-hidden />
          </span>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#5c4f52]">
            Add the bank account where you want the money from sales to be paid.
          </p>
          <Button type="button" className="mx-auto mt-5 flex h-11 w-full max-w-xs rounded-full text-white" style={{ background: "var(--customer-primary, #730321)" }} onClick={() => setShowForm(true)}>
            Add bank account
          </Button>
        </CustomerDmSurface>
      ) : null}

      {items.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((b) => {
            const active = b.status === "ACTIVE";
            const pending = b.status === "PENDING_VERIFICATION";
            return (
              <li
                key={b.id}
                className="relative flex flex-col overflow-hidden rounded-[1.4rem] p-5 text-white"
                style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--customer-primary, #730321) 90%, black), color-mix(in srgb, var(--customer-primary, #730321) 55%, black))" }}
              >
                <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-40" style={{ background: "radial-gradient(circle, rgba(var(--customer-accent-rgb,201,162,39),.55), transparent 65%)" }} aria-hidden />
                <div className="relative flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white/90">{b.bankName || "Bank account"}</p>
                  <Landmark className="size-5 text-white/70" aria-hidden />
                </div>
                <p className="relative mt-6 font-mono text-lg tracking-[0.2em]">•••• •••• {b.accountLast4}</p>
                <p className="relative mt-1 text-xs text-white/70">
                  {b.accountHolderName} · {b.ifsc}
                </p>
                <div className="relative mt-5 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? "bg-emerald-400/20 text-emerald-100" : pending ? "bg-amber-300/20 text-amber-100" : "bg-white/10 text-white/70"}`}
                  >
                    <span className={`size-1.5 rounded-full ${active ? "bg-emerald-300" : pending ? "bg-amber-300" : "bg-white/50"}`} aria-hidden />
                    {bankDestinationStatusLabel(b.status)}
                  </span>
                  <Link
                    href={customerPath(tenantSlug, "digital-metals", "bank-edit", b.id)}
                    className="text-xs font-semibold text-white underline-offset-4 hover:underline"
                  >
                    Reconfirm
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {showForm || items.length > 0 ? (
        showForm ? (
          <CustomerDmSurface className="mt-6">
            <h2 className="text-[15px] font-semibold text-[#221a1d]">New bank account</h2>
            <p className="mt-1 text-xs text-[#7a6f72]">Use an account in your own name. Your jeweller checks it before any payout.</p>
            <div className="mt-5 grid max-w-xl gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="holder">Account holder name</Label>
                <Input id="holder" value={holder} onChange={(e) => setHolder(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="account">Account number</Label>
                <Input id="account" value={account} onChange={(e) => setAccount(e.target.value)} inputMode="numeric" className="mt-1.5 h-11 rounded-xl font-mono tracking-wider" />
              </div>
              <div>
                <Label htmlFor="ifsc">IFSC</Label>
                <Input id="ifsc" value={ifsc} onChange={(e) => setIfsc(e.target.value)} className="mt-1.5 h-11 rounded-xl font-mono uppercase" autoCapitalize="characters" />
              </div>
              <div>
                <Label htmlFor="bank">Bank name (optional)</Label>
                <Input id="bank" value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                <Button type="button" className="h-11 rounded-full px-6 text-white" style={{ background: "var(--customer-primary, #730321)" }} disabled={createState.isLoading} onClick={() => void onCreate()}>
                  Save account
                </Button>
                <Button type="button" variant="ghost" className="h-11 rounded-full" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CustomerDmSurface>
        ) : (
          <Button type="button" variant="outline" className="mt-5 h-11 rounded-full px-5" onClick={() => setShowForm(true)}>
            <Plus className="mr-1.5 size-4" /> Add another account
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
      narrow
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
          <Button type="button" className="h-11 rounded-full px-6 text-white" style={{ background: "var(--customer-primary, #730321)" }} disabled={patchState.isLoading} onClick={() => void onReconfirm()}>
            Reconfirm
          </Button>
        </div>
      </CustomerDmSurface>
    </CustomerDmPageShell>
  );
}
