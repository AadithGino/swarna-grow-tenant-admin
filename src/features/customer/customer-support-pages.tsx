"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  ChevronRight,
  Clock3,
  Headphones,
  LoaderCircle,
  Paperclip,
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CustomerBrand } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  useCreateCustomerGrievanceMutation,
  useGetCustomerGrievanceQuery,
  useGetCustomerGrievancesQuery,
  useReplyCustomerGrievanceMutation,
} from "@/src/store/api/customer-api";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import type { CustomerGrievance } from "@/src/types/customer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TicketTab = "open" | "closed";

function isOpenTicket(item: CustomerGrievance) {
  return (
    item.status === "OPEN" ||
    item.status === "IN_PROGRESS" ||
    item.status === "AWAITING_CUSTOMER"
  );
}

function ticketHash(number: string) {
  return number.startsWith("#") ? number : `#${number}`;
}

function formatUpdatedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Updated recently";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `Updated today, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  }
  return `Updated ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

function statusBadgeClass(item: CustomerGrievance) {
  const label = String(item.statusLabel ?? item.status ?? "").toUpperCase();
  if (item.status === "RESOLVED" || item.status === "CLOSED") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (item.status === "AWAITING_CUSTOMER" || label.includes("AWAITING")) {
    return "bg-orange-50 text-orange-800";
  }
  if (item.status === "IN_PROGRESS" || label.includes("PROGRESS")) {
    return "bg-blue-50 text-blue-700";
  }
  return "bg-amber-50 text-amber-800";
}

function statusBadgeLabel(item: CustomerGrievance) {
  if (item.status === "IN_PROGRESS") return "IN PROGRESS";
  if (item.status === "AWAITING_CUSTOMER") return "AWAITING YOUR REPLY";
  if (item.status === "RESOLVED") return "RESOLVED";
  if (item.status === "CLOSED") return "CLOSED";
  return String(item.statusLabel ?? item.status ?? "OPEN").toUpperCase();
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatSlaBanner(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Expected resolution within the published service window.";
  const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return `Expected resolution by ${date}, ${time}`;
}

function TicketCard({ item, tenantSlug }: { item: CustomerGrievance; tenantSlug: string | null }) {
  return (
    <Link
      href={customerPath(tenantSlug, "support", item.id)}
      className="customer-surface flex items-start gap-3 p-4 transition hover:border-[#dac17e]"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#171722]">{item.subject}</p>
        <p className="mt-1 text-[11px] font-semibold text-[#8a8490]">{ticketHash(item.ticketNumber)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide", statusBadgeClass(item))}>
            {statusBadgeLabel(item)}
          </span>
          <span className="text-[10px] text-[#8a8490]">{formatUpdatedAt(item.updatedAt)}</span>
        </div>
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-[#b0a9b3]" />
    </Link>
  );
}

function SupportLotusMark() {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-full font-serif text-lg leading-none"
      style={{ color: "var(--customer-accent, #c9a227)", background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.15)" }}
    >
      ✿
    </span>
  );
}

export function CustomerSupportPage() {
  const { tenantSlug, tenant } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerGrievancesQuery();
  const [tab, setTab] = useState<TicketTab>("open");
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("PAYMENT");
  const [create, state] = useCreateCustomerGrievanceMutation();

  const openTickets = useMemo(
    () => (data ?? []).filter(isOpenTicket),
    [data],
  );
  const closedTickets = useMemo(
    () => (data ?? []).filter((t) => !isOpenTicket(t)),
    [data],
  );
  const supportPhone = tenant?.supportNumber ?? customerTenantFallbackPhone;

  if (isLoading) return <PageSkeleton cards={2} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const submit = async () => {
    if (!subject.trim() || !description.trim()) return toast.error("Add a subject and description");
    try {
      await create({ category, subject, description }).unwrap();
      toast.success("Support ticket created");
      setOpen(false);
      setSubject("");
      setDescription("");
    } catch {
      toast.error("Could not create the ticket");
    }
  };

  return (
    <div className="mx-auto max-w-lg pb-6">
      <div className="mb-4">
        <CustomerBrand compact />
      </div>
      <h1 className="text-[1.65rem] font-black tracking-[-.03em] text-[#11111b]">Support</h1>
      <p className="mt-1 text-sm text-[#777280]">We&apos;re here to help you with your SwarnaGrow journey</p>

      <section
        className="mt-5 flex gap-3 rounded-2xl border p-4"
        style={{
          borderColor: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.35)",
          background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.1)",
        }}
      >
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--customer-accent,#8b5f08)]"
          style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.2)" }}
        >
          <Headphones className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#171722]">We usually respond within 4 business hours</p>
          {supportPhone ? (
            <a
              href={`tel:${supportPhone.replace(/\s/g, "")}`}
              className="mt-1 inline-block text-sm font-black text-[var(--customer-primary,#730321)]"
            >
              {supportPhone}
            </a>
          ) : (
            <p className="mt-1 text-xs text-[#777280]">Contact your branch during business hours.</p>
          )}
        </div>
      </section>

      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="mt-4 h-12 w-full rounded-xl border-2 border-[var(--customer-primary,#730321)] bg-white text-base font-bold text-[var(--customer-primary,#730321)]"
      >
        <Plus className="mr-2 size-4" />
        Create new ticket
      </Button>

      <div
        className="mt-5 grid grid-cols-2 gap-1 rounded-full p-1"
        style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.12)" }}
      >
        {(
          [
            { key: "open", label: `Open (${openTickets.length})` },
            { key: "closed", label: `Closed (${closedTickets.length})` },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-full py-2.5 text-xs font-bold transition sm:text-sm",
              tab === item.key ? "text-white shadow-sm" : "text-[#706b77]",
            )}
            style={tab === item.key ? { background: "var(--customer-primary, #730321)" } : undefined}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {tab === "open" ? (
          openTickets.length ? (
            openTickets.map((item, index) => (
              <TicketCard
                key={item.id || item.ticketNumber || `open-${index}`}
                item={item}
                tenantSlug={tenantSlug}
              />
            ))
          ) : (
            <div className="customer-surface p-8 text-center text-sm text-[#777280]">No open tickets.</div>
          )
        ) : closedTickets.length ? (
          closedTickets.map((item, index) => (
            <TicketCard
              key={item.id || item.ticketNumber || `closed-${index}`}
              item={item}
              tenantSlug={tenantSlug}
            />
          ))
        ) : (
          <div className="customer-surface p-8 text-center text-sm text-[#777280]">No closed tickets.</div>
        )}
      </div>

      {tab === "open" && closedTickets.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-black text-[#171722]">Closed tickets</h2>
          <div className="space-y-3">
            {closedTickets.slice(0, 3).map((item, index) => (
              <TicketCard
                key={item.id || item.ticketNumber || `preview-${index}`}
                item={item}
                tenantSlug={tenantSlug}
              />
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create new ticket</DialogTitle>
            <DialogDescription>Share enough detail for the jewellery team to help quickly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="SCHEME">Scheme</SelectItem>
                  <SelectItem value="PROFILE">Profile / KYC</SelectItem>
                  <SelectItem value="REDEMPTION">Redemption</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Input className="mt-2" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-2 min-h-28" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button type="button" variant="outline" className="w-full rounded-xl">
              <Paperclip className="size-4" />
              Attach file
            </Button>
            <Button
              onClick={submit}
              disabled={state.isLoading}
              className="h-11 w-full rounded-xl font-bold text-white"
              style={{ background: "var(--customer-primary, #730321)" }}
            >
              {state.isLoading ? <LoaderCircle className="animate-spin" /> : "Submit ticket"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const customerTenantFallbackPhone = "+91 98470 22110";

export function CustomerGrievanceDetailPage({ id }: { id: string }) {
  const { tenantSlug, tenant } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerGrievanceQuery(id, {
    // Staff may reply while this screen is open.
    pollingInterval: 15_000,
  });
  const [message, setMessage] = useState("");
  const [reply, state] = useReplyCustomerGrievanceMutation();

  if (isLoading || !data) return <PageSkeleton cards={2} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const canReply = (data.allowedActions ?? []).includes("REPLY");
  const isActive = isOpenTicket(data);
  const jeweller = tenant?.displayName ?? tenant?.appDisplayName ?? "Swarna Mahal Support";

  const send = async () => {
    if (!message.trim()) return;
    try {
      await reply({ id: data.id, body: message, expectedVersion: data.version }).unwrap();
      toast.success("Message sent");
      setMessage("");
    } catch {
      toast.error("Could not send message. Refresh and try again.");
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col pb-32">
      <header className="mb-4 flex items-start gap-2">
        <Link
          href={customerPath(tenantSlug, "support")}
          className="grid size-10 shrink-0 place-items-center rounded-full text-[var(--customer-primary,#730321)] hover:bg-[#f6f2ee]"
          aria-label="Back to support"
        >
          <ArrowLeft className="size-5" strokeWidth={2.5} />
        </Link>
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="truncate text-base font-black text-[#171722]">{data.subject}</h1>
          <p className="text-[11px] font-semibold text-[#8a8490]">{ticketHash(data.ticketNumber)}</p>
          <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", statusBadgeClass(data))}>
            {statusBadgeLabel(data)}
          </span>
        </div>
      </header>

      {data.context ? (
        <section
          className="mb-4 flex items-center gap-3 rounded-xl border px-3 py-3"
          style={{
            borderColor: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.3)",
            background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.12)",
          }}
        >
          <svg viewBox="0 0 32 32" className="size-9 shrink-0" aria-hidden>
            <rect x="2" y="14" width="8" height="10" rx="1" fill="#c9a227" />
            <rect x="11" y="10" width="8" height="14" rx="1" fill="#e8c547" />
            <rect x="20" y="14" width="8" height="10" rx="1" fill="#a67c00" />
          </svg>
          <div className="min-w-0 text-sm">
            <p className="font-black text-[#171722]">{data.context.amountDisplay}</p>
            <p className="truncate text-xs text-[#706b77]">{data.context.schemeName}</p>
            <p className="text-[11px] text-[#8a8490]">{data.context.dateLabel}</p>
          </div>
        </section>
      ) : null}

      <section className="flex-1 space-y-4 px-0.5">
        {(data.messages ?? []).map((item, index) => {
          const isCustomer = item.authorType === "CUSTOMER";
          return (
            <div
              key={item.id || `msg-${index}`}
              className={cn("flex gap-2", isCustomer ? "justify-end" : "justify-start")}
            >
              {!isCustomer ? <SupportLotusMark /> : null}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  isCustomer
                    ? "rounded-br-md bg-[#f6edf0] text-[#171722]"
                    : "rounded-bl-md border border-[#ece6e1] bg-white text-[#292732]",
                )}
              >
                <p>{item.body}</p>
                <div
                  className={cn(
                    "mt-2 flex items-center justify-end gap-1 text-[10px]",
                    isCustomer ? "text-[#8a8490]" : "text-[#817b84]",
                  )}
                >
                  {!isCustomer ? <span className="mr-auto font-semibold text-[#706b77]">{jeweller} Support</span> : null}
                  <span>{formatMessageTime(item.createdAt)}</span>
                  {isCustomer ? <CheckCheck className="size-3.5 text-[var(--customer-primary,#730321)]" /> : null}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {isActive && data.slaDueAt ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#eafbf3] px-3 py-2.5 text-xs font-semibold text-emerald-800">
          <Clock3 className="size-4 shrink-0" strokeWidth={2} />
          {formatSlaBanner(data.slaDueAt)}
        </div>
      ) : null}

      {canReply ? (
        <div
          className="fixed inset-x-0 z-30 border-t border-[#ece6e1] bg-[#fffcfa]/98 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm"
          style={{ bottom: "calc(5.85rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto flex max-w-lg items-end gap-2">
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-[#e5ddd7] text-[#706b77]"
              aria-label="Attach file"
            >
              <Paperclip className="size-4" />
            </button>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message"
              className="h-11 flex-1 rounded-full border-[#e5ddd7] bg-white px-4"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              aria-label="Send message"
              size="icon"
              onClick={send}
              disabled={state.isLoading || !message.trim()}
              className="size-11 shrink-0 rounded-full text-white"
              style={{ background: "var(--customer-primary, #730321)" }}
            >
              {state.isLoading ? <LoaderCircle className="animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
