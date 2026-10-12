"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useCreateShopAddressMutation,
  useCreateShopQuoteMutation,
  useGetShopAddressesQuery,
  useGetShopAvailabilityQuery,
  useGetShopCartQuery,
  useGetShopFulfilmentOptionsQuery,
} from "@/src/store/api/customer-api";
import { parseApiError, toastApiError } from "@/src/lib/api-error";
import { formatCheckoutNotReadyMessage } from "@/src/features/ecommerce/ecommerce-checkout-blockers";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopQuotePath } from "@/src/lib/customer-shop-paths";
import { CustomerShopPoliciesLinks } from "@/src/features/customer/customer-shop-policies";

type FulfilmentChoice = "BRANCH_PICKUP" | "DELIVERY";

export function CustomerShopCartPage() {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const availability = useGetShopAvailabilityQuery();
  const cart = useGetShopCartQuery(undefined, { skip: !availability.data?.available });
  const fulfilment = useGetShopFulfilmentOptionsQuery(undefined, {
    skip: !availability.data?.available,
  });
  const addresses = useGetShopAddressesQuery(undefined, { skip: !availability.data?.available });
  const [createQuote, createState] = useCreateShopQuoteMutation();
  const [createAddress, createAddressState] = useCreateShopAddressMutation();

  const [mode, setMode] = useState<FulfilmentChoice>("BRANCH_PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "COD">("ONLINE");
  const [pickupBranchId, setPickupBranchId] = useState("");
  const [addressId, setAddressId] = useState("");
  const [pincode, setPincode] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    line1: "",
    city: "",
    state: "Kerala",
    pincode: "",
    recipientName: "",
    mobile: "",
  });

  const pickup = fulfilment.data?.pickup as {
    enabled?: boolean;
    branches?: { id?: string; name?: string }[];
  };
  const delivery = fulfilment.data?.delivery as {
    enabled?: boolean;
    serviceablePincodes?: string[];
    supportedDestinationStates?: string[];
    deliveryChargePaise?: number | null;
    codEnabled?: boolean;
    codPincodes?: string[];
  };
  const supportedStates = delivery?.supportedDestinationStates ?? [];

  const addressItems = useMemo(
    () => (addresses.data?.items as Record<string, unknown>[]) ?? [],
    [addresses.data?.items],
  );

  if (availability.isLoading || cart.isLoading) return <PageSkeleton cards={2} />;
  if (!availability.data?.available) {
    return (
      <Surface title="Shop unavailable">
        <p className="p-6 text-sm text-muted-foreground">Store is not active.</p>
      </Surface>
    );
  }
  if (cart.isError) return <QueryError error={cart.error} onRetry={cart.refetch} />;

  const lines = (cart.data?.lines as Record<string, unknown>[]) ?? [];
  const pickupEnabled = pickup?.enabled === true && (pickup.branches?.length ?? 0) > 0;
  const deliveryEnabled = delivery?.enabled === true;

  async function onCreateQuote() {
    try {
      if (mode === "BRANCH_PICKUP") {
        const branchId = pickupBranchId || pickup?.branches?.[0]?.id;
        if (!pickupEnabled || !branchId) {
          toast.error("Select a pickup branch.");
          return;
        }
        const preview = await createQuote({
          fulfilmentMode: "BRANCH_PICKUP",
          pickupBranchId: String(branchId),
          idempotencyKey: newIdempotencyKey(),
        }).unwrap();
        router.push(customerShopQuotePath(tenantSlug, String(preview.id)));
        return;
      }
      if (!deliveryEnabled) {
        toast.error("Delivery is not available for this store.");
        return;
      }
      const chosenAddress = addressId || String(addressItems.find((a) => a.isDefault)?.id ?? "");
      if (!chosenAddress && !pincode.trim()) {
        toast.error("Select a saved address or enter a serviceable pincode.");
        return;
      }
      const selectedRow = addressItems.find((a) => String(a.id) === chosenAddress);
      const pinForCheck = chosenAddress
        ? String(selectedRow?.pincode ?? "").trim()
        : pincode.trim();
      const serviceable = delivery?.serviceablePincodes ?? [];
      if (
        serviceable.length > 0
        && pinForCheck
        && !serviceable.includes(pinForCheck)
      ) {
        toast.error(
          `Pincode ${pinForCheck} is not in this store's delivery area. Serviceable: ${serviceable.join(", ")}.`,
          { duration: 8000 },
        );
        return;
      }
      const stateForCheck = chosenAddress
        ? String(selectedRow?.state ?? "").trim()
        : addressForm.state.trim();
      if (supportedStates.length > 0 && stateForCheck) {
        const ok = supportedStates.some(
          (s) => s.trim().toLowerCase() === stateForCheck.toLowerCase(),
        );
        if (!ok) {
          toast.error(
            `Address state "${stateForCheck}" is not supported for checkout. Use: ${supportedStates.join(", ")}.`,
            { duration: 9000 },
          );
          return;
        }
      } else if (chosenAddress && !stateForCheck) {
        toast.error("Delivery address must include a valid state (e.g. Kerala).");
        return;
      }
      const codPincodes = delivery?.codPincodes ?? [];
      const codEligible =
        delivery?.codEnabled === true
        && pinForCheck
        && codPincodes.includes(pinForCheck);
      if (paymentMethod === "COD" && !codEligible) {
        toast.error(
          serviceable.includes(pinForCheck)
            ? "Delivery is available to this pincode, but cash on delivery is not."
            : "Cash on delivery requires a saved address in a COD pincode.",
          { duration: 8000 },
        );
        return;
      }
      const preview = await createQuote({
        fulfilmentMode: "DELIVERY",
        paymentMethod: paymentMethod === "COD" && codEligible ? "COD" : "ONLINE",
        ...(chosenAddress ? { addressId: chosenAddress } : {}),
        ...(!chosenAddress && pincode.trim() ? { pincode: pincode.trim() } : {}),
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      router.push(customerShopQuotePath(tenantSlug, String(preview.id)));
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.code === "CHECKOUT_NOT_READY") {
        toast.error(formatCheckoutNotReadyMessage(err, parsed), { duration: 8000 });
        return;
      }
      toastApiError(err);
    }
  }

  async function onSaveAddress() {
    try {
      const created = await createAddress({
        ...addressForm,
        idempotencyKey: newIdempotencyKey(),
        isDefault: addressItems.length === 0,
      }).unwrap();
      setAddressId(String(created.id));
      setShowAddressForm(false);
      toast.success("Address saved");
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title="Cart"
        description="Choose fulfilment validated by the server, then request a quote. Prices, tax, and delivery charges come from the server only."
        actions={
          <Link href={customerPath(tenantSlug, "shop")}>
            <Button type="button" variant="outline">
              Continue shopping
            </Button>
          </Link>
        }
      />
      {!lines.length ? (
        <Surface title="Your cart is empty">
          <p className="p-6 text-sm text-muted-foreground">Browse products to add items.</p>
        </Surface>
      ) : (
        <Surface title="Items">
          <ul className="divide-y p-4 text-sm">
            {lines.map((line) => {
              const product = line.product as { name?: string } | null;
              const avail = line.availability as {
                label?: string;
                availableQuantity?: number | null;
                stockPolicy?: string;
              } | null;
              return (
                <li key={String(line.productId)} className="flex justify-between gap-4 py-3">
                  <div>
                    <div className="font-medium">{product?.name ?? "Product"}</div>
                    <div className="text-muted-foreground">Qty {String(line.quantity)}</div>
                    {avail ? (
                      <div className="text-xs text-amber-900">{avail.label ?? avail.stockPolicy}</div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Surface>
      )}
      <Surface title="Fulfilment">
        <div className="space-y-4 p-6 text-sm">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "BRANCH_PICKUP" ? "default" : "outline"}
              disabled={!pickupEnabled}
              onClick={() => setMode("BRANCH_PICKUP")}
            >
              Branch pickup
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "DELIVERY" ? "default" : "outline"}
              disabled={!deliveryEnabled}
              onClick={() => setMode("DELIVERY")}
            >
              Delivery
            </Button>
          </div>
          {mode === "BRANCH_PICKUP" ? (
            pickupEnabled ? (
              <div className="space-y-2">
                <Label htmlFor="pickup-branch">Pickup branch</Label>
                <select
                  id="pickup-branch"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={pickupBranchId || String(pickup?.branches?.[0]?.id ?? "")}
                  onChange={(e) => setPickupBranchId(e.target.value)}
                >
                  {(pickup?.branches ?? []).map((b) => (
                    <option key={String(b.id)} value={String(b.id)}>
                      {b.name ?? b.id}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-muted-foreground">Pickup is not configured for this store.</p>
            )
          ) : deliveryEnabled ? (
            <div className="space-y-3">
              {addressItems.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="delivery-address">Saved address</Label>
                  <select
                    id="delivery-address"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={addressId || String(addressItems.find((a) => a.isDefault)?.id ?? "")}
                    onChange={(e) => setAddressId(e.target.value)}
                  >
                    {addressItems.map((a) => (
                      <option key={String(a.id)} value={String(a.id)}>
                        {String(a.label ?? "Address")} — {String(a.line1)}, {String(a.city)},{" "}
                        {String(a.state)} {String(a.pincode)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-muted-foreground">Add a delivery address or enter a serviceable pincode.</p>
              )}
              {!addressItems.length ? (
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode (server checks serviceability)</Label>
                  <Input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                </div>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAddressForm((v) => !v)}>
                {showAddressForm ? "Hide address form" : "Add new address"}
              </Button>
              {showAddressForm ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Line 1"
                    value={addressForm.line1}
                    onChange={(e) => setAddressForm((f) => ({ ...f, line1: e.target.value }))}
                  />
                  <Input
                    placeholder="City"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                  />
                  <Input
                    placeholder="State"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))}
                  />
                  <Input
                    placeholder="Pincode"
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm((f) => ({ ...f, pincode: e.target.value }))}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={createAddressState.isLoading}
                    onClick={() => void onSaveAddress()}
                  >
                    Save address
                  </Button>
                </div>
              ) : null}
              {delivery?.serviceablePincodes?.length ? (
                <p className="text-xs text-muted-foreground">
                  Delivery charge (if applicable): ₹
                  {((delivery.deliveryChargePaise ?? 0) / 100).toFixed(2)} — set by the jeweller
                </p>
              ) : null}
              {supportedStates.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Delivery address <strong>state</strong> must be: {supportedStates.join(", ")} (for
                  checkout tax).
                </p>
              ) : null}
              <div className="space-y-2 border-t pt-3">
                <Label>Payment when ordering</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={paymentMethod === "ONLINE" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("ONLINE")}
                  >
                    Pay online
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={paymentMethod === "COD" ? "default" : "outline"}
                    disabled={delivery?.codEnabled !== true}
                    onClick={() => setPaymentMethod("COD")}
                  >
                    Cash on delivery
                  </Button>
                </div>
                {delivery?.codEnabled !== true ? (
                  <p className="text-xs text-muted-foreground">COD is not enabled for this store.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    COD pincodes are a subset of delivery coverage. Delivery can work where COD does not.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Delivery is not available until the store configures it.</p>
          )}
          <Button
            type="button"
            variant="default"
            disabled={!lines.length || createState.isLoading}
            onClick={() => void onCreateQuote()}
          >
            Continue to server quote
          </Button>
          <CustomerShopPoliciesLinks className="mt-6 border-t pt-4" />
        </div>
      </Surface>
    </>
  );
}
