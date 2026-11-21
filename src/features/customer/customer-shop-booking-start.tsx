"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { apiErrorCode, parseApiError, toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import { customerShopBookingPath } from "@/src/lib/customer-shop-paths";
import {
  bookingQuoteSignature,
  bookingRequestBody,
  clearPendingBooking,
  formatWindow,
  isDefinitiveBookingFailure,
  loadPendingBooking,
  rateProtectionCopy,
  savePendingBooking,
  selectBookableBranch,
  type BookableBranch,
  type BookingQuote,
  type PendingBooking,
} from "@/src/lib/customer-shop-booking";
import { formatShopInr, SHOP_MUTED } from "@/src/features/customer/customer-shop-ui";
import {
  useCreateShopBookingMutation,
  useGetCustomerProfileQuery,
  useListShopBookingAvailabilityQuery,
} from "@/src/store/api/customer-api";
import { cn } from "@/lib/utils";

type Preview = {
  policyVersionId: string;
  estimateTotalPaise: number;
  ratePerGramPaise?: number | null;
  advanceRequiredPaise: number;
  advanceWindowMinutes: number;
  balanceWindowHours: number;
  rateRule: string;
  rateProtectionHours?: number;
  cancellationFeeBps: number;
  termsText: string;
  heldByOthers: boolean;
};

/**
 * "Book with advance" on a product page. It shows only when the store offers branch pickup and a
 * booking policy applies to this piece; a piece the store does not take bookings for shows nothing.
 */
