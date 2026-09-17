"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Clock3, Headphones, LoaderCircle, MessageCircleMore, Paperclip, Phone, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CustomerPageHeader } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCreateCustomerGrievanceMutation, useGetCustomerGrievanceQuery, useGetCustomerGrievancesQuery, useReplyCustomerGrievanceMutation } from "@/src/store/api/customer-api";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { toast } from "sonner";

function requestTone(status: string) {
  return status === "RESOLVED" || status === "CLOSED" ? "bg-[#eaf9ef] text-[#15934b]" : "bg-[#fff2cf] text-[#805b14]";
}

export function CustomerSupportPage() {
  const { tenantSlug, tenant } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerGrievancesQuery();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("PAYMENT");
  const [create, state] = useCreateCustomerGrievanceMutation();
  if (isLoading || !data) return <PageSkeleton cards={2} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const submit = async () => {
    if (!subject.trim() || !description.trim()) return toast.error("Add a subject and description");
    try {
      await create({ category, subject, description }).unwrap();
      toast.success("Support request created");
      setOpen(false);
      setSubject("");
      setDescription("");
    } catch {
      toast.error("Could not create the request");
    }
  };

  return (
    <div>
      <CustomerPageHeader eyebrow="We’re here to help" title="Support" description="Raise a request and follow each public reply." action={<Button onClick={() => setOpen(true)} className="h-11 rounded-xl bg-[#730321] font-bold hover:bg-[#5b021a]"><Plus className="size-4" />New request</Button>} />
      <section className="mb-5 flex flex-col gap-4 rounded-[1.25rem] border border-[#ead9ae] bg-[#fffaf0] p-5 sm:flex-row sm:items-center"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#fff0c8] text-[#8b5f08]"><Headphones className="size-5" /></span><div><h2 className="font-black">Need immediate help?</h2><p className="mt-1 text-sm text-[#706b77]">Call {tenant?.displayName ?? "your jeweller"} during branch hours.</p></div>{tenant?.displayName ? <Button asChild variant="outline" className="rounded-xl bg-white sm:ml-auto"><Link href={customerPath(tenantSlug, "branches")}><Phone className="size-4" />View branches</Link></Button> : null}</section>
      <section className="customer-surface overflow-hidden"><div className="border-b border-[#e8dfd9] p-5 sm:px-6"><h2 className="font-black">Your requests</h2><p className="mt-1 text-xs text-[#77727c]">Open a ticket to see the conversation</p></div>{data.length ? <div className="divide-y divide-[#e8dfd9]">{data.map((item) => <Link key={item.id} href={customerPath(tenantSlug, "support", item.id)} className="flex items-center gap-3 p-4 transition hover:bg-[#fcfaf8] sm:p-5"><span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-[#f7edf0] text-[#730321]"><MessageCircleMore className="size-5" />{item.unreadForCustomer ? <i className="absolute right-0 top-0 size-2.5 rounded-full bg-[#ef394e] ring-2 ring-white" /> : null}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black">{item.subject}</p><span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold ${requestTone(item.status)}`}>{item.statusLabel}</span></div><p className="mt-1 text-xs text-[#77727c]">{item.ticketNumber} · {item.category}</p></div><ChevronRight className="size-4 shrink-0 text-[#8a858e]" /></Link>)}</div> : <div className="p-10 text-center"><h2 className="font-black">No support requests</h2><p className="mt-1 text-sm text-[#706b77]">Create a request whenever you need help.</p></div>}</section>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg rounded-3xl"><DialogHeader><DialogTitle>New support request</DialogTitle><DialogDescription>Share enough detail for the jewellery team to help quickly.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger className="mt-2 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PAYMENT">Payment</SelectItem><SelectItem value="SCHEME">Scheme</SelectItem><SelectItem value="PROFILE">Profile / KYC</SelectItem><SelectItem value="REDEMPTION">Redemption</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select></div><div><Label>Subject</Label><Input className="mt-2" value={subject} onChange={(event) => setSubject(event.target.value)} /></div><div><Label>Description</Label><Textarea className="mt-2 min-h-28" value={description} onChange={(event) => setDescription(event.target.value)} /></div><Button type="button" variant="outline" className="w-full rounded-xl"><Paperclip className="size-4" />Attach file</Button><Button onClick={submit} disabled={state.isLoading} className="h-11 w-full rounded-xl bg-[#730321]">{state.isLoading ? <LoaderCircle className="animate-spin" /> : "Submit request"}</Button></div></DialogContent></Dialog>
    </div>
  );
}

export function CustomerGrievanceDetailPage({ id }: { id: string }) {
  const { tenantSlug } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerGrievanceQuery(id);
  const [message, setMessage] = useState("");
  const [reply, state] = useReplyCustomerGrievanceMutation();
  if (isLoading || !data) return <PageSkeleton cards={2} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const send = async () => {
    if (!message.trim()) return;
    try {
      await reply({ id: data.id, body: message, expectedVersion: data.version }).unwrap();
      toast.success("Reply sent");
      setMessage("");
    } catch {
      toast.error("Could not send reply. Refresh and try again.");
    }
  };

  return <div><Link href={customerPath(tenantSlug, "support")} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[#706b77] hover:text-[#730321]"><ArrowLeft className="size-4" />Back to support</Link><CustomerPageHeader title={data.subject} description={`${data.ticketNumber} · ${data.category}`} /><div className="grid gap-5 lg:grid-cols-[1fr_300px]"><section className="customer-surface p-5 sm:p-6"><div className="space-y-4">{data.messages.map((item) => <div key={item.id} className={`flex ${item.authorType === "CUSTOMER" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.authorType === "CUSTOMER" ? "rounded-br-sm bg-[#730321] text-white" : "rounded-bl-sm bg-[#f3efeb] text-[#292732]"}`}><p>{item.body}</p><p className={`mt-1 text-[0.62rem] ${item.authorType === "CUSTOMER" ? "text-white/60" : "text-[#817b84]"}`}>{new Date(item.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p></div></div>)}</div>{data.allowedActions.includes("REPLY") ? <div className="mt-6 flex gap-2 border-t border-[#e8dfd9] pt-4"><Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a reply…" className="min-h-12 resize-none rounded-xl" /><Button aria-label="Send reply" size="icon" onClick={send} disabled={state.isLoading} className="size-12 shrink-0 rounded-xl bg-[#730321]">{state.isLoading ? <LoaderCircle className="animate-spin" /> : <Send className="size-4" />}</Button></div> : null}</section><aside className="customer-surface h-fit p-5"><span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black ${requestTone(data.status)}`}>{data.statusLabel}</span><p className="mt-5 text-xs font-bold text-[#77727c]">Created</p><p className="mt-1 text-sm font-black">{new Date(data.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p><div className="mt-5 flex items-start gap-2 rounded-xl bg-[#fffaf0] p-3 text-xs leading-5 text-[#725719]"><Clock3 className="mt-0.5 size-4 shrink-0" />Expected response within the published service window.</div></aside></div></div>;
}
