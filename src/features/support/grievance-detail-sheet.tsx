"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Clock3,
  Headphones,
  Lock,
  MessageSquareReply,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import { handleFormApiError } from "@/src/lib/form-api-error";
import {
  grievanceMessageBodyReady,
  liveGrievanceMessageBodyError,
  validateGrievanceMessageBody,
} from "@/src/lib/grievance-form-validation";
import { StatusBadge } from "@/src/components/common/status-badge";
import { portalPathFromContract } from "@/src/lib/contract-paths";
import {
  useAssignGrievanceMutation,
  useGetGrievanceQuery,
  usePostGrievanceMessageMutation,
  useUpdateGrievancePriorityMutation,
  useUpdateGrievanceStatusMutation,
} from "@/src/store/api/admin-api";
import { EntityAuditTab } from "@/src/features/audit/entity-audit-tab";
import { SlaChip } from "@/src/features/support/sla-chip";
import type { GrievanceDetail, GrievanceMessage } from "@/src/types/domain";

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function MessageBubble({ message }: { message: GrievanceMessage }) {
  if (message.messageType === "SYSTEM_EVENT") {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-[#f3ece8] px-3 py-1 text-[11px] font-medium text-[#776a6d]">
          {message.body}
        </span>
      </div>
    );
  }

  if (message.messageType === "INTERNAL_NOTE") {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/70 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
          <Lock className="size-3.5" />
          Internal note · {message.authorName}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[#4f3d41]">
          {message.body}
        </p>
        <p className="mt-2 text-[11px] text-amber-800/70">
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    );
  }

  const isCustomer =
    message.authorType === "CUSTOMER" ||
    message.messageType === "CUSTOMER_MESSAGE";

  return (
    <div
      className={cn("flex gap-3", isCustomer ? "justify-start" : "justify-end")}
    >
      {isCustomer ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eaded9] text-xs font-bold text-[#730321]">
          {message.authorName.charAt(0).toUpperCase()}
        </div>
      ) : null}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
          isCustomer
            ? "rounded-tl-md border border-[#eaded9] bg-white"
            : "rounded-tr-md border border-[#e8c9cf] bg-[#fff8f9]",
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-sm font-semibold text-[#241316]">
            {message.authorName}
          </p>
          <p className="text-[11px] text-[#9a8a8e]">
            {formatMessageTime(message.createdAt)}
          </p>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#4f3d41]">
          {message.body}
        </p>
      </div>
      {!isCustomer ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#730321] text-xs font-bold text-white">
          {message.authorName.charAt(0).toUpperCase()}
        </div>
      ) : null}
    </div>
  );
}

