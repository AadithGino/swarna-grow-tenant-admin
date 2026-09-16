"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, FileCheck2, FileImage, LockKeyhole, Pencil, ShieldCheck, Smartphone, Store, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CustomerKycSubmitForm } from "@/src/components/customer/customer-kyc-submit-form";
import { CustomerNomineeDialog } from "@/src/components/customer/customer-nominee-dialog";
import { CustomerPageHeader } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerKycEnabled } from "@/src/lib/customer-kyc-enabled";
import {
  useGetCustomerDevicesQuery,
  useGetCustomerPastSchemesQuery,
  useGetCustomerProfileQuery,
  useRevokeCustomerDeviceMutation,
  useSubmitCustomerKycMutation,
  useUpdateCustomerProfileMutation,
} from "@/src/store/api/customer-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CustomerPastScheme } from "@/src/types/customer";

function kycBadgeClass(status: string) {
  if (status === "VERIFIED") return "bg-emerald-50 text-emerald-700";
  if (status === "SUBMITTED" || status === "PENDING") return "bg-amber-50 text-amber-800";
  if (status === "REJECTED") return "bg-red-50 text-red-700";
  return "bg-muted text-muted-foreground";
}

function PastSchemeCompact({
  scheme,
  tenantSlug,
}: {
  scheme: CustomerPastScheme;
  tenantSlug: string | null;
}) {
  return (
    <Link
      href={customerPath(tenantSlug, "schemes", scheme.id)}
      className="flex items-center justify-between gap-3 rounded-xl border bg-[#fcf8f5] p-4 transition hover:border-[#dac17e]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{scheme.planName}</p>
        <p className="text-xs text-muted-foreground">
          {scheme.schemeNumber} · {scheme.closureType} ·{" "}
          {scheme.closedAt ? new Date(scheme.closedAt).toLocaleDateString("en-IN") : "—"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-black">{scheme.finalValue.amountDisplay}</p>
        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

export function CustomerProfilePage() {
  const { tenantSlug } = useCustomerTenant();
  const kycEnabled = useCustomerKycEnabled();
  const { data, isLoading, isError, refetch } = useGetCustomerProfileQuery();
  const pastQuery = useGetCustomerPastSchemesQuery(undefined, { skip: !data });
  const [editOpen, setEditOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [nomineeOpen, setNomineeOpen] = useState(false);
  const [update, updateState] = useUpdateCustomerProfileMutation();
  const [submitKyc, kycState] = useSubmitCustomerKycMutation();
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState(true);

  if (isLoading || !data) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const initials = data.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const kyc = kycEnabled ? data.kyc : undefined;
  const canSubmitKyc = Boolean(kyc?.canUpdate && kyc.status !== "VERIFIED");
  const kycSubmitted = kyc
    ? ["SUBMITTED", "PENDING", "VERIFIED", "REJECTED"].includes(kyc.status)
    : false;
  const pastSchemes = pastQuery.data ?? [];

  const openEdit = () => {
    setEmail(data.email ?? "");
    setAddress(typeof data.address === "string" ? data.address : "");
    setWhatsapp(data.whatsappOptIn);
    setEditOpen(true);
  };

  const save = async () => {
    try {
      await update({ email, address, whatsappOptIn: whatsapp }).unwrap();
      toast.success("Profile updated");
      setEditOpen(false);
    } catch {
      toast.error("Could not update profile");
    }
  };

  return (
    <div>
      <CustomerPageHeader
        title="Your profile"
        description={
          kycEnabled ? "Identity, verification, nominee and closed schemes." : "Your details, nominee and closed schemes."
        }
        action={
          <Button variant="outline" onClick={openEdit}>
            <Pencil />
            Edit profile
          </Button>
        }
      />
      <section className="overflow-hidden rounded-[1.5rem] border bg-white shadow-sm">
        <div className="bg-[#4b0a18] p-6 text-white sm:flex sm:items-center sm:gap-5">
          <span className="grid size-16 place-items-center rounded-full bg-[#f8e9c7] text-xl font-black text-[#730321]">
            {initials}
          </span>
          <div className="mt-4 sm:mt-0">
            <h1 className="text-2xl font-black">{data.name}</h1>
            <p className="mt-1 text-sm text-white/60">
              {data.customerNumber} · Member since{" "}
              {new Date(data.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </p>
          </div>
          {kyc ? (
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 sm:ml-auto sm:mt-0">
              <ShieldCheck className="size-4" />
              {kyc.statusLabel}
            </span>
          ) : null}
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Mobile", data.mobile],
            ["Email", data.email ?? "Not added"],
            ["Passbook", data.passbookNumber ?? "—"],
            [
              "Date of birth",
              data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString("en-IN") : "Not added",
            ],
            ["Primary branch", data.branch?.name ?? "—"],
            ["WhatsApp updates", data.whatsappOptIn ? "Enabled" : "Disabled"],
          ].map(([label, value]) => (
            <div key={label} className="bg-white p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-black">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[1.4rem] border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black">Past schemes</h2>
            <p className="mt-1 text-xs text-muted-foreground">Redeemed or closed early</p>
          </div>
          <Link href={customerPath(tenantSlug, "schemes")} className="text-xs font-bold text-[#730321]">
            All schemes
          </Link>
        </div>
        {pastQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : pastSchemes.length ? (
          <div className="mt-4 space-y-3">
            {pastSchemes.slice(0, 5).map((scheme) => (
              <PastSchemeCompact key={scheme.id} scheme={scheme} tenantSlug={tenantSlug} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No closed schemes yet.</p>
        )}
      </section>

      <div className={cn("mt-5 grid gap-4", kycEnabled && "lg:grid-cols-2")}>
        {kyc ? (
          <section className="rounded-[1.4rem] border bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <FileCheck2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-black">Identity verification</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {kyc.type ? `${kyc.type} · ` : ""}
                  {kyc.numberMasked ?? "No document number on file"}
                </p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase", kycBadgeClass(kyc.status))}>
                {kyc.statusLabel}
              </span>
            </div>
            {kyc.submittedAt ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Submitted {new Date(kyc.submittedAt).toLocaleString("en-IN")}
              </p>
            ) : null}
            {kyc.status === "REJECTED" && kyc.rejectionReason ? (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">{kyc.rejectionReason}</p>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {kyc.status === "VERIFIED"
                ? `Verified on ${kyc.verifiedAt ? new Date(kyc.verifiedAt).toLocaleDateString("en-IN") : "—"}. Contact your branch to update verified documents.`
                : kyc.status === "SUBMITTED" || kyc.status === "PENDING"
                  ? "Your documents are with the jeweller for review."
                  : kyc.status === "REJECTED"
                    ? "Please submit corrected documents."
                    : "Submit Aadhaar or PAN so your jeweller can verify your identity."}
            </p>
            {kycSubmitted && (kyc.documents?.length ?? 0) > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {kyc.documents!.map((doc) => (
                  <div
                    key={doc.uploadId}
                    className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border bg-muted/30 p-4 text-center"
                  >
                    <FileImage className="size-8 text-[#730321]" />
                    <span className="text-sm font-bold">{doc.label}</span>
                    {doc.fileName ? <span className="text-[10px] text-muted-foreground">{doc.fileName}</span> : null}
                    {doc.viewUrl ? (
                      <a href={doc.viewUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#730321] underline">
                        View document
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">On file</span>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            {canSubmitKyc ? (
              <Button onClick={() => setKycOpen(true)} className="mt-4 rounded-xl bg-[#730321]">
                {kycSubmitted ? "Update documents" : "Submit documents"}
              </Button>
            ) : null}
          </section>
        ) : null}
        <section className="rounded-[1.4rem] border bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#f7edef] text-[#730321]">
              <UserRound className="size-5" />
            </span>
            <div className="flex-1">
              <h2 className="font-black">Nominee</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.nominee?.relationshipLabel ?? data.nominee?.relationship ?? "Not set"}
              </p>
            </div>
            {data.nomineeEditable !== false ? (
              <Button variant="outline" size="sm" onClick={() => setNomineeOpen(true)}>
                {data.nominee ? "Update" : "Add"}
              </Button>
            ) : null}
          </div>
          {data.nominee ? (
            <>
              <p className="mt-4 font-black">{data.nominee.name}</p>
              {data.nominee.mobile ? <p className="text-sm text-muted-foreground">{data.nominee.mobile}</p> : null}
              {data.nominee.notes ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.nominee.notes}</p>
              ) : null}
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Add a nominee for your account.</p>
          )}
        </section>
      </div>
      <div className="mt-5 overflow-hidden rounded-[1.4rem] border bg-white shadow-sm">
        <Link href={customerPath(tenantSlug, "security")} className="flex items-center gap-3 p-5 hover:bg-[#fcf8f5]">
          <LockKeyhole className="size-5 text-[#730321]" />
          <span>
            <b className="text-sm">Security & devices</b>
            <small className="block text-muted-foreground">Review signed-in devices</small>
          </span>
          <ChevronRight className="ml-auto size-4" />
        </Link>
        <Link href={customerPath(tenantSlug, "branches")} className="flex items-center gap-3 border-t p-5 hover:bg-[#fcf8f5]">
          <Store className="size-5 text-[#730321]" />
          <span>
            <b className="text-sm">Branches & contact</b>
            <small className="block text-muted-foreground">Find your nearest branch</small>
          </span>
          <ChevronRight className="ml-auto size-4" />
        </Link>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Your registered mobile number cannot be changed here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-2" />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="text-sm font-bold">WhatsApp updates</p>
                <p className="text-xs text-muted-foreground">Payments and service notifications</p>
              </div>
              <Switch checked={whatsapp} onCheckedChange={setWhatsapp} />
            </div>
            <Button disabled={updateState.isLoading} onClick={save} className="w-full bg-[#730321]">
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {kycEnabled ? (
        <Dialog open={kycOpen} onOpenChange={setKycOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{kycSubmitted ? "Update documents" : "Submit documents"}</DialogTitle>
              <DialogDescription>Upload identity documents for your jeweller to verify.</DialogDescription>
            </DialogHeader>
            <CustomerKycSubmitForm
              submitting={kycState.isLoading}
              onSubmit={async (payload) => {
                await submitKyc(payload).unwrap();
                toast.success("Documents submitted");
                setKycOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}
      <CustomerNomineeDialog profile={data} open={nomineeOpen} onOpenChange={setNomineeOpen} />
    </div>
  );
}

export function CustomerSecurityPage() {
  const { data, isLoading, isError, refetch } = useGetCustomerDevicesQuery();
  const [revoke] = useRevokeCustomerDeviceMutation();
  if (isLoading || !data) return <PageSkeleton cards={2} />;
  if (isError) return <QueryError onRetry={refetch} />;
  return (
    <div>
      <CustomerPageHeader title="Security & devices" description="Review devices that can access your SwarnaGrow customer account." />
      <section className="rounded-[1.4rem] border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <ShieldCheck className="size-5 shrink-0" />
          <p>
            <b>Your account is protected with OTP sign-in.</b>
            <br />
            <span className="text-xs text-emerald-800/75">Revoking a device also removes its push token and refresh session.</span>
          </p>
        </div>
        <div className="mt-4 divide-y">
          {data.map((device) => (
            <div key={device.deviceId} className="flex items-center gap-3 py-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#f7edef] text-[#730321]">
                <Smartphone className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black">{device.deviceModel}</p>
                  {device.current ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">THIS DEVICE</span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {device.platform} · {device.lastUsedAt}
                </p>
              </div>
              {!device.current ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => revoke(device.deviceId).unwrap().then(() => toast.success("Device access revoked"))}
                >
                  Revoke
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
