"use client";

import { useMemo, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { ProfileSubpageHeader } from "@/src/features/customer/customer-profile-shared";
import {
  DeleteDeliveryAddressDialog,
  DeliveryAddressCardActions,
  DeliveryAddressFormFields,
  deliveryAddressToForm,
  emptyDeliveryAddressForm,
  formatDeliveryAddressDetail,
  type DeliveryAddressFormState,
} from "@/src/features/customer/customer-delivery-address-book";
import { ChoiceCard } from "@/src/features/customer/customer-shop-ui";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  useCreateShopAddressMutation,
  useDeleteShopAddressMutation,
  useGetShopAddressesQuery,
  useUpdateShopAddressMutation,
} from "@/src/store/api/customer-api";

export function CustomerProfileAddressesPage() {
  const { tenantSlug } = useCustomerTenant();
  const addresses = useGetShopAddressesQuery();
  const [createAddress, createState] = useCreateShopAddressMutation();
  const [updateAddress, updateState] = useUpdateShopAddressMutation();
  const [deleteAddress, deleteState] = useDeleteShopAddressMutation();

  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<DeliveryAddressFormState>(emptyDeliveryAddressForm);

  const items = useMemo(
    () => (addresses.data?.items as Record<string, unknown>[]) ?? [],
    [addresses.data?.items],
  );

  if (addresses.isLoading) return <PageSkeleton cards={2} />;
  if (addresses.isError) return <QueryError onRetry={addresses.refetch} />;

  function openCreate() {
    setEditingId(null);
    setForm(emptyDeliveryAddressForm());
    setShowForm(true);
  }

  function openEdit(row: Record<string, unknown>) {
    setEditingId(String(row.id));
    setForm(deliveryAddressToForm(row));
    setShowForm(true);
    setSelectedId(String(row.id));
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyDeliveryAddressForm());
  }

  async function onSave() {
    if (!form.line1.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      toast.error("Fill house/street, city, state and pincode.");
      return;
    }
    try {
      if (editingId) {
        const current = items.find((row) => String(row.id) === editingId);
        const updated = await updateAddress({
          addressId: editingId,
          ...form,
          ...(typeof current?.version === "number" ? { expectedVersion: Number(current.version) } : {}),
        }).unwrap();
        setSelectedId(String(updated.id ?? editingId));
        toast.success("Address updated");
      } else {
        const created = await createAddress({
          ...form,
          idempotencyKey: newIdempotencyKey(),
          isDefault: items.length === 0,
        }).unwrap();
        setSelectedId(String(created.id));
        toast.success("Address saved");
      }
      closeForm();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function onConfirmDelete() {
    if (!deleteId) return;
    try {
      await deleteAddress({ addressId: deleteId }).unwrap();
      if (selectedId === deleteId) setSelectedId("");
      if (editingId === deleteId) closeForm();
      setDeleteId(null);
      toast.success("Address removed");
    } catch (err) {
      toastApiError(err);
    }
  }

  const busy = createState.isLoading || updateState.isLoading;

  return (
    <div className="mx-auto max-w-lg pb-8">
      <ProfileSubpageHeader tenantSlug={tenantSlug} title="Saved addresses" />
      <p className="mt-1 text-sm text-[#777280]">
        Used for shop delivery and digital gold redemption. Edit or delete anytime.
      </p>

      <section className="customer-surface mt-5 space-y-3 p-4">
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-[#777280]">No saved addresses yet.</p>
        ) : (
          items.map((row) => (
            <ChoiceCard
              key={String(row.id)}
              name="profile-addresses"
              selected={selectedId === String(row.id) || (!selectedId && row.isDefault === true)}
              onSelect={() => setSelectedId(String(row.id))}
              icon={<MapPin className="size-5" />}
              title={
                <span className="flex items-center gap-2">
                  {String(row.label ?? "Address")}
                  {row.isDefault ? (
                    <span className="rounded-full bg-[#f3ebe7] px-2 py-0.5 text-[10px] font-semibold text-[#6d5f62]">
                      Default
                    </span>
                  ) : null}
                </span>
              }
              detail={formatDeliveryAddressDetail(row)}
              aside={
                <DeliveryAddressCardActions
                  onEdit={() => openEdit(row)}
                  onDelete={() => setDeleteId(String(row.id))}
                />
              }
            />
          ))
        )}

        {!showForm ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Add a new address
          </button>
        ) : (
          <DeliveryAddressFormFields
            form={form}
            setForm={setForm}
            idPrefix="profile-addr"
            showLabel
            busy={busy}
            submitLabel={editingId ? "Save changes" : "Save address"}
            onSubmit={() => void onSave()}
            onCancel={closeForm}
          />
        )}
      </section>

      <DeleteDeliveryAddressDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        busy={deleteState.isLoading}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  );
}
