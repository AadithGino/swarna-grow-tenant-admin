import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  READ: "border-teal-200 bg-teal-50 text-teal-700",
  ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  PENDING_PAYMENT: "border-amber-200 bg-amber-50 text-amber-700",
  ENROLMENT_EXPIRED: "border-stone-200 bg-stone-50 text-stone-700",
  GRACE: "border-amber-200 bg-amber-50 text-amber-700",
  QUEUED: "border-amber-200 bg-amber-50 text-amber-700",
  WAITING_CUSTOMER: "border-amber-200 bg-amber-50 text-amber-700",
  DISCREPANCY: "border-amber-200 bg-amber-50 text-amber-700",
  DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
  OVERDUE: "border-red-200 bg-red-50 text-red-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  BLOCKED: "border-red-200 bg-red-50 text-red-700",
  INACTIVE: "border-stone-200 bg-stone-100 text-stone-700",
  DEFAULTED: "border-red-200 bg-red-50 text-red-700",
  SUSPENDED: "border-red-200 bg-red-50 text-red-700",
  URGENT: "border-red-200 bg-red-50 text-red-700",
  OPEN: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  DUE: "border-blue-200 bg-blue-50 text-blue-700",
  MATURITY: "border-purple-200 bg-purple-50 text-purple-700",
  MATURED: "border-purple-200 bg-purple-50 text-purple-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ISSUED: "border-amber-200 bg-amber-50 text-amber-800",
  VOID: "border-stone-200 bg-stone-100 text-stone-600",
  LOCKED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  PARTIALLY_PAID: "border-amber-200 bg-amber-50 text-amber-700",
  UPCOMING: "border-stone-200 bg-stone-50 text-stone-700",
  EXPIRED: "border-stone-200 bg-stone-100 text-stone-600",
  PARTIALLY_REFUNDED: "border-orange-200 bg-orange-50 text-orange-700",
  UNALLOCATED_PENDING_REVIEW: "border-purple-200 bg-purple-50 text-purple-700",
  AMOUNT_MISMATCH_PENDING_REVIEW: "border-purple-200 bg-purple-50 text-purple-700",
  REQUESTED: "border-amber-200 bg-amber-50 text-amber-800",
  PENDING_APPROVAL: "border-amber-200 bg-amber-50 text-amber-800",
  APPROVED: "border-blue-200 bg-blue-50 text-blue-800",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REDEEMED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CLOSED_PREMATURE: "border-stone-300 bg-stone-100 text-stone-800",
  COD_PENDING_ACCEPTANCE: "border-amber-200 bg-amber-50 text-amber-800",
  PROCESSING: "border-blue-200 bg-blue-50 text-blue-700",
  SHIPPED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  READY_FOR_PICKUP: "border-indigo-200 bg-indigo-50 text-indigo-700",
  PAYMENT_EXPIRED: "border-stone-200 bg-stone-100 text-stone-600",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};

function formatStatusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status?: string | null;
  label?: string;
  className?: string;
}) {
  const key = status?.trim() ? status : "UNKNOWN";
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[key] ?? "border-stone-200 bg-stone-50 text-stone-700",
        className,
      )}
    >
      {label ?? formatStatusLabel(key)}
    </Badge>
  );
}
