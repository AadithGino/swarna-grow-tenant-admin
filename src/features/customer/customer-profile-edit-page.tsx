"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import {
  ProfileSubpageHeader,
  profileFormFieldClass,
  profileFormLabelClass,
} from "@/src/features/customer/customer-profile-shared";
import { toastApiError } from "@/src/lib/api-error";
import { formatCustomerAddressDisplay } from "@/src/lib/customer-address-display";
import { customerPath } from "@/src/lib/customer-tenant";
import {
  useGetCustomerProfileQuery,
  useUpdateCustomerProfileMutation,
} from "@/src/store/api/customer-api";
import { useRouter } from "next/navigation";

export function CustomerProfileEditPage() {
  const { tenantSlug } = useCustomerTenant();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useGetCustomerProfileQuery();
  const [updateProfile, updateState] = useUpdateCustomerProfileMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setEmail(data.email ?? "");
    setAddress(formatCustomerAddressDisplay(data.address));
  }, [data]);

  if (isLoading || !data) return <PageSkeleton cards={2} />;
  if (isError) return <QueryError onRetry={refetch} />;

  async function onSave() {
    if (name.trim().length < 2) {
      toast.error("Enter your full name");
      return;
    }
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        address: address.trim(),
      }).unwrap();
      toast.success("Profile updated");
      router.push(customerPath(tenantSlug, "profile"));
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <div className="mx-auto max-w-lg pb-8">
      <ProfileSubpageHeader tenantSlug={tenantSlug} title="Personal details" />
      <p className="mt-1 text-sm text-[#777280]">Update the name, email and address on your jeweller account.</p>

      <section className="customer-surface mt-5 space-y-4 p-5">
        <div>
          <Label htmlFor="profile-edit-name" className={profileFormLabelClass}>
            Full name
          </Label>
          <Input
            id="profile-edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`mt-2 ${profileFormFieldClass}`}
          />
        </div>
        <div>
          <Label htmlFor="profile-edit-email" className={profileFormLabelClass}>
            Email
          </Label>
          <Input
            id="profile-edit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mt-2 ${profileFormFieldClass}`}
          />
        </div>
        <div>
          <Label htmlFor="profile-edit-address" className={profileFormLabelClass}>
            Address
          </Label>
          <Input
            id="profile-edit-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`mt-2 ${profileFormFieldClass}`}
            placeholder="House, street, city, pincode"
          />
        </div>
        <p className="text-xs text-[#8a8490]">Mobile number cannot be changed from the app.</p>
        <Button
          type="button"
          disabled={updateState.isLoading}
          onClick={() => void onSave()}
          className="h-12 w-full rounded-xl font-bold text-white"
          style={{ background: "var(--customer-primary, #730321)" }}
        >
          {updateState.isLoading ? <LoaderCircle className="size-4 animate-spin" /> : "Save changes"}
        </Button>
      </section>
    </div>
  );
}
