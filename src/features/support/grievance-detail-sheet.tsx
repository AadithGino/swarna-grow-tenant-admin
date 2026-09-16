"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquareReply } from "lucide-react";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock } from "lucide-react";

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
  const [tab, setTab] = useState("thread");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [messageMode, setMessageMode] = useState<"PUBLIC_REPLY" | "INTERNAL_NOTE">(
    "PUBLIC_REPLY",
  );

  const open = Boolean(grievanceId);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {!grievanceId ? null : detailQuery.isLoading ? (
          <PageSkeleton />
        ) : detailQuery.isError || !detailQuery.data ? (
          <QueryError onRetry={detailQuery.refetch} />
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>
                {detailQuery.data.ticketNo} · {detailQuery.data.subject}
              </SheetTitle>
              <SheetDescription>
                {detailQuery.data.customer}
                {detailQuery.data.branchName
                  ? ` · ${detailQuery.data.branchName}`
                  : ""}{" "}
                · {detailQuery.data.category}
              </SheetDescription>
            </SheetHeader>
            <Tabs value={tab} onValueChange={setTab} className="px-4">
              <TabsList>
                <TabsTrigger value="thread">Thread</TabsTrigger>
                <TabsTrigger value="audit">Audit</TabsTrigger>
              </TabsList>
              <TabsContent value="audit" className="mt-4">
                {grievanceId ? (
                  <EntityAuditTab entityType="grievance" entityId={grievanceId} />
                ) : null}
              </TabsContent>
              <TabsContent value="thread" className="mt-4 space-y-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={detailQuery.data.priority} />
                <StatusBadge status={detailQuery.data.status} />
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${detailQuery.data.slaOverdue ? "border-red-200 bg-red-50 text-red-700" : ""}`}
                >
                  SLA{" "}
                  {detailQuery.data.slaOverdue
                    ? "overdue"
                    : detailQuery.data.slaFirstRespondedAt
                      ? "met"
                      : detailQuery.data.slaDueAt
                        ? `due ${new Date(detailQuery.data.slaDueAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
                        : detailQuery.data.sla}
                </span>
              </div>
              {detailQuery.data.relatedEntityLabel && (
                <p className="text-sm">
                  Related:{" "}
                  {detailQuery.data.relatedEntityPath ? (
                    <Link
                      href={portalPathFromContract(
                        detailQuery.data.relatedEntityPath,
                      )}
                      className="font-semibold text-[#730321] underline-offset-2 hover:underline"
                    >
                      {detailQuery.data.relatedEntityLabel}
                    </Link>
                  ) : (
                    detailQuery.data.relatedEntityLabel
                  )}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {detailQuery.data.description}
              </p>
              <div className="space-y-3 rounded-xl border bg-[#fbf8f5] p-4">
                {detailQuery.data.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl p-3 text-sm ${
                      m.messageType === "INTERNAL_NOTE"
                        ? "ml-6 border border-dashed bg-white"
                        : m.authorType === "CUSTOMER"
                          ? "bg-white"
                          : m.messageType === "SYSTEM_EVENT"
                            ? "text-center text-xs text-muted-foreground"
                            : "bg-[#fff8e8]"
                    }`}
                  >
                    {m.messageType !== "SYSTEM_EVENT" && (
                      <strong className="text-sm">
                        {m.authorName}
                        {m.messageType === "INTERNAL_NOTE" ? " · internal" : ""}
                      </strong>
                    )}
                    <p className="mt-1 text-muted-foreground">{m.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[160px]">
                  <label className="mb-2 block text-sm font-semibold">Priority</label>
                  <Select
                    value={detailQuery.data.priority}
                    onValueChange={async (v) => {
                      await updatePriority({
                        id: detailQuery.data!.id,
                        priority: v as any,
                        expectedVersion: detailQuery.data!.version,
                      }).unwrap();
                      toast.success("Priority updated");
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Compose
                </label>
                {messageMode === "INTERNAL_NOTE" && (
                  <p className="mb-2 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-950">
                    <Lock className="size-3.5" />
                    Only your team can see this — customers never receive internal notes.
                  </p>
                )}
                <Select
                  value={messageMode}
                  onValueChange={(v) =>
                    setMessageMode(v as "PUBLIC_REPLY" | "INTERNAL_NOTE")
                  }
                >
                  <SelectTrigger className="mb-2 h-9 w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC_REPLY">Reply to customer</SelectItem>
                    <SelectItem value="INTERNAL_NOTE">Internal note</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  rows={4}
                  value={messageMode === "INTERNAL_NOTE" ? note : reply}
                  onChange={(e) =>
                    messageMode === "INTERNAL_NOTE"
                      ? setNote(e.target.value)
                      : setReply(e.target.value)
                  }
                  placeholder={
                    messageMode === "INTERNAL_NOTE"
                      ? "Team-only note…"
                      : "Write a clear response…"
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={async () => {
                    await assign({
                      id: detailQuery.data!.id,
                      assigneeId: "usr_admin",
                      expectedVersion: detailQuery.data!.version,
                    }).unwrap();
                    toast.success("Assigned to you");
                  }}
                >
                  Assign to me
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const body =
                      messageMode === "INTERNAL_NOTE" ? note.trim() : reply.trim();
                    if (!body) {
                      toast.error("Enter a message");
                      return;
                    }
                    await postMessage({
                      id: detailQuery.data!.id,
                      messageType: messageMode,
                      body,
                      expectedVersion: detailQuery.data!.version,
                    }).unwrap();
                    if (messageMode === "INTERNAL_NOTE") setNote("");
                    else setReply("");
                    toast.success("Message posted");
                  }}
                >
                  Post message
                </Button>
                <Button
                  className="col-span-2"
                  onClick={async () => {
                    const body = reply.trim();
                    if (!body) {
                      toast.error("Enter a reply before resolving");
                      return;
                    }
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
                    setReply("");
                    onClose();
                  }}
                >
                  <MessageSquareReply />
                  Reply & resolve
                </Button>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Resolution code</label>
                <Select value={resolutionCode} onValueChange={setResolutionCode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[
                      "PAYMENT_POSTED",
                      "RECEIPT_REISSUED",
                      "EXPLAINED_TO_CUSTOMER",
                      "OTHER",
                    ].map((c) => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              </TabsContent>
            </Tabs>
          </>
        )}
        <SheetFooter />
      </SheetContent>
    </Sheet>
  );
}
