"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Banknote, CheckCircle2, Gem, Info, Link2, PlusCircle, QrCode, ReceiptText, Search, ShieldCheck, Smartphone, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  useCreateAgentPaymentLinkMutation,
  useCreateAgentPaymentQrSessionMutation,
  useGetAgentCustomerQuery,
  useGetAgentGoldRateQuery,
  useGetAgentPassbookQuery,
  useGetAgentPayableRangeQuery,
  useGetAgentPaymentQrStatusQuery,
  useGetAgentSchemeQuery,
  useLazyGetAgentPaymentQuery,
  useRecordAgentPaymentMutation,
  useSearchAgentCustomersQuery,
} from "@/src/store/api/agent-api";
import { AgentCard, AgentEmpty, AgentLoadingCards, AgentPageHeader, AgentSchemeCard, AgentStatus, formatAgentDate, formatAgentMoney, formatAgentTime, formatAgentWeight } from "@/src/components/agent/agent-ui";
import { PortalBackLink } from "@/src/components/common/portal-back-link";
import { navigateBack } from "@/src/lib/navigate-back";
import type { AgentManualPaymentMode, AgentPayment, AgentPaymentQrSession } from "@/src/types/agent";
import { useAgentCapabilities } from "./use-agent-capabilities";

function agentQrImageUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(payload)}`;
}

const AGENT_PAYMENT_MODES: Array<{ value: AgentManualPaymentMode; label: string; hint: string }> = [
  { value: "CASH", label: "Cash in hand", hint: "Counts toward your cash-in-hand balance for branch handover" },
  { value: "UPI", label: "UPI", hint: "Customer paid via UPI — add reference if available" },
  { value: "CARD", label: "Card / POS", hint: "Card or POS terminal payment" },
  { value: "BANK_TRANSFER", label: "Bank transfer", hint: "NEFT / IMPS / RTGS" },
];

function agentAmountIsAllowed(amountPaise: number, quote?: import("@/src/types/agent").AgentPayableRange) {
  if (!quote?.payable || !Number.isSafeInteger(amountPaise) || amountPaise <= 0) return false;
  if (amountPaise < quote.minPayablePaise || amountPaise > quote.maxPayablePaise) return false;
  if (quote.maxPaymentPerTransactionPaise && amountPaise > quote.maxPaymentPerTransactionPaise) return false;
  if (quote.allowedAmountsPaise?.length && !quote.allowedAmountsPaise.includes(amountPaise)) return false;
  const increment = quote.paymentIncrementPaise ?? 1;
  if (increment > 1 && amountPaise % increment !== 0) return false;
  return true;
}

export function AgentCustomerSearchPage() {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 300);
  const searchQ = debounced.trim();
  const customers = useSearchAgentCustomersQuery({ q: searchQ, limit: 20 });
  const { registerCustomers } = useAgentCapabilities();
  return <div className="space-y-6">
<AgentPageHeader eyebrow="Collect cash" title="Find a customer" description="Search only customers assigned to your branch." action={registerCustomers ? <Button asChild className="h-11 rounded-xl font-black"><Link href="/agent/customers/new"><UserPlus className="mr-2 size-4" />New customer</Link></Button> : undefined} />
<AgentCard className="p-3 sm:p-4">
<div className="relative">
<Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#9a8f91]" />
<Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, mobile, customer no. or passbook" className="h-13 rounded-xl border-[#e3d8d2] bg-[#fcf9f7] pl-12 text-base" />
</div>
</AgentCard>{customers.isLoading ? <AgentLoadingCards /> : customers.data?.length ? <div className="grid gap-3 sm:grid-cols-2">{customers.data.map((customer) => {
    const activeCount = customer.schemeSummary?.active ?? customer.schemes?.length ?? 0;
    const leadScheme = customer.schemes?.[0];
    const schemeHint = leadScheme
      ? activeCount > 1
        ? `${leadScheme.planName} · +${activeCount - 1} more`
        : leadScheme.planName
      : activeCount === 0
        ? "No active schemes"
        : `${activeCount} active scheme${activeCount === 1 ? "" : "s"}`;
    return <Link key={customer.id} href={`/agent/customers/${customer.id}`} className="group rounded-[1.3rem] border border-[#e8ddd7] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d7bb7b] hover:shadow-lg">
<div className="flex items-center gap-3">
<span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#f7edf0] font-black text-[#730321]">{customer.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
<div className="min-w-0 flex-1">
<div className="flex items-center gap-2">
<p className="truncate font-black">{customer.name}</p>
<AgentStatus value={customer.status} />
</div>
<p className="mt-1 text-xs font-semibold text-[#81777a]">{customer.customerNumber}{customer.passbookNumber ? ` · ${customer.passbookNumber}` : ""}</p>
<p className="mt-1 flex items-center gap-1.5 text-xs text-[#81777a]">
<Smartphone className="size-3.5" />{customer.mobile}</p>
</div>
<ArrowRight className="size-4 text-[#730321] transition group-hover:translate-x-1" />
</div>
<div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f0e8e3] pt-3 text-xs">
<span className="min-w-0 truncate font-semibold text-[#83797c]">{schemeHint}</span>
<span className="shrink-0 font-black text-[#730321]">{activeCount > 0 ? "Select scheme" : "View"}</span>
</div>
</Link>;
  })}</div> : <AgentEmpty title={query.trim() ? "No matching customer" : "No customers available"} description={query.trim() ? "Try name, mobile, customer number or passbook (fuzzy match)." : "Customers assigned to your branch will appear here."} />}</div>;
}

export function AgentCustomerDetailPage({ id }: { id: string }) {
  const customer = useGetAgentCustomerQuery(id);
  const { enrolSchemes, kycMandatory, registerCustomers } = useAgentCapabilities();
  if (customer.isLoading) return <AgentLoadingCards />;
  if (!customer.data) return <AgentEmpty title="Customer unavailable" description="This customer is outside your branch or could not be loaded." />;
  const item = customer.data;
  const kycStatus = item.kyc?.status ?? "NOT_SUBMITTED";
  const kycNeedsAction = kycMandatory && kycStatus !== "VERIFIED";
  const canCaptureKyc = registerCustomers && kycStatus !== "VERIFIED";
  return <div className="space-y-6">
<PortalBackLink fallbackHref="/agent/collect" variant="agent">
<ArrowLeft className="size-4" />Back</PortalBackLink>
<AgentCard className="overflow-hidden">
<div className="bg-[linear-gradient(120deg,#750321,#4c0317)] p-6 text-white sm:p-7">
<div className="flex items-start gap-4">
<span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/12 text-lg font-black">{item.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
<div className="min-w-0">
<p className="text-xs font-bold uppercase tracking-[.16em] text-[#eac66f]">Customer record</p>
<h1 className="mt-1 text-2xl font-black">{item.name}</h1>
<p className="mt-1 text-sm text-white/65">{item.customerNumber} · {item.passbookNumber}</p>
</div>
</div>
</div>
<div className="grid gap-4 p-5 text-sm sm:grid-cols-3 sm:p-6">
<div>
<p className="text-xs font-bold text-[#91878a]">Mobile</p>
<p className="mt-1 font-black">{item.mobile}</p>
</div>
<div>
<p className="text-xs font-bold text-[#91878a]">KYC</p>
<p className={cn("mt-1 font-black", kycStatus === "VERIFIED" ? "text-[#087a50]" : "text-[#a16207]")}>{item.kyc?.status ?? "Not available"}</p>
{canCaptureKyc ? (
  <Link href={`/agent/customers/${item.id}/kyc`} className="mt-2 inline-flex text-xs font-bold text-[var(--customer-primary,#730321)] underline-offset-2 hover:underline">
    {kycStatus === "SUBMITTED" ? "View KYC status" : "Upload KYC documents"}
  </Link>
) : null}
</div>
<div>
<p className="text-xs font-bold text-[#91878a]">Active schemes</p>
<p className="mt-1 font-black">{item.schemeSummary?.active ?? item.schemes?.length ?? 0}</p>
</div>
</div>
</AgentCard>
{kycNeedsAction ? (
  <AgentCard className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <p className="font-black">KYC required before enrolment</p>
    <p className="mt-1 text-amber-900/80">
      {kycStatus === "SUBMITTED"
        ? "Documents are waiting for branch verification."
        : "Capture KYC documents in the agent app, then wait for the branch to verify."}
    </p>
    {canCaptureKyc && kycStatus !== "SUBMITTED" ? (
      <Button asChild className="mt-3 h-10 rounded-xl font-black">
        <Link href={`/agent/customers/${item.id}/kyc`}>Upload KYC</Link>
      </Button>
    ) : null}
  </AgentCard>
) : null}
<div>
<AgentPageHeader eyebrow="Choose scheme" title="What are you collecting for?" description="The payable amount is checked again before the receipt is created." action={enrolSchemes ? <Button asChild variant="outline" className="h-11 rounded-xl font-black"><Link href={`/agent/customers/${item.id}/enrol`}><PlusCircle className="mr-2 size-4" />Enrol in scheme</Link></Button> : undefined} />
{item.schemes?.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{item.schemes.map((scheme) => <AgentSchemeCard key={scheme.id} scheme={scheme} href={`/agent/collect/${scheme.id}`} />)}</div> : <div className="mt-4"><AgentEmpty title="No active schemes" description={enrolSchemes ? "Enrol this customer in a scheme to start collecting." : "Ask the branch to enrol this customer in a scheme."} /></div>}
</div>
</div>;
}

export function AgentCollectPaymentPage({ schemeId }: { schemeId: string }) {
  const router = useRouter();
  const scheme = useGetAgentSchemeQuery(schemeId);
  const [selectedTargetCycle, setSelectedTargetCycle] = useState<string | undefined>();
  const range = useGetAgentPayableRangeQuery({ schemeId, targetCycle: selectedTargetCycle });
  const customer = useGetAgentCustomerQuery(scheme.data?.customerId ?? "", { skip: !scheme.data?.customerId });
  const goldRate = useGetAgentGoldRateQuery(undefined, { skip: scheme.data?.valueBasis !== "GOLD_WEIGHT" });
  const passbook = useGetAgentPassbookQuery(schemeId);
  const [recordPayment, paymentState] = useRecordAgentPaymentMutation();
  const [createPaymentLink, linkState] = useCreateAgentPaymentLinkMutation();
  const [createQrSession, qrCreateState] = useCreateAgentPaymentQrSessionMutation();
  const [fetchPayment] = useLazyGetAgentPaymentQuery();
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<AgentManualPaymentMode>("CASH");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [receipt, setReceipt] = useState<AgentPayment | null>(null);
  const [qrSession, setQrSession] = useState<AgentPaymentQrSession | null>(null);
  const amountPaise = Math.round(Number(amount || (range.data ? range.data.suggestedPaise / 100 : 0)) * 100);
  const estimatedWeightMg = scheme.data?.valueBasis === "GOLD_WEIGHT" && goldRate.data?.ratePerGramPaise ? Math.floor((amountPaise * 1000) / goldRate.data.ratePerGramPaise) : 0;
  const validAmount = agentAmountIsAllowed(amountPaise, range.data);
  const goldBlocked = scheme.data?.valueBasis === "GOLD_WEIGHT" && !goldRate.data;
  const qrStatus = useGetAgentPaymentQrStatusQuery(qrSession?.token ?? "", {
    skip: !qrSession?.token,
    pollingInterval: qrSession ? 3_000 : 0,
  });

  useEffect(() => {
    if (!qrSession || !qrStatus.data?.paid) return;
    let cancelled = false;
    void (async () => {
      const paymentId = qrStatus.data.receipt?.paymentId ?? qrSession.paymentId ?? undefined;
      if (paymentId) {
        try {
          const payment = await fetchPayment(paymentId).unwrap();
          if (cancelled) return;
          setReceipt(payment);
          setQrSession(null);
          toast.success("Online payment received");
          void range.refetch();
          return;
        } catch {
          /* fall through to lightweight receipt */
        }
      }
      if (cancelled) return;
      setReceipt({
        id: paymentId ?? qrSession.id,
        receiptNumber: qrStatus.data.receipt?.receiptNumber ?? "ONLINE",
        amountPaise: qrSession.amountPaise,
        mode: "ONLINE_GATEWAY",
        status: "SUCCESS",
        source: "CUSTOMER_APP",
        paidAt: qrStatus.data.receipt?.paidAt ?? new Date().toISOString(),
        customer: {
          id: customer.data?.id ?? "",
          name: customer.data?.name ?? "Customer",
          mobile: customer.data?.mobile,
          customerNumber: customer.data?.customerNumber,
        },
        scheme: {
          id: schemeId,
          enrollmentNumber: scheme.data?.enrollmentNumber ?? "",
          planName: scheme.data?.planName,
        },
      });
      setQrSession(null);
      toast.success("Online payment received");
      void range.refetch();
    })();
    return () => {
      cancelled = true;
    };
  }, [
    customer.data?.customerNumber,
    customer.data?.id,
    customer.data?.mobile,
    customer.data?.name,
    fetchPayment,
    qrSession,
    qrStatus.data,
    range,
    scheme.data?.enrollmentNumber,
    scheme.data?.planName,
    schemeId,
  ]);

  useEffect(() => {
    if (!qrSession || !qrStatus.data?.failed) return;
    toast.error("Online payment failed or expired. Try again or record a manual collection.");
    setQrSession(null);
  }, [qrSession, qrStatus.data?.failed]);

  const submit = async () => {
    const fresh = await range.refetch();
    const quote = fresh.data;
    if (!quote) return toast.error("Could not refresh the payable position.");
    if (!agentAmountIsAllowed(amountPaise, quote)) return toast.error("The payable position changed. Choose an amount allowed by the refreshed quote.");
    try {
      const result = await recordPayment({
        schemeId,
        amountPaise,
        mode: paymentMode,
        expectedVersion: quote.expectedVersion,
        expectedPositionVersion: quote.positionVersion,
        targetCycle: quote.model === "FLEXIBLE" ? quote.targetCycle : undefined,
        reference: reference.trim() || undefined,
        remarks: remarks.trim() || undefined,
      }).unwrap();
      setReceipt(result);
      toast.success("Collection recorded");
    } catch (error) {
      const typed = error as { status?: number; data?: { code?: string; message?: string } };
      if (typed.status === 409 || typed.data?.code === "PAYMENT_POSITION_CHANGED") { await range.refetch(); toast.error("The payable position changed. Review the new amount before collecting."); }
      else toast.error(typed.data?.message ?? "Could not record this collection.");
    }
  };

  const shareOnlinePaymentLink = async () => {
    const fresh = await range.refetch();
    const quote = fresh.data;
    if (!quote || !agentAmountIsAllowed(amountPaise, quote)) {
      toast.error("The payable position changed. Review the refreshed amount.");
      return;
    }
    try {
      const link = await createPaymentLink({
        schemeId,
        amountPaise,
        targetCycle: quote.model === "FLEXIBLE" ? quote.targetCycle : undefined,
        expectedPositionVersion: quote.positionVersion,
        positionVersion: quote.positionVersion,
        expiresInMinutes: 30,
      }).unwrap();
      const url = new URL(link.url, window.location.origin).toString();
      const text = `${customer.data?.name ?? "Customer"}, pay ${formatAgentMoney(amountPaise)} toward ${scheme.data?.planName ?? "your scheme"}. This secure link expires in 30 minutes.`;
      if (navigator.share) await navigator.share({ title: "SwarnaGrow payment link", text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success("Payment link copied");
      }
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return;
      toast.error("Could not create the payment link. Refresh the payable position and try again.");
    }
  };

  const showPhonePeQr = async () => {
    const fresh = await range.refetch();
    const quote = fresh.data;
    if (!quote || !agentAmountIsAllowed(amountPaise, quote)) {
      toast.error("The payable position changed. Review the refreshed amount.");
      return;
    }
    try {
      const session = await createQrSession({
        schemeId,
        amountPaise,
        targetCycle: quote.model === "FLEXIBLE" ? quote.targetCycle : undefined,
        expectedPositionVersion: quote.positionVersion,
        positionVersion: quote.positionVersion,
        expiresInMinutes: 30,
      }).unwrap();
      setQrSession(session);
      toast.message("Show this QR to the customer", {
        description: "Waiting for PhonePe payment…",
      });
    } catch {
      toast.error("Could not start PhonePe QR. Refresh the payable position and try again.");
    }
  };

  if (scheme.isLoading || range.isLoading) return <AgentLoadingCards />;
  if (!scheme.data || !range.data) return <AgentEmpty title="Scheme unavailable" description="The scheme may no longer be active or payable." />;
  if (receipt) return <div className="mx-auto max-w-xl py-4">
<AgentCard className="overflow-hidden text-center">
<div className="bg-[#eaf9f1] px-6 py-8">
<span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-[#087a50] shadow-sm">
<CheckCircle2 className="size-8" />
</span>
<p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-[#087a50]">Collection successful</p>
<h1 className="mt-2 text-4xl font-black tracking-[-.04em]">{formatAgentMoney(receipt.amountPaise)}</h1>{receipt.weightMg ? <p className="mt-2 text-base font-black text-[#8d6109]">{formatAgentWeight(receipt.weightMg)} gold credited</p> : null}</div>
<div className="p-6">
<div className="grid grid-cols-2 gap-3 text-left">
<div className="rounded-xl bg-[#faf6f3] p-3">
<p className="text-xs text-[#8d8385]">Receipt</p>
<p className="mt-1 text-sm font-black">{receipt.receiptNumber}</p>
</div>
<div className="rounded-xl bg-[#faf6f3] p-3">
<p className="text-xs text-[#8d8385]">Customer</p>
<p className="mt-1 text-sm font-black">{receipt.customer.name}</p>
</div>
<div className="rounded-xl bg-[#faf6f3] p-3 sm:col-span-2">
<p className="text-xs text-[#8d8385]">Payment type</p>
<p className="mt-1 text-sm font-black">{receipt.mode.replaceAll("_", " ")}</p>
</div>
</div>
<div className="mt-5 grid gap-3 sm:grid-cols-2">
<Button onClick={() => { setReceipt(null); setAmount(""); void range.refetch(); }} variant="outline" className="h-11 rounded-xl">Collect again</Button>
<Button onClick={() => navigateBack(router, "/agent")} className="h-11 rounded-xl bg-[#730321] hover:bg-[#5c0219]">Back</Button>
</div>
</div>
</AgentCard>
</div>;

  const quote = range.data;
  const flexible = quote.model === "FLEXIBLE";
  const modeMeta = AGENT_PAYMENT_MODES.find((row) => row.value === paymentMode) ?? AGENT_PAYMENT_MODES[0];
  const referenceLabel =
    paymentMode === "UPI"
      ? "UPI reference"
      : paymentMode === "BANK_TRANSFER"
          ? "Transfer reference"
          : paymentMode === "CARD"
            ? "Approval / RR number"
            : "Reference";
  return <div className="space-y-6">
<PortalBackLink fallbackHref={customer.data ? `/agent/customers/${customer.data.id}` : "/agent/collect"} variant="agent">
<ArrowLeft className="size-4" />Back</PortalBackLink>
<AgentPageHeader eyebrow="Record collection" title={scheme.data.planName} description={`${customer.data?.name ?? "Customer"} · ${scheme.data.enrollmentNumber}`} />
<div className="grid gap-5 lg:grid-cols-[1fr_.72fr]">
<div className="space-y-5">
<AgentCard className="p-5 sm:p-6">
<div className="flex items-start justify-between gap-3">
<div>
<p className="text-xs font-black uppercase tracking-[.15em] text-[#a17217]">{scheme.data.valueBasis === "GOLD_WEIGHT" ? "Gold accumulation" : flexible ? `Flexible · ${quote.phase?.toLowerCase()} phase` : "Fixed instalment"}</p>
<h2 className="mt-2 text-xl font-black">Enter amount received</h2>
</div>
<span className="grid size-11 place-items-center rounded-2xl bg-[#f7edf0] text-[#730321]">
<Banknote className="size-5" />
</span>
</div>{flexible ? <div className="mt-4 rounded-xl border border-[#eddfc0] bg-[#fff9e9] p-3 text-xs leading-5 text-[#79561a]">
<Info className="mr-1.5 inline size-4" />This contribution is optional. Unused monthly allowance does not carry forward; money already collected never expires.</div> : null}<div className="mt-6">
<Label className="font-bold">Payment type</Label>
<div className="mt-2 flex flex-wrap gap-2">{AGENT_PAYMENT_MODES.map((row) => <button key={row.value} type="button" onClick={() => setPaymentMode(row.value)} className={`rounded-xl border px-3 py-2 text-xs font-black transition ${paymentMode === row.value ? "border-[#730321] bg-[#730321] text-white" : "border-[#e3d8d2] bg-[#fcf9f7] text-[#5c5255] hover:border-[#d5b979]"}`}>{row.label}</button>)}</div>
<p className="mt-2 text-xs leading-5 text-[#83797c]">{modeMeta.hint}</p>
</div>
{flexible && quote.targetCycleOptions && quote.targetCycleOptions.length > 1 ? (
  <div className="mt-6">
    <Label className="font-bold">Contribution cycle</Label>
    <Select value={quote.targetCycle ?? selectedTargetCycle ?? ""} onValueChange={(cycle) => setSelectedTargetCycle(cycle)}>
      <SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue placeholder="Choose cycle" /></SelectTrigger>
      <SelectContent>
        {quote.targetCycleOptions.map((option) => (
          <SelectItem key={option.cycle} value={option.cycle}>
            {option.label ?? option.cycle}{option.isCurrentCycle ? " (current)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
) : null}
<div className="mt-6">
<Label htmlFor="collection-amount" className="font-bold">Amount</Label>
<div className="relative mt-2">
<span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-[#730321]">₹</span>
<Input id="collection-amount" inputMode="decimal" value={amount || String(quote.suggestedPaise / 100)} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} className="h-16 rounded-2xl border-[#d9cbc5] pl-11 text-2xl font-black" />
</div>
<div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-[#83797c]">
<span>Minimum {formatAgentMoney(quote.minPayablePaise)}</span>
<span>Maximum {formatAgentMoney(quote.maxPayablePaise)}</span>
</div>
{quote.allowedAmountsPaise?.length ? (
  <div className="mt-3 flex flex-wrap gap-2">
    {quote.allowedAmountsPaise.map((paise) => (
      <button key={paise} type="button" onClick={() => setAmount(String(paise / 100))} className="rounded-full border border-[#d7bb7b] bg-[#fff9ef] px-3 py-1.5 text-xs font-black text-[#730321]">
        {formatAgentMoney(paise)}
      </button>
    ))}
  </div>
) : null}
{(quote.paymentIncrementPaise ?? 1) > 1 ? <p className="mt-2 text-xs text-[#83797c]">Amount must be in multiples of {formatAgentMoney(quote.paymentIncrementPaise ?? 1)}.</p> : null}
{(quote.reservedPaise ?? 0) > 0 ? <p className="mt-2 text-xs font-semibold text-amber-800">{formatAgentMoney(quote.reservedPaise ?? 0)} is reserved by a pending online payment.</p> : null}
</div>{scheme.data.valueBasis === "GOLD_WEIGHT" ? <div className="mt-5 overflow-hidden rounded-2xl border border-[#ead9ab] bg-[linear-gradient(120deg,#fff9e8,#fff2c9)] p-4">
<div className="flex items-center gap-3">
<span className="grid size-11 place-items-center rounded-2xl bg-white text-[#996700] shadow-sm">
<Gem className="size-5" />
</span>
<div>
<p className="text-xs font-bold uppercase tracking-wide text-[#8b681f]">Gold customer will receive</p>
<p className="mt-1 text-2xl font-black text-[#5e4007]">{goldBlocked ? "Rate unavailable" : formatAgentWeight(estimatedWeightMg)}</p>
</div>
</div>{goldRate.data ? <div className="mt-4 flex items-center justify-between border-t border-[#ead9ab] pt-3 text-xs font-semibold text-[#7f652d]">
<span>{goldRate.data.purity} rate · {formatAgentMoney(goldRate.data.ratePerGramPaise)}/g</span>
<span>{formatAgentDate(goldRate.data.effectiveDate)}</span>
</div> : <p className="mt-3 text-xs font-bold text-[#b42318]">Today’s rate is not published. Collection is blocked.</p>}<p className="mt-2 text-[.68rem] leading-5 text-[#8f7440]">Preview uses today’s applicable rate. The receipt confirms the final backend-allocated weight.</p>
</div> : null}<div className="mt-5 grid gap-4 sm:grid-cols-2">
<div>
<Label htmlFor="collection-reference" className="font-bold">{referenceLabel} <span className="font-normal text-[#94898c]">(optional)</span>
</Label>
<Input id="collection-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder={paymentMode === "CASH" ? "e.g. notes counted" : paymentMode === "UPI" ? "e.g. UTR / txn id" : "Reference for audit"} className="mt-2 h-11 rounded-xl" />
</div>
<div>
<Label htmlFor="collection-remarks" className="font-bold">Remarks <span className="font-normal text-[#94898c]">(optional)</span>
</Label>
<Textarea id="collection-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Route note" className="mt-2 min-h-11 rounded-xl" />
</div>
</div>
<div className="mt-5 flex items-center gap-2 rounded-xl bg-[#f7f4f2] px-3 py-2.5 text-xs font-semibold text-[#746a6d]">
<ShieldCheck className="size-4 text-[#087a50]" />Only cash increases your in-hand balance for branch submission.</div>
<Button disabled={!validAmount || goldBlocked || paymentState.isLoading || Boolean(qrSession)} onClick={submit} className="mt-5 h-13 w-full rounded-xl bg-[#730321] text-base font-black hover:bg-[#5d0219]">{paymentState.isLoading ? "Recording collection…" : <>Confirm {modeMeta.label.toLowerCase()} collection <ArrowRight className="ml-2 size-4" />
</>}</Button>
<Button disabled={!validAmount || goldBlocked || qrCreateState.isLoading || Boolean(qrSession)} onClick={() => void showPhonePeQr()} variant="outline" className="mt-3 h-12 w-full rounded-xl border-[#730321] font-black text-[#730321]"><QrCode className="mr-2 size-4" />{qrCreateState.isLoading ? "Starting PhonePe QR…" : "Show PhonePe QR"}</Button>
<Button disabled={!validAmount || goldBlocked || linkState.isLoading || Boolean(qrSession)} onClick={() => void shareOnlinePaymentLink()} variant="outline" className="mt-3 h-12 w-full rounded-xl border-[#d9cbc5] font-black text-[#5c5255]"><Link2 className="mr-2 size-4" />{linkState.isLoading ? "Creating secure link…" : "Create 30-minute online payment link"}</Button>
{qrSession ? (
  <div className="mt-5 rounded-2xl border border-[#ead9ab] bg-[#fffdf7] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[.14em] text-[#9b6a10]">PhonePe QR</p>
        <h3 className="mt-1 text-lg font-black">{formatAgentMoney(qrSession.amountPaise)}</h3>
        <p className="mt-1 text-xs leading-5 text-[#7f652d]">Ask the customer to scan with any UPI app. This screen updates when PhonePe confirms payment.</p>
      </div>
      <button type="button" aria-label="Close QR" onClick={() => setQrSession(null)} className="grid size-9 place-items-center rounded-full border border-[#e3d8d2] bg-white text-[#5c5255]">
        <X className="size-4" />
      </button>
    </div>
    <div className="mt-4 flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={agentQrImageUrl(qrSession.qrPayload)}
        alt="PhonePe payment QR"
        width={280}
        height={280}
        className="rounded-2xl border border-[#ead9ab] bg-white p-3 shadow-sm"
      />
    </div>
    <p className="mt-4 text-center text-xs font-semibold text-[#087a50]">
      {qrStatus.isFetching || qrStatus.data?.processing
        ? "Waiting for payment…"
        : qrStatus.data?.paid
          ? "Payment received"
          : "Listening for PhonePe confirmation"}
    </p>
  </div>
) : null}
</AgentCard>
</div>
<div className="space-y-5">
<AgentCard className="p-5">
<p className="text-xs font-black uppercase tracking-[.14em] text-[#9b6a10]">Payable position</p>
<div className="mt-4 space-y-3 text-sm">
<div className="flex justify-between">
<span className="text-[#82777a]">Scheme type</span>
<span className="font-black">{flexible ? `Flexible · ${quote.phase}` : "Fixed"}</span>
</div>{quote.installmentNumber ? <div className="flex justify-between">
<span className="text-[#82777a]">Instalment</span>
<span className="font-black">#{quote.installmentNumber}</span>
</div> : null}{quote.targetCycle ? <div className="flex justify-between">
<span className="text-[#82777a]">Cycle</span>
<span className="font-black">{quote.targetCycle}</span>
</div> : null}<div className="flex justify-between">
<span className="text-[#82777a]">Suggested amount</span>
<span className="font-black">{formatAgentMoney(quote.suggestedPaise)}</span>
</div>
<div className="flex justify-between">
<span className="text-[#82777a]">Payment type</span>
<span className="font-black">{modeMeta.label}</span>
</div>
</div>
</AgentCard>
<AgentCard>
<div className="flex items-center justify-between border-b border-[#eee5e0] px-5 py-4">
<div>
<h2 className="font-black">Recent passbook</h2>
<p className="text-xs text-[#8b8184]">Last recorded entries</p>
</div>
<ReceiptText className="size-5 text-[#730321]" />
</div>
<div className="divide-y divide-[#f0e8e3]">{(passbook.data?.ledger ?? []).length ? (passbook.data?.ledger ?? []).slice(0, 4).map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3">
<div className="min-w-0">
<p className="text-sm font-black">{formatAgentMoney(entry.amountPaise)}</p>
<p className="mt-0.5 truncate text-xs text-[#8b8184]">{entry.receiptNumber ?? (entry.installmentNumber ? `Instalment #${entry.installmentNumber}` : "Receipt")}{entry.mode ? ` · ${entry.mode.replaceAll("_", " ")}` : ""}</p>
{(entry.refundedAmountPaise ?? 0) > 0 ? <p className="mt-0.5 text-xs font-bold text-amber-700">Original {formatAgentMoney(entry.grossAmountPaise ?? entry.amountPaise)} · Refunded {formatAgentMoney(entry.refundedAmountPaise ?? 0)}</p> : null}
<p className="mt-0.5 text-xs text-[#a59a9d]">{entry.effectiveAt ? formatAgentTime(entry.effectiveAt) : "—"}</p>
</div>{entry.weightMg ? <span className="shrink-0 text-xs font-black text-[#8c620f]">{formatAgentWeight(entry.weightMg)}</span> : (entry.refundedAmountPaise ?? 0) > 0 ? <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">{entry.amountPaise > 0 ? "PARTIAL" : "REFUNDED"}</span> : <CheckCircle2 className="size-4 shrink-0 text-[#087a50]" />}</div>) : <p className="px-5 py-7 text-center text-xs text-[#8b8184]">No collections recorded on this scheme yet.</p>}</div>
</AgentCard>
</div>
</div>
</div>;
}