function GrievanceDetailBody({
  d,
  grievanceId,
  tab,
  setTab,
  resolutionCode,
  setResolutionCode,
  messageMode,
  setMessageMode,
  reply,
  setReply,
  note,
  setNote,
  setReplyTouched,
  setNoteTouched,
  messageFieldErrors,
  setMessageFieldErrors,
  replyError,
  noteError,
  onAssign,
  onPostMessage,
  onReplyAndResolve,
  onPriorityChange,
}: {
  d: GrievanceDetail;
  grievanceId: string;
  tab: "thread" | "audit";
  setTab: (tab: "thread" | "audit") => void;
  resolutionCode: string;
  setResolutionCode: (v: string) => void;
  messageMode: "PUBLIC_REPLY" | "INTERNAL_NOTE";
  setMessageMode: (v: "PUBLIC_REPLY" | "INTERNAL_NOTE") => void;
  reply: string;
  setReply: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  setReplyTouched: (v: boolean) => void;
  setNoteTouched: (v: boolean) => void;
  messageFieldErrors: Record<string, string>;
  setMessageFieldErrors: (v: Record<string, string>) => void;
  replyError?: string;
  noteError?: string;
  onAssign: () => Promise<void>;
  onPostMessage: () => Promise<void>;
  onReplyAndResolve: () => Promise<void>;
  onPriorityChange: (priority: string) => Promise<void>;
}) {
  const activeComposeError =
    messageMode === "INTERNAL_NOTE" ? noteError : replyError;
  const composeValue = messageMode === "INTERNAL_NOTE" ? note : reply;
  const canPost = grievanceMessageBodyReady(composeValue);
  const canResolve =
    messageMode === "PUBLIC_REPLY" && grievanceMessageBodyReady(reply);
  const isResolved = d.status === "RESOLVED";
  const hasCustomerMessage = d.messages.some(
    (m) =>
      m.authorType === "CUSTOMER" || m.messageType === "CUSTOMER_MESSAGE",
  );
  const showOpeningDetails = d.description.trim() && !hasCustomerMessage;

  return (
    <>
      <div className="border-b border-[#eaded9] bg-gradient-to-br from-[#fdf8f5] via-[#f9f0f2] to-[#fffbf7] px-6 pb-5 pt-6 pr-14">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6f2a]">
          Support ticket
        </p>
        <SheetTitle className="mt-1 text-xl font-extrabold leading-snug tracking-tight text-[#241316] sm:text-2xl">
          {d.subject}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {d.ticketNo} · {d.customer}
        </SheetDescription>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={d.priority} />
          <StatusBadge status={d.status} />
          <SlaChip
            sla={d.sla}
            slaDueAt={d.slaDueAt}
            slaOverdue={d.slaOverdue}
            firstResponded={Boolean(d.slaFirstRespondedAt)}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#eaded9] bg-white/70 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#776a6d]">
              <UserRound className="size-3.5" />
              Customer
            </p>
            <p className="mt-1 text-sm font-semibold text-[#241316]">
              {d.customer}
            </p>
            {d.customerMobile ? (
              <p className="text-xs text-[#776a6d]">{d.customerMobile}</p>
            ) : null}
          </div>
          <div className="rounded-xl border border-[#eaded9] bg-white/70 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#776a6d]">
              <Headphones className="size-3.5" />
              Handling
            </p>
            <p className="mt-1 text-sm font-semibold text-[#241316]">
              {d.assignee || "Unassigned"}
            </p>
            <p className="text-xs text-[#776a6d]">
              {[d.branchName, d.category].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {d.relatedEntityLabel ? (
          <p className="mt-3 text-sm text-[#4f3d41]">
            Related:{" "}
            {d.relatedEntityPath ? (
              <Link
                href={portalPathFromContract(d.relatedEntityPath)}
                className="font-semibold text-[#730321] underline-offset-2 hover:underline"
              >
                {d.relatedEntityLabel}
              </Link>
            ) : (
              d.relatedEntityLabel
            )}
          </p>
        ) : null}

        <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-[#9a8a8e]">
          <Clock3 className="size-3" />
          {d.ticketNo}
          {d.createdAt
            ? ` · Opened ${formatMessageTime(d.createdAt)}`
            : null}
        </p>
      </div>

      <div className="border-b border-[#eaded9] bg-white px-6 py-3">
        <div className="inline-flex rounded-lg border border-[#eaded9] bg-[#faf7f5] p-1">
          <button
            type="button"
            onClick={() => setTab("thread")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
              tab === "thread"
                ? "bg-white text-[#241316] shadow-sm"
                : "text-[#776a6d] hover:text-[#241316]",
            )}
          >
            Thread
          </button>
          <button
            type="button"
            onClick={() => setTab("audit")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
              tab === "audit"
                ? "bg-white text-[#241316] shadow-sm"
                : "text-[#776a6d] hover:text-[#241316]",
            )}
          >
            Audit
          </button>
        </div>
      </div>

      {tab === "audit" ? (
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <EntityAuditTab entityType="grievance" entityId={grievanceId} />
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {showOpeningDetails ? (
              <div className="rounded-2xl border border-[#eaded9] bg-[#faf7f5] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#776a6d]">
                  Opening details
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#4f3d41]">
                  {d.description}
                </p>
              </div>
            ) : null}

            <div className="space-y-4">
              {d.messages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#eaded9] px-4 py-8 text-center text-sm text-[#776a6d]">
                  No messages yet. Use the composer below to respond.
                </p>
              ) : (
                d.messages.map((m) => <MessageBubble key={m.id} message={m} />)
              )}
            </div>
          </div>

          {!isResolved ? (
            <div className="shrink-0 border-t border-[#eaded9] bg-[#faf7f5] px-6 py-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-lg border border-[#eaded9] bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setMessageMode("PUBLIC_REPLY")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                      messageMode === "PUBLIC_REPLY"
                        ? "bg-[#730321] text-white"
                        : "text-[#776a6d] hover:text-[#241316]",
                    )}
                  >
                    Reply to customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageMode("INTERNAL_NOTE")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                      messageMode === "INTERNAL_NOTE"
                        ? "bg-amber-600 text-white"
                        : "text-[#776a6d] hover:text-[#241316]",
                    )}
                  >
                    Internal note
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={d.priority}
                    onValueChange={(v) => void onPriorityChange(v)}
                  >
                    <SelectTrigger className="h-9 w-[130px] border-[#eaded9] bg-white text-xs">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-[#eaded9] bg-white"
                    onClick={() => void onAssign()}
                  >
                    Assign to me
                  </Button>
                </div>
              </div>

              {messageMode === "INTERNAL_NOTE" ? (
                <p className="mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  <Lock className="size-3.5 shrink-0" />
                  Only your team can see this — customers never receive internal
                  notes.
                </p>
              ) : null}

              <Textarea
                rows={4}
                value={composeValue}
                onChange={(e) => {
                  setMessageFieldErrors({});
                  if (messageMode === "INTERNAL_NOTE") {
                    setNoteTouched(true);
                    setNote(e.target.value);
                  } else {
                    setReplyTouched(true);
                    setReply(e.target.value);
                  }
                }}
                placeholder={
                  messageMode === "INTERNAL_NOTE"
                    ? "Add a team-only note…"
                    : "Write a clear response to the customer…"
                }
                className={cn(
                  "resize-none border-[#e4d7d2] bg-white",
                  activeComposeError && "border-red-600",
                )}
                aria-invalid={Boolean(activeComposeError)}
              />
              <FormFieldError
                message={messageFieldErrors.body ?? activeComposeError}
              />
              <p className="mt-1 text-xs text-[#9a8a8e]">
                Up to 4,000 characters per message.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                {messageMode === "PUBLIC_REPLY" ? (
                  <div className="min-w-[220px] flex-1">
                    <FieldLabel>Resolution code</FieldLabel>
                    <Select
                      value={resolutionCode}
                      onValueChange={setResolutionCode}
                    >
                      <SelectTrigger className="h-10 border-[#eaded9] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "PAYMENT_POSTED",
                          "RECEIPT_REISSUED",
                          "EXPLAINED_TO_CUSTOMER",
                          "OTHER",
                        ].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="hidden flex-1 sm:block" />
                )}

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    disabled={!canPost}
                    className="border-[#eaded9] bg-white"
                    onClick={() => void onPostMessage()}
                  >
                    Post message
                  </Button>
                  {messageMode === "PUBLIC_REPLY" ? (
                    <Button
                      disabled={!canResolve}
                      className="bg-[#730321] hover:bg-[#5a021a]"
                      onClick={() => void onReplyAndResolve()}
                    >
                      <MessageSquareReply className="size-4" />
                      Reply & resolve
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="shrink-0 border-t border-[#eaded9] bg-emerald-50 px-6 py-4 text-sm text-emerald-900">
              This ticket is resolved. Reopen from the list if the customer
              needs further help.
            </div>
          )}
        </>
      )}
    </>
  );
}

