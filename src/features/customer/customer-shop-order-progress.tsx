"use client";

import { Check, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "complete" | "current" | "upcoming" | "failed" | "cancelled";

export type TimelineStep = {
  id: string;
  label: string;
  hint?: string;
  state: StepState;
};

export type OrderTimeline = {
  steps: TimelineStep[];
  headline: string;
  subheadline?: string;
  tone: "success" | "warning" | "danger" | "neutral";
  progressRatio: number;
  terminal: boolean;
};

function isDelivery(order: Record<string, unknown>) {
  return String(order.fulfilmentMode ?? "") === "DELIVERY";
}

function isCod(order: Record<string, unknown>) {
  return String(order.paymentMethod ?? "ONLINE") === "COD";
}

function stepStates(count: number, activeIndex: number, failedIndex: number | null, cancelled: boolean): StepState[] {
  return Array.from({ length: count }, (_, i) => {
    if (cancelled) return i === 0 ? "complete" : "cancelled";
    if (failedIndex != null && i === failedIndex) return "failed";
    if (i < activeIndex) return "complete";
    if (i === activeIndex) return "current";
    return "upcoming";
  });
}

export function buildShopOrderTimeline(order: Record<string, unknown>): OrderTimeline {
  const status = String(order.status ?? "");
  const delivery = isDelivery(order);
  const cod = isCod(order);
  const codCollected = order.codCollectionStatus === "COLLECTED";
  const cancelled = status === "CANCELLED";
  const refunded = status === "REFUNDED" || status === "REFUND_PENDING";
  const cancellation = order.cancellation as
    | { request?: { status?: string; decisionReason?: string } | null }
    | undefined;
  const reqStatus = cancellation?.request?.status;
  if (reqStatus === "PENDING_DECISION") {
    return {
      steps: [
        { id: "placed", label: "Order placed", state: "complete" },
        { id: "review", label: "Cancellation review", state: "current" },
        { id: "done", label: "Resolved", state: "upcoming" },
      ],
      headline: "Cancellation request submitted",
      subheadline: "Your order stays active until the store decides. Refunds are not automatic.",
      tone: "warning",
      progressRatio: 0.45,
      terminal: false,
    };
  }
  if (reqStatus === "REJECTED") {
    return {
      steps: [
        { id: "placed", label: "Order placed", state: "complete" },
        { id: "review", label: "Cancellation declined", state: "failed" },
      ],
      headline: "Cancellation request declined",
      subheadline: cancellation?.request?.decisionReason
        ? String(cancellation.request.decisionReason)
        : "The store could not cancel this order.",
      tone: "danger",
      progressRatio: 0.35,
      terminal: false,
    };
  }
  if (reqStatus === "APPROVED_PROCESSING" && status === "REFUND_PENDING") {
    return {
      steps: [
        { id: "placed", label: "Order placed", state: "complete" },
        { id: "approved", label: "Cancellation approved", state: "complete" },
        { id: "refund", label: "Refund processing", state: "current" },
      ],
      headline: "Refund in progress",
      subheadline: "Your bank refund is not complete until the payment provider confirms.",
      tone: "warning",
      progressRatio: 0.7,
      terminal: false,
    };
  }

  if (cancelled || refunded) {
    const label = cancelled ? "Order cancelled" : "Refund in progress";
    return {
      steps: [
        { id: "placed", label: "Order placed", state: "complete" },
        { id: "end", label: label, state: cancelled ? "cancelled" : "failed" },
      ],
      headline: label,
      subheadline: order.stockReleaseReason
        ? String(order.stockReleaseReason).replaceAll("_", " ").toLowerCase()
        : undefined,
      tone: "danger",
      progressRatio: cancelled ? 0.15 : 0.5,
      terminal: true,
    };
  }

  if (cod) {
    const labels = delivery
      ? ["Order placed", "Store confirms", "Preparing", "Out for delivery", "Delivered"]
      : ["Order placed", "Store confirms", "Preparing", "Ready for pickup", "Collected"];
    let active = 0;
    let headline = String(order.statusLabel ?? "Order placed");
    let tone: OrderTimeline["tone"] = "neutral";

    if (status === "COD_PENDING_ACCEPTANCE") {
      active = 1;
      headline = "Waiting for store to confirm";
      tone = "warning";
    } else if (status === "PROCESSING") {
      active = 2;
      headline = codCollected ? "Preparing your order" : "Preparing — pay on delivery";
      tone = "neutral";
    } else if (status === "SHIPPED" || (status === "READY_FOR_PICKUP" && delivery)) {
      active = delivery ? 3 : 2;
      headline = delivery ? "On the way" : "Ready for pickup";
      tone = "warning";
    } else if (status === "READY_FOR_PICKUP" && !delivery) {
      active = 3;
      headline = "Ready for pickup";
      tone = "warning";
    } else if (status === "DELIVERED") {
      active = labels.length;
      headline = codCollected ? "Delivered" : "Delivered — payment pending";
      tone = codCollected ? "success" : "warning";
    }

    if (codCollected && status === "DELIVERED") {
      headline = "Delivered & paid (COD)";
      tone = "success";
    }

    const states = stepStates(labels.length, Math.min(active, labels.length - 1), null, false);
    if (status === "DELIVERED") {
      for (let i = 0; i < labels.length; i += 1) states[i] = "complete";
    }

    return {
      steps: labels.map((label, i) => ({ id: `s${i}`, label, state: states[i] })),
      headline,
      subheadline: codCollected ? undefined : "Cash on delivery — do not pay online",
      tone,
      progressRatio: active / labels.length,
      terminal: status === "DELIVERED" && codCollected,
    };
  }

  // Online payment
  const labels = delivery
    ? ["Order placed", "Payment", "Preparing", "Shipped", "Delivered"]
    : ["Order placed", "Payment", "Preparing", "Ready for pickup", "Collected"];

  let active = 0;
  let failedIndex: number | null = null;
  let headline = String(order.statusLabel ?? "Order placed");
  let tone: OrderTimeline["tone"] = "neutral";

  if (status === "PENDING_PAYMENT") {
    active = 1;
    headline = order.paymentAllowed ? "Complete payment" : "Awaiting payment setup";
    tone = "warning";
  } else if (status === "PAYMENT_FAILED") {
    active = 1;
    failedIndex = 1;
    headline = "Payment failed";
    tone = "danger";
  } else if (status === "PAYMENT_EXPIRED") {
    active = 1;
    failedIndex = 1;
    headline = "Payment window expired";
    tone = "danger";
  } else if (status === "PAID" || status === "PROCESSING") {
    active = 2;
    headline = status === "PAID" ? "Payment confirmed" : "Preparing your order";
    tone = status === "PAID" ? "success" : "neutral";
  } else if (status === "SHIPPED") {
    active = delivery ? 3 : 2;
    headline = "Shipped";
    tone = "warning";
  } else if (status === "READY_FOR_PICKUP") {
    active = delivery ? 2 : 3;
    headline = "Ready for pickup";
    tone = "warning";
  } else if (status === "DELIVERED") {
    active = labels.length;
    headline = "Delivered";
    tone = "success";
  }

  const states = stepStates(labels.length, Math.min(active, labels.length - 1), failedIndex, false);
  if (status === "DELIVERED") {
    for (let i = 0; i < labels.length; i += 1) states[i] = "complete";
  }

  return {
    steps: labels.map((label, i) => ({ id: `s${i}`, label, state: states[i] })),
    headline,
    tone,
    progressRatio: Math.min(1, active / labels.length),
    terminal: status === "DELIVERED",
  };
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "complete") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
        <Check className="size-4" strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full border-2 bg-white text-[var(--customer-primary,#730321)]"
        style={{ borderColor: "var(--customer-primary, #730321)" }}
      >
        <Circle className="size-3 fill-current" />
      </span>
    );
  }
  if (state === "failed" || state === "cancelled") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-red-600 text-white">
        <X className="size-4" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-[#d8d0c8] bg-[#f5f1ed]">
      <Circle className="size-2.5 text-[#bbb]" />
    </span>
  );
}

