import type {
  CustomerGrievance,
  GrievanceMessage,
} from "@/src/types/customer";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  AWAITING_CUSTOMER: "Awaiting your reply",
  WAITING_FOR_CUSTOMER: "Awaiting your reply",
  WAITING_CUSTOMER: "Awaiting your reply",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function normalizeStatus(
  status: unknown,
): CustomerGrievance["status"] {
  const raw = String(status ?? "OPEN").toUpperCase();
  if (raw === "WAITING_FOR_CUSTOMER" || raw === "WAITING_CUSTOMER") {
    return "AWAITING_CUSTOMER";
  }
  if (
    raw === "OPEN" ||
    raw === "IN_PROGRESS" ||
    raw === "AWAITING_CUSTOMER" ||
    raw === "RESOLVED" ||
    raw === "CLOSED"
  ) {
    return raw;
  }
  return "OPEN";
}

function isInternalOrSystemMessage(raw: any): boolean {
  const type = String(raw?.messageType ?? raw?.type ?? "").toUpperCase();
  return type === "INTERNAL_NOTE" || type === "SYSTEM_EVENT";
}

function adaptMessage(raw: any, index: number): GrievanceMessage {
  const authorRaw =
    raw?.authorType ??
    raw?.author?.actorType ??
    raw?.actorType ??
    "STAFF";
  const authorType: GrievanceMessage["authorType"] =
    String(authorRaw).toUpperCase() === "CUSTOMER" ? "CUSTOMER" : "STAFF";
  return {
    id: String(raw?.id ?? raw?._id ?? `msg_${index}`),
    authorType,
    body: String(raw?.body ?? ""),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
  };
}

/** Normalize GET /app/grievances list + detail payloads for the customer portal. */
export function adaptCustomerGrievance(raw: unknown): CustomerGrievance {
  const row = (raw ?? {}) as Record<string, any>;
  const status = normalizeStatus(row.status);
  const id = String(row.id ?? row._id ?? "");
  const messages = Array.isArray(row.messages)
    ? row.messages
        .filter((message) => !isInternalOrSystemMessage(message))
        .map(adaptMessage)
    : [];
  const allowedActions = Array.isArray(row.allowedActions)
    ? row.allowedActions.map(String)
    : status === "OPEN" ||
        status === "IN_PROGRESS" ||
        status === "AWAITING_CUSTOMER"
      ? ["REPLY"]
      : status === "RESOLVED"
        ? ["REOPEN"]
        : [];

  return {
    id,
    ticketNumber: String(row.ticketNumber ?? row.ticketNo ?? id),
    category: String(row.category ?? row.categoryLabel ?? "GENERAL"),
    status,
    statusLabel:
      String(row.statusLabel ?? STATUS_LABELS[status] ?? status).trim() ||
      status,
    subject: String(row.subject ?? "Support request"),
    description: String(row.description ?? ""),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    updatedAt: String(
      row.updatedAt ?? row.createdAt ?? new Date().toISOString(),
    ),
    slaDueAt: String(
      row.slaDueAt ?? row.firstResponseDueAt ?? row.createdAt ?? "",
    ),
    unreadForCustomer: Boolean(row.unreadForCustomer),
    version: Number(row.version ?? 1),
    messages,
    allowedActions,
    context: row.context
      ? {
          amountDisplay: row.context.amountDisplay,
          schemeName: row.context.schemeName,
          dateLabel: row.context.dateLabel,
        }
      : undefined,
  };
}

export function adaptCustomerGrievanceList(raw: unknown): CustomerGrievance[] {
  if (Array.isArray(raw)) return raw.map(adaptCustomerGrievance);
  if (raw && typeof raw === "object") {
    const row = raw as Record<string, unknown>;
    if (Array.isArray(row.items)) return row.items.map(adaptCustomerGrievance);
    if (Array.isArray(row.data)) return row.data.map(adaptCustomerGrievance);
  }
  return [];
}