export function GrievanceDetailSheet({
  grievanceId,
  onClose,
}: {
  grievanceId: string | null;
  onClose: () => void;
}) {
  const detailQuery = useGetGrievanceQuery(grievanceId ?? "", {
    skip: !grievanceId,
  });
  const [assign] = useAssignGrievanceMutation();
  const [postMessage] = usePostGrievanceMessageMutation();
  const [updateStatus] = useUpdateGrievanceStatusMutation();
  const [updatePriority] = useUpdateGrievancePriorityMutation();
  const [resolutionCode, setResolutionCode] = useState("EXPLAINED_TO_CUSTOMER");
  const [tab, setTab] = useState<"thread" | "audit">("thread");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [messageMode, setMessageMode] = useState<"PUBLIC_REPLY" | "INTERNAL_NOTE">(
    "PUBLIC_REPLY",
  );
  const [replyTouched, setReplyTouched] = useState(false);
  const [noteTouched, setNoteTouched] = useState(false);
  const [messageFieldErrors, setMessageFieldErrors] = useState<
    Record<string, string>
  >({});

  const replyError = useMemo(() => {
    if (!replyTouched && !reply.trim()) return undefined;
    return liveGrievanceMessageBodyError(reply);
  }, [reply, replyTouched]);

  const noteError = useMemo(() => {
    if (!noteTouched && !note.trim()) return undefined;
    return liveGrievanceMessageBodyError(note);
  }, [note, noteTouched]);

  const open = Boolean(grievanceId);

  function resetComposeState() {
    setReply("");
    setNote("");
    setReplyTouched(false);
    setNoteTouched(false);
    setMessageFieldErrors({});
    setTab("thread");
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          resetComposeState();
          onClose();
        }
      }}
    >
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {!grievanceId ? null : detailQuery.isLoading ? (
          <div className="p-6">
            <PageSkeleton />
          </div>
        ) : detailQuery.isError || !detailQuery.data ? (
          <div className="p-6">
            <QueryError
              error={detailQuery.error}
              onRetry={detailQuery.refetch}
            />
          </div>
        ) : (
          <GrievanceDetailBody
            d={detailQuery.data}
            grievanceId={grievanceId}
            tab={tab}
            setTab={setTab}
            resolutionCode={resolutionCode}
            setResolutionCode={setResolutionCode}
            messageMode={messageMode}
            setMessageMode={setMessageMode}
            reply={reply}
            setReply={setReply}
            note={note}
            setNote={setNote}
            setReplyTouched={setReplyTouched}
            setNoteTouched={setNoteTouched}
            messageFieldErrors={messageFieldErrors}
            setMessageFieldErrors={setMessageFieldErrors}
            replyError={replyError}
            noteError={noteError}
            onAssign={async () => {
              try {
                await assign({
                  id: detailQuery.data!.id,
                  assigneeId: "usr_admin",
                  expectedVersion: detailQuery.data!.version,
                }).unwrap();
                toast.success("Assigned to you");
                await detailQuery.refetch();
              } catch (err) {
                toastApiError(err, "Could not assign ticket");
              }
            }}
            onPriorityChange={async (priority) => {
              try {
                await updatePriority({
                  id: detailQuery.data!.id,
                  priority: priority as GrievanceDetail["priority"],
                  expectedVersion: detailQuery.data!.version,
                }).unwrap();
                toast.success("Priority updated");
                await detailQuery.refetch();
              } catch (err) {
                toastApiError(err, "Could not update priority");
              }
            }}
            onPostMessage={async () => {
              const raw = messageMode === "INTERNAL_NOTE" ? note : reply;
              if (messageMode === "INTERNAL_NOTE") setNoteTouched(true);
              else setReplyTouched(true);
              const bodyErr = validateGrievanceMessageBody(raw);
              if (bodyErr) {
                setMessageFieldErrors({ body: bodyErr });
                toast.error(bodyErr);
                return;
              }
              const body = raw.trim();
              try {
                await postMessage({
                  id: detailQuery.data!.id,
                  messageType: messageMode,
                  body,
                  expectedVersion: detailQuery.data!.version,
                }).unwrap();
                if (messageMode === "INTERNAL_NOTE") setNote("");
                else setReply("");
                setMessageFieldErrors({});
                toast.success("Message posted");
                await detailQuery.refetch();
              } catch (err) {
                handleFormApiError(err, {
                  setFieldErrors: setMessageFieldErrors,
                  fallback: "Could not post message",
                });
              }
            }}
            onReplyAndResolve={async () => {
              setReplyTouched(true);
              const bodyErr = validateGrievanceMessageBody(reply);
              if (bodyErr) {
                setMessageFieldErrors({ body: bodyErr });
                toast.error(bodyErr);
                return;
              }
              const body = reply.trim();
              try {
                await postMessage({
                  id: detailQuery.data!.id,
                  messageType: "PUBLIC_REPLY",
                  body,
                  expectedVersion: detailQuery.data!.version,
                }).unwrap();
                await updateStatus({
                  id: detailQuery.data!.id,
                  status: "RESOLVED",
                  resolutionCode,
                  resolutionSummary: body,
                  expectedVersion: detailQuery.data!.version + 1,
                }).unwrap();
                toast.success("Reply sent and request resolved");
                resetComposeState();
                onClose();
              } catch (err) {
                handleFormApiError(err, {
                  setFieldErrors: setMessageFieldErrors,
                  fallback: "Could not resolve grievance",
                });
              }
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
