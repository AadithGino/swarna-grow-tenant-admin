import Link from "next/link";
import { ArrowRight, CalendarDays, Coins, Gem, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentSchemeSummary } from "@/src/types/agent";

export function formatAgentMoney(paise = 0) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

export function formatAgentWeight(mg = 0) { return `${(mg / 1000).toFixed(3)} g`; }
export function formatAgentDate(value?: string) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—"; }
export function formatAgentTime(value?: string) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—"; }

/** Cash is custody ("cash in hand"); other modes are payment channels. */
export function formatAgentPaymentMode(mode?: string | null) {
  const key = String(mode ?? "").trim().toUpperCase();
  switch (key) {
    case "CASH":
      return "Cash in hand";
    case "CARD":
      return "Card / POS";
    case "UPI":
      return "UPI";
    case "BANK_TRANSFER":
      return "Bank transfer";
    case "ONLINE_GATEWAY":
      return "Online payment";
    case "LEGACY_ONLINE":
      return "Legacy online";
    default:
      return key ? key.replaceAll("_", " ") : "—";
  }
}

export function AgentPageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[.18em] text-[#a07218]">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-black tracking-[-.035em] text-[#20171a] sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#766d70]">{description}</p> : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  );
}

export function AgentCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-[1.4rem] border border-[#eaded7] bg-white shadow-[0_8px_30px_rgba(65,34,41,.055)]", className)}>{children}</section>;
}

export function AgentStatus({ value }: { value: string }) {
  const tone = value === "ACCEPTED" || value === "ACTIVE" || value === "SUCCESS" ? "bg-[#e8f8ef] text-[#087a50]" : value === "PENDING" ? "bg-[#fff3d7] text-[#93630a]" : value === "REJECTED" || value === "DISCREPANCY" ? "bg-[#fff0ee] text-[#c22b26]" : "bg-[#f1eeee] text-[#72696c]";
  const label: Record<string, string> = { PENDING: "Awaiting branch", ACCEPTED: "Received by branch", REJECTED: "Rejected", DISCREPANCY: "Discrepancy", CANCELLED: "Cancelled", ACTIVE: "Active", SUCCESS: "Successful" };
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[.68rem] font-black uppercase tracking-wide", tone)}>{label[value] ?? value.replaceAll("_", " ")}</span>;
}

export function AgentSchemeCard({ scheme, href }: { scheme: AgentSchemeSummary; href: string }) {
  const flexible = scheme.paymentPattern === "FLEXIBLE";
  const gold = scheme.valueBasis === "GOLD_WEIGHT";
  const collectedLabel = gold ? "Gold saved" : "Collected so far";
  const collectedValue = gold
    ? formatAgentWeight(scheme.goldBalanceMg ?? 0)
    : formatAgentMoney(scheme.totalPaidPaise ?? 0);
  const dueLabel = scheme.payableLabel ?? (flexible ? "Contribution" : "Collect amount");
  const dueValue =
    scheme.nextAmountPaise != null
      ? scheme.payableMaxPaise != null &&
        scheme.payableMaxPaise > (scheme.nextAmountPaise ?? 0) &&
        flexible
        ? `${formatAgentMoney(scheme.nextAmountPaise)} – ${formatAgentMoney(scheme.payableMaxPaise)}`
        : formatAgentMoney(scheme.nextAmountPaise)
      : scheme.payable === false
        ? "—"
        : "Open";
  return (
    <Link
      href={href}
      className="group block rounded-[1.25rem] border border-[#e8ddd7] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#d5b979] hover:shadow-lg sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl",
            gold ? "bg-[#fff3cd] text-[#9a6800]" : flexible ? "bg-[#f8ecef] text-[#730321]" : "bg-[#f4efeb] text-[#730321]",
          )}
        >
          {gold ? <Gem className="size-5" /> : flexible ? <WalletCards className="size-5" /> : <Coins className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="truncate text-base font-black text-[#25191d]">{scheme.planName}</p>
              <p className="mt-0.5 text-xs font-semibold text-[#8a8083]">{scheme.enrollmentNumber}</p>
            </div>
            <AgentStatus value={scheme.status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#f0e8e3] pt-3">
            <div>
              <p className="text-[.68rem] font-bold uppercase tracking-wide text-[#978d8f]">{collectedLabel}</p>
              <p className="mt-1 text-sm font-black text-[#4e3505]">{collectedValue}</p>
            </div>
            <div>
              <p className="text-[.68rem] font-bold uppercase tracking-wide text-[#978d8f]">{dueLabel}</p>
              <p className="mt-1 text-sm font-black text-[#730321]">{dueValue}</p>
            </div>
          </div>
          {scheme.progressLabel ? (
            <p className="mt-2 text-[.68rem] font-semibold text-[#8a8083]">{scheme.progressLabel}</p>
          ) : null}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#fbf7f3] px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-[#766d70]">
              <CalendarDays className="size-3.5 text-[#a27318]" />
              Matures {formatAgentDate(scheme.maturityDate)}
            </span>
            <span className="inline-flex items-center gap-1 font-black text-[#730321]">
              Collect <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function AgentLoadingCards() { return <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-[1.25rem] border border-[#eee4df] bg-white/70" />)}</div>; }

export function AgentEmpty({ title, description }: { title: string; description: string }) { return <AgentCard className="px-6 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#fff3d7] text-[#9a690b]"><WalletCards className="size-5" /></span><h2 className="mt-4 font-black text-[#281b20]">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#7b7274]">{description}</p></AgentCard>; }