export function BookWithAdvance({ productId, className }: { productId: string; className?: string }) {
  const router = useRouter();
  const { tenantSlug: tenantSlugRaw } = useCustomerTenant();
  const tenantSlug = tenantSlugRaw ?? "";
  const availability = useListShopBookingAvailabilityQuery({ productId });
  const profile = useGetCustomerProfileQuery();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState("");
  const [agreedSig, setAgreedSig] = useState("");
  const [notice, setNotice] = useState("");
  const settling = useRef(false);
  const [createBooking, createState] = useCreateShopBookingMutation();
  // Saved requests are scoped to the signed-in customer, so nothing is saved or replayed until that is known.
  const customerId = (profile.data as { id?: string } | undefined)?.id ?? "";
  const scope = { tenantSlug, customerId, productId };

  // Only branches that can actually take this booking come back, each with its own terms.
  const bookable = useMemo(
    () => (((availability.data as { branches?: BookableBranch<Preview>[] } | undefined)?.branches) ?? []).filter((b) => b.id),
    [availability.data],
  );
  const profileBranch = (profile.data as { branch?: { id?: string } } | undefined)?.branch?.id;
  const selected = selectBookableBranch(bookable, chosen, profileBranch);
  const branchId = selected?.id ?? "";
  const p = selected?.preview;
  // Agreement belongs to exactly this quote: if the amount, terms or branch change, it is withdrawn.
  const quote: BookingQuote | null = p
    ? {
        productId,
        pickupBranchId: branchId,
        policyVersionId: p.policyVersionId,
        advanceRequiredPaise: p.advanceRequiredPaise,
        estimateTotalPaise: p.estimateTotalPaise,
        ratePerGramPaise: p.ratePerGramPaise ?? null,
      }
    : null;
  const signature = quote ? bookingQuoteSignature(quote) : "";
  const agreed = Boolean(signature) && agreedSig === signature;

  const store = typeof window === "undefined" ? null : window.localStorage;

  /**
   * Send a request whose outcome is not known yet, with its original key. The server answers with the
   * booking it already made or says why none was made, so this never creates a second booking.
   * Returns "booked", "refused" (nothing was made) or "unknown" (could not reach the server).
   */
  async function settle(pending: PendingBooking): Promise<"booked" | "refused" | "unknown"> {
    try {
      const booking = await createBooking({ ...pending.body, idempotencyKey: pending.key }).unwrap();
      clearPendingBooking(store, scope);
      setOpen(false);
      toast.success("Booked. Pay the advance to hold this piece.");
      router.push(customerShopBookingPath(tenantSlug, String(booking.id)));
      return "booked";
    } catch (err) {
      const parsed = parseApiError(err);
      // Still being processed, a lost response, a timeout or a 5xx: the first request may yet finish,
      // so the key stays saved and the next attempt reuses it.
      if (!isDefinitiveBookingFailure(parsed.httpStatus, parsed.code)) return "unknown";
      clearPendingBooking(store, scope);
      const code = apiErrorCode(err);
      if (code === "BOOKING_QUOTE_CHANGED" || code === "BOOKING_POLICY_CHANGED") {
        // Nothing was held. Show the refreshed quote and ask again.
        setAgreedSig("");
        setNotice("The gold rate, price or terms changed while you were deciding. Please review the updated quote below and confirm again.");
        void availability.refetch();
      } else {
        toastApiError(err);
      }
      return "refused";
    }
  }

  // After a refresh, finish what was in flight first: the same request is replayed with its own key.
  useEffect(() => {
    if (!customerId || settling.current) return;
    const pending = loadPendingBooking(store, scope);
    if (!pending) return;
    settling.current = true;
    void settle(pending).finally(() => { settling.current = false; });
  }, [tenantSlug, productId, customerId]);

  // Nothing to offer: booking is off, payment is unavailable, or no branch can take this piece.
  if (!bookable.length) return null;

  async function onConfirm() {
    if (!quote || !agreed || !customerId) return;
    // A request still in flight from before (lost response, refresh) is settled first with its own
    // key. Only when nothing is pending does a new submission get a new key.
    const earlier = loadPendingBooking(store, scope);
    if (earlier) {
      const outcome = await settle(earlier);
      if (outcome === "unknown") toast.error("We are still checking your earlier booking. Please try again in a moment.");
      return;
    }
    const pending: PendingBooking = { key: newIdempotencyKey(), at: Date.now(), signature, body: bookingRequestBody(quote) };
    savePendingBooking(store, scope, pending);
    const outcome = await settle(pending);
    // The request was sent; if the answer was lost the pending entry stays and a retry reuses it.
    if (outcome === "unknown") toast.error("We could not confirm your booking. Tap again to retry; you will not be booked twice.");
  }

  const canConfirm = Boolean(p) && Boolean(customerId) && agreed && !p?.heldByOthers && !createState.isLoading;

  return (
    <>
      <div className={cn("rounded-2xl border border-[var(--ck-line,#ebe2d7)] bg-[var(--ck-gold-soft,#f6eedf)]/40 p-3.5", className)}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#8a6a24]">
            <CalendarCheck className="size-[1.1rem]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.88rem] font-semibold text-[var(--ck-ink,#1d1417)]">Book with a small advance</span>
            <span className="block text-xs text-[var(--ck-muted,#87787c)]">
              {p ? `Pay ${formatShopInr(p.advanceRequiredPaise)} now, the rest before you collect it from the branch.` : ""}
            </span>
          </span>
          <Button type="button" variant="outline" className="h-10 shrink-0 rounded-full" disabled={!p} onClick={() => { setNotice(""); setOpen(true); }}>
            Book
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(next) => !createState.isLoading && setOpen(next)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book with advance</DialogTitle>
            <DialogDescription>We hold this piece for you once the advance is paid. Pickup is from the branch.</DialogDescription>
          </DialogHeader>

          {bookable.length > 1 ? (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-semibold text-[#221a1d]">Pickup branch</legend>
              {bookable.map((b) => (
                <label key={b.id} className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm", branchId === b.id ? "border-[var(--customer-primary,#730321)] bg-[#fdf6f4]" : "border-[#ecdfd8]")}>
                  <input type="radio" name="booking-branch" checked={branchId === b.id} onChange={() => { setChosen(String(b.id)); setNotice(""); }} />
                  {b.name}
                </label>
              ))}
            </fieldset>
          ) : null}

          {notice ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">{notice}</p> : null}

          {p ? (
            <div className="space-y-3 text-sm">
              <div className="overflow-hidden rounded-2xl border border-[#ecdfd8]">
                <div className="flex items-end justify-between gap-3 bg-[#fdf6f4] px-4 py-3">
                  <div>
                    <p className={cn("text-xs", SHOP_MUTED)}>Pay now to reserve</p>
                    <p className="text-2xl font-extrabold tracking-tight text-[var(--customer-primary,#730321)]">{formatShopInr(p.advanceRequiredPaise)}</p>
                  </div>
                  <p className={cn("pb-1 text-right text-xs", SHOP_MUTED)}>within {formatWindow(p.advanceWindowMinutes)}</p>
                </div>
                <dl className="space-y-1.5 px-4 py-3">
                  <div className="flex justify-between"><dt className={SHOP_MUTED}>Estimated price today</dt><dd className="font-semibold">{formatShopInr(p.estimateTotalPaise)}</dd></div>
                  {p.ratePerGramPaise ? <div className="flex justify-between"><dt className={SHOP_MUTED}>Gold rate used</dt><dd className="font-semibold">{formatShopInr(p.ratePerGramPaise)} / g</dd></div> : null}
                  <div className="flex justify-between"><dt className={SHOP_MUTED}>Balance at the branch (est.)</dt><dd className="font-semibold">{formatShopInr(Math.max(0, p.estimateTotalPaise - p.advanceRequiredPaise))}</dd></div>
                </dl>
              </div>
              <ol className="space-y-2.5 border-l-2 border-[#ecdfd8] pl-4">
                <li className="relative"><span className="absolute -left-[1.4rem] top-1 size-2.5 rounded-full bg-[var(--customer-primary,#730321)]" /><p className="font-semibold text-[#221a1d]">Pay the advance</p><p className={cn("text-xs", SHOP_MUTED)}>Within {formatWindow(p.advanceWindowMinutes)}, or the booking is released.</p></li>
                <li className="relative"><span className="absolute -left-[1.4rem] top-1 size-2.5 rounded-full bg-[#d9c7bf]" /><p className="font-semibold text-[#221a1d]">Store bills your piece</p><p className={cn("text-xs", SHOP_MUTED)}>You get a message to pay the balance within {formatWindow(Number(p.balanceWindowHours) * 60)} of your advance.</p></li>
                <li className="relative"><span className="absolute -left-[1.4rem] top-1 size-2.5 rounded-full bg-[#d9c7bf]" /><p className="font-semibold text-[#221a1d]">Collect from the branch</p></li>
              </ol>
              <div className={cn("space-y-1 rounded-xl bg-[#faf6f2] px-3 py-2.5 text-xs leading-5", SHOP_MUTED)}>
                <p>{rateProtectionCopy({ rateRule: p.rateRule, rateProtectionHours: p.rateProtectionHours, balanceWindowHours: p.balanceWindowHours })}</p>
                <p>{p.cancellationFeeBps > 0 ? `If you cancel, ${(p.cancellationFeeBps / 100).toLocaleString("en-IN")}% of the advance is kept and the rest is refunded.` : "If you cancel, the advance is refunded."}</p>
              </div>
              {p.termsText ? (
                <div className="max-h-24 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#ecdfd8] p-3 text-xs leading-5 text-[#5b4f53]">{p.termsText}</div>
              ) : null}
              {p.heldByOthers ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">Another customer is holding this piece right now. Check back soon.</p>
              ) : (
                <label className="flex items-start gap-2.5">
                  <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreedSig(e.target.checked ? signature : "")} />
                  <span>I have read and accept these booking terms.</span>
                </label>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={createState.isLoading} onClick={() => setOpen(false)}>Not now</Button>
            <Button type="button" className="text-white" style={customerBrandStyle.primaryBg} disabled={!canConfirm} onClick={() => void onConfirm()}>
              {createState.isLoading ? "Booking…" : "Book and continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
