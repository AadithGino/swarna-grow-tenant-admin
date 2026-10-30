import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "green" | "teal" | "amber" | "red" | "stone" | "blue" | "indigo" | "purple" | "orange" | "wine";

const toneClasses: Record<Tone, { pill: string; dot: string }> = {
  green: { pill: "border-emerald-200/80 bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  teal: { pill: "border-teal-200/80 bg-teal-50 text-teal-800", dot: "bg-teal-500" },
  amber: { pill: "border-amber-200/80 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  red: { pill: "border-red-200/80 bg-red-50 text-red-700", dot: "bg-red-500" },
  stone: { pill: "border-stone-200 bg-stone-50 text-stone-700", dot: "bg-stone-400" },
  blue: { pill: "border-sky-200/80 bg-sky-50 text-sky-800", dot: "bg-sky-500" },
  indigo: { pill: "border-indigo-200/80 bg-indigo-50 text-indigo-800", dot: "bg-indigo-500" },
  purple: { pill: "border-purple-200/80 bg-purple-50 text-purple-800", dot: "bg-purple-500" },
  orange: { pill: "border-orange-200/80 bg-orange-50 text-orange-800", dot: "bg-orange-500" },
  wine: { pill: "border-[#ecd3d9] bg-[#fbf1f3] text-[#7b0a2b]", dot: "bg-[#7b0a2b]" },
};

const statusTone: Record<string, Tone> = {
  ACTIVE: "green",
  SUCCESS: "green",
  VERIFIED: "green",
  DELIVERED: "green",
  ACCEPTED: "green",
  RESOLVED: "green",
  PAID: "green",
  COMPLETED: "green",
  REDEEMED: "green",
  CREDITED: "green",
  SETTLED: "green",
  PUBLISHED: "green",
  LIVE: "green",
  IN_STOCK: "green",
  FULFILLED: "green",
  CAPTURED: "green",
  REFUNDED: "teal",
  READ: "teal",
  PICKED_UP: "teal",
  PENDING: "amber",
  PENDING_PAYMENT: "amber",
  PAYMENT_PENDING: "amber",
  GRACE: "amber",
  QUEUED: "amber",
  WAITING_CUSTOMER: "amber",
  DISCREPANCY: "amber",
  DRAFT: "amber",
  PARTIALLY_PAID: "amber",
  REQUESTED: "amber",
  PENDING_APPROVAL: "amber",
  PENDING_VERIFICATION: "amber",
  PENDING_DECISION: "amber",
  COD_PENDING_ACCEPTANCE: "amber",
  ISSUED: "amber",
  LOW_STOCK: "amber",
  REFUND_REVIEW: "orange",
  PARTIALLY_REFUNDED: "orange",
  PAYABLE_OPEN: "orange",
  UNKNOWN_OUTCOME: "orange",
  OVERDUE: "red",
  FAILED: "red",
  PAYMENT_FAILED: "red",
  REJECTED: "red",
  BLOCKED: "red",
  DEFAULTED: "red",
  SUSPENDED: "red",
  URGENT: "red",
  CANCELLED: "red",
  OUT_OF_STOCK: "red",
  OPEN: "blue",
  IN_PROGRESS: "blue",
  DUE: "blue",
  PROCESSING: "blue",
  APPROVED: "blue",
  SUBMITTED: "blue",
  CONFIRMED: "blue",
  PACKED: "blue",
  CHARGE_PAID: "blue",
  SHIPPED: "indigo",
  READY_FOR_PICKUP: "indigo",
  LOCKED: "indigo",
  DISPATCHED: "indigo",
  IN_TRANSIT: "indigo",
  MATURITY: "purple",
  MATURED: "purple",
  UNALLOCATED_PENDING_REVIEW: "purple",
  AMOUNT_MISMATCH_PENDING_REVIEW: "purple",
  INACTIVE: "stone",
  ENROLMENT_EXPIRED: "stone",
  VOID: "stone",
  UPCOMING: "stone",
  EXPIRED: "stone",
  PAYMENT_EXPIRED: "stone",
  ARCHIVED: "stone",
  UNPUBLISHED: "stone",
  CLOSED_PREMATURE: "stone",
  HIDDEN: "stone",
};

const ACRONYMS = new Set(["cod", "upi", "kyc", "gst", "otp", "pdf", "pod", "inr", "neft", "imps"]);

function formatStatusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .split(" ")
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w))
    .join(" ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function statusToneOf(status?: string | null): Tone {
  const key = status?.trim() ? status.trim().toUpperCase() : "UNKNOWN";
  return statusTone[key] ?? "stone";
}

export function StatusBadge({
  status,
  label,
  className,
  tone,
}: {
  status?: string | null;
  label?: string;
  className?: string;
  /** Override the colour picked from the status code. */
  tone?: Tone;
}) {
  const key = status?.trim() ? status : "UNKNOWN";
  const t = toneClasses[tone ?? statusToneOf(key)];
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full py-[0.2rem] pl-2 pr-2.5 text-xs font-semibold whitespace-nowrap",
        t.pill,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", t.dot)} />
      {label ?? formatStatusLabel(key)}
    </Badge>
  );
}