export function ShopOrderProgressStepper({
  timeline,
  compact,
}: {
  timeline: OrderTimeline;
  compact?: boolean;
}) {
  const { steps } = timeline;
  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "h-1 flex-1 rounded-full first:rounded-l-full last:rounded-r-full",
              step.state === "complete" && "bg-emerald-600",
              step.state === "current" && "bg-[var(--customer-primary,#730321)]",
              step.state === "upcoming" && "bg-[#e8e2dc]",
              (step.state === "failed" || step.state === "cancelled") && "bg-red-500",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StepIcon state={step.state} />
              {!last ? (
                <div
                  className={cn(
                    "my-1 w-0.5 flex-1 min-h-[1.75rem]",
                    step.state === "complete" ? "bg-emerald-600" : "bg-[#e8e2dc]",
                  )}
                />
              ) : null}
            </div>
            <div className={cn("pb-5 pt-0.5", last && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-bold",
                  step.state === "current" && "text-[var(--customer-primary,#730321)]",
                  step.state === "complete" && "text-[#171722]",
                  step.state === "upcoming" && "text-[#999]",
                  (step.state === "failed" || step.state === "cancelled") && "text-red-700",
                )}
              >
                {step.label}
              </p>
              {step.state === "current" && step.hint ? (
                <p className="text-xs text-[#777280]">{step.hint}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ShopOrderStatusHero({ timeline }: { timeline: OrderTimeline }) {
  const toneClass =
    timeline.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : timeline.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : timeline.tone === "danger"
          ? "border-red-200 bg-red-50 text-red-950"
          : "border-[#ece6e1] bg-[#faf7f4] text-[#171722]";

  return (
    <div className={cn("rounded-2xl border px-4 py-4", toneClass)}>
      <p className="text-lg font-black tracking-tight">{timeline.headline}</p>
      {timeline.subheadline ? (
        <p className="mt-1 text-sm opacity-80">{timeline.subheadline}</p>
      ) : null}
    </div>
  );
}

export function formatShopOrderDate(iso: unknown) {
  if (!iso) return "";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatAddressBlock(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const a = snapshot as Record<string, unknown>;
  const lines = [
    a.recipientName ? String(a.recipientName) : "",
    a.line1 ? String(a.line1) : "",
    a.line2 ? String(a.line2) : "",
    [a.city, a.state, a.pincode].filter(Boolean).join(", "),
  ].filter(Boolean);
  if (!lines.length) return null;
  return { lines, mobile: a.mobile ? String(a.mobile) : "" };
}
