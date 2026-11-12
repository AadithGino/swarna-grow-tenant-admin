"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Store, KeyRound } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCustomerIdentity } from "@/src/components/customer/customer-identity-context";
import {
  useLazyGetShopOrderQuery,
  useLazyRevealCustomerRedemptionHandoverOtpQuery,
} from "@/src/store/api/customer-api";
import {
  connectCustomerRealtime,
  CustomerRealtimeEvent,
  disconnectCustomerRealtime,
  type HandoverCodeSocketPayload,
} from "@/src/lib/customer-realtime";
import { useBrowserPathname } from "@/src/hooks/use-browser-pathname";
import { toast } from "sonner";

type HandoverSession =
  | {
      kind: "REDEMPTION_OTP";
      redemptionId: string;
      schemeId?: string | null;
      expiresAt?: string | null;
    }
  | {
      kind: "SHOP_PICKUP";
      orderId: string;
      orderNumber?: string | null;
      expiresAt?: string | null;
    };

function formatExpiry(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function parseHandoverOtpFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("handoverOtp");
  if (fromQuery) return fromQuery;
  const path = window.location.pathname;
  const m = path.match(/\/schemes\/redemptions\/([^/]+)\/handover-otp\/?$/i);
  return m?.[1] ?? null;
}

function clearHandoverOtpQuery() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("handoverOtp")) return;
  url.searchParams.delete("handoverOtp");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function CustomerHandoverCodeHost() {
  const { ready: identityReady } = useCustomerIdentity();
  const pathname = useBrowserPathname();
  const [session, setSession] = useState<HandoverSession | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealRedemption] = useLazyRevealCustomerRedemptionHandoverOtpQuery();
  const [fetchOrder] = useLazyGetShopOrderQuery();

  const openSession = useCallback((next: HandoverSession) => {
    setSession(next);
    setCode(null);
    setError(null);
    setExpiresAt(next.expiresAt ?? null);
    setOpen(true);
  }, []);

  const loadCode = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      if (session.kind === "REDEMPTION_OTP") {
        const data = await revealRedemption(session.redemptionId).unwrap();
        setCode(String(data.handoverOtp ?? ""));
        setExpiresAt(data.expiresAt ? String(data.expiresAt) : session.expiresAt ?? null);
      } else {
        const order = await fetchOrder(session.orderId).unwrap();
        const pickup = order.pickupCode ? String(order.pickupCode) : "";
        if (!pickup) {
          setError("Pickup code is not available yet. Ask the store to release it again.");
          setCode(null);
        } else {
          setCode(pickup);
          const h = order.fulfilmentHandover as { pickupCodeExpiresAt?: string } | undefined;
          setExpiresAt(h?.pickupCodeExpiresAt ? String(h.pickupCodeExpiresAt) : session.expiresAt ?? null);
        }
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message ?? "Could not load code")
          : "Could not load code";
      setError(message);
      setCode(null);
    } finally {
      setLoading(false);
    }
  }, [session, revealRedemption, fetchOrder]);

  useEffect(() => {
    if (!open || !session) return;
    void loadCode();
  }, [open, session, loadCode]);

  useEffect(() => {
    if (!identityReady) {
      disconnectCustomerRealtime();
      return;
    }
    const socket = connectCustomerRealtime();
    if (!socket) return;

    const onRedemption = (payload: HandoverCodeSocketPayload) => {
      if (!payload?.redemptionId) return;
      toast.message("Redemption code ready", {
        description: "Show this code at the counter.",
      });
      openSession({
        kind: "REDEMPTION_OTP",
        redemptionId: String(payload.redemptionId),
        schemeId: payload.schemeId,
        expiresAt: payload.expiresAt,
      });
    };
    const onPickup = (payload: HandoverCodeSocketPayload) => {
      if (!payload?.orderId) return;
      toast.message("Pickup code ready", {
        description: payload.orderNumber
          ? `Order ${payload.orderNumber}`
          : "Show this code at the store.",
      });
      openSession({
        kind: "SHOP_PICKUP",
        orderId: String(payload.orderId),
        orderNumber: payload.orderNumber,
        expiresAt: payload.expiresAt,
      });
    };

    socket.on(CustomerRealtimeEvent.REDEMPTION_HANDOVER_OTP_RELEASED, onRedemption);
    socket.on(CustomerRealtimeEvent.SHOP_PICKUP_CODE_RELEASED, onPickup);

    return () => {
      socket.off(CustomerRealtimeEvent.REDEMPTION_HANDOVER_OTP_RELEASED, onRedemption);
      socket.off(CustomerRealtimeEvent.SHOP_PICKUP_CODE_RELEASED, onPickup);
    };
  }, [identityReady, openSession]);

  // Deep link / notification query → open redemption drawer.
  useEffect(() => {
    if (!identityReady) return;
    const id = parseHandoverOtpFromUrl();
    if (!id) return;
    openSession({ kind: "REDEMPTION_OTP", redemptionId: id });
    clearHandoverOtpQuery();
  }, [identityReady, pathname, openSession]);

  const title = session?.kind === "SHOP_PICKUP" ? "Your pickup code" : "Your handover code";
  const subtitle =
    session?.kind === "SHOP_PICKUP"
      ? session.orderNumber
        ? `Order ${session.orderNumber} — show this to store staff.`
        : "Show this code at the store to collect your order."
      : "Show this code at the counter to complete redemption.";
  const expiryLabel = useMemo(() => formatExpiry(expiresAt), [expiresAt]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSession(null);
      setCode(null);
      setError(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[min(88vh,520px)] overflow-y-auto rounded-t-3xl px-5 pb-8 pt-6"
      >
        <SheetHeader className="text-left">
          <div className="mb-2 grid size-11 place-items-center rounded-xl customer-accent-tint-surface">
            {session?.kind === "SHOP_PICKUP" ? (
              <Store className="size-5 customer-gold-copy" />
            ) : (
              <KeyRound className="size-5 customer-gold-copy" />
            )}
          </div>
          <SheetTitle className="font-serif text-xl">{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 text-center">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#7a6f72]">
              <LoaderCircle className="size-4 animate-spin" />
              Loading code…
            </div>
          ) : error ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-amber-900">{error}</p>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => void loadCode()}>
                Try again
              </Button>
            </div>
          ) : code ? (
            <>
              <p className="font-mono text-3xl tracking-[0.4em] text-[#221a1d]">{code}</p>
              {expiryLabel ? (
                <p className="mt-3 text-xs text-amber-900">Valid until {expiryLabel}</p>
              ) : null}
              <p className="mt-4 text-xs text-[#7a6f72]">
                Do not share this code online. Only show it to staff at the store.
              </p>
            </>
          ) : (
            <p className="py-6 text-sm text-[#7a6f72]">Waiting for code…</p>
          )}
        </div>

        <div className="mt-6">
          <Button
            type="button"
            className="h-11 w-full rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
