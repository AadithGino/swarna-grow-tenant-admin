"use client";

import { useRef, useState, type ReactNode } from "react";
import { CalendarDays, Check, Info, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { profileFormLabelClass } from "@/src/features/customer/customer-profile-shared";
import { CUSTOMER_MOBILE_NAV_DOCK } from "@/src/features/customer/customer-scheme-detail-views";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { normalizeCustomerMobileInput } from "@/src/lib/customer-form";
import {
  nomineeFormFieldsFromDetail,
  nomineeFormReadyForSubmit,
  validateNomineeForm,
  type NomineeFormFields,
} from "@/src/lib/nominee-form";
import type { NomineeRelationship } from "@/src/types/domain";
import {
  useGetCustomerProfileQuery,
  useUpdateCustomerNomineeMutation,
} from "@/src/store/api/customer-api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RELATIONSHIP_OPTIONS: { key: string; api: NomineeRelationship; label: string }[] = [
  { key: "SPOUSE", api: "SPOUSE", label: "Spouse" },
  { key: "MOTHER", api: "PARENT", label: "Mother" },
  { key: "FATHER", api: "PARENT", label: "Father" },
  { key: "CHILD", api: "CHILD", label: "Child" },
  { key: "SIBLING", api: "SIBLING", label: "Sibling" },
  { key: "RELATIVE", api: "RELATIVE", label: "Relative" },
  { key: "FRIEND", api: "FRIEND", label: "Friend" },
  { key: "OTHER", api: "OTHER", label: "Other" },
];

const nomineePlainInputClass =
  "m-0 h-7 w-full min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[1.02rem] font-bold leading-snug text-[#171722] shadow-none outline-none ring-0 placeholder:font-medium placeholder:text-[#a39eaa] focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

const nomineeSelectTriggerClass =
  "!h-7 !w-full min-w-0 flex-1 justify-between gap-2 !rounded-none !border-0 !bg-transparent px-0 py-0 text-[1.02rem] font-bold text-[#171722] !shadow-none !outline-none !ring-0 focus:!ring-0 focus-visible:!border-0 focus-visible:!ring-0 data-[size=default]:!h-7 [&>svg]:size-4 [&>svg]:text-[#8a8490]";

const nomineeValueTrackClass =
  "mt-1.5 flex h-11 w-full items-center rounded-full bg-[#f2eee8] px-4";

function NomineePlainInput({ className, ...props }: React.ComponentProps<"input">) {
  return <input {...props} className={cn(nomineePlainInputClass, className)} />;
}

function NomineeValueTrack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(nomineeValueTrackClass, className)}>{children}</div>;
}

function NomineeFieldCard({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ebe4dc] bg-white px-4 py-3.5">
      <p className={profileFormLabelClass}>{label}</p>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function parseNomineeNotes(notes?: string | null) {
  const raw = notes ?? "";
  const dobMatch = raw.match(/DOB:(\d{4}-\d{2}-\d{2})/);
  const dob = dobMatch?.[1] ?? "";
  const addressSame = /ADDRESS_SAME_AS_CUSTOMER/.test(raw);
  const cleanedNotes = raw
    .replace(/DOB:\d{4}-\d{2}-\d{2}\s*/g, "")
    .replace(/ADDRESS_SAME_AS_CUSTOMER\s*/g, "")
    .trim();
  return { dob, addressSame, cleanedNotes };
}

function buildNomineeNotes(dob: string, addressSame: boolean, extraNotes: string) {
  const parts: string[] = [];
  if (dob) parts.push(`DOB:${dob}`);
  if (addressSame) parts.push("ADDRESS_SAME_AS_CUSTOMER");
  if (extraNotes.trim()) parts.push(extraNotes.trim());
  return parts.join("\n") || undefined;
}

function relationshipKeyFromProfile(relationship: string, label?: string) {
  const normalized = (label ?? relationship).toLowerCase();
  if (normalized.includes("mother")) return "MOTHER";
  if (normalized.includes("father")) return "FATHER";
  const direct = RELATIONSHIP_OPTIONS.find((o) => o.api === relationship && o.key === relationship);
  if (direct) return direct.key;
  const byApi = RELATIONSHIP_OPTIONS.find((o) => o.api === relationship);
  return byApi?.key ?? "OTHER";
}

function isoToDobDisplay(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

function dobDisplayToIso(display: string) {
  const trimmed = display.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  const dd = match[1].padStart(2, "0");
  const mm = match[2].padStart(2, "0");
  const yyyy = match[3];
  const iso = `${yyyy}-${mm}-${dd}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return iso;
}

export function CustomerProfileNomineePage() {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { tenantSlug } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerProfileQuery();
  const [updateNominee, updateState] = useUpdateCustomerNomineeMutation();
  const [form, setForm] = useState<NomineeFormFields | null>(null);
  const [relationshipKey, setRelationshipKey] = useState("MOTHER");
  const [dob, setDob] = useState("");
  const [dobDisplay, setDobDisplay] = useState("");
  const [addressSame, setAddressSame] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const profileSeed = data
    ? `${data.nominee?.name ?? ""}|${data.nominee?.relationship ?? ""}|${data.nominee?.notes ?? ""}|${data.nomineeEditable}`
    : "";
  const [appliedProfileSeed, setAppliedProfileSeed] = useState("");
  if (data && appliedProfileSeed !== profileSeed) {
    const detail = data.nominee
      ? {
          name: data.nominee.name,
          relationship: data.nominee.relationship as NomineeRelationship,
          mobile: data.nominee.mobile ?? "",
          notes: data.nominee.notes ?? undefined,
        }
      : null;
    const notesParsed = parseNomineeNotes(data.nominee?.notes);
    setAppliedProfileSeed(profileSeed);
    setForm(nomineeFormFieldsFromDetail(detail));
    setRelationshipKey(
      data.nominee
        ? relationshipKeyFromProfile(data.nominee.relationship, data.nominee.relationshipLabel)
        : "MOTHER",
    );
    setDob(notesParsed.dob);
    setDobDisplay(isoToDobDisplay(notesParsed.dob));
    setAddressSame(notesParsed.addressSame || !data.nominee);
  }

  if (isLoading || !data || !form) return <PageSkeleton cards={2} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const editable = data.nomineeEditable !== false;
  const ready = nomineeFormReadyForSubmit(form);
  const apiRelationship =
    RELATIONSHIP_OPTIONS.find((o) => o.key === relationshipKey)?.api ?? form.relationship;

  const setField = (key: keyof NomineeFormFields, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onDobDisplayChange = (value: string) => {
    setDobDisplay(value);
    const iso = dobDisplayToIso(value);
    if (iso) setDob(iso);
    else if (!value.trim()) setDob("");
  };

  const onNativeDateChange = (iso: string) => {
    setDob(iso);
    setDobDisplay(isoToDobDisplay(iso));
  };

  const save = async () => {
    if (!editable || !data.version) return;
    const payload = { ...form, relationship: apiRelationship };
    const clientErrors = validateNomineeForm(payload);
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      toast.error("Fix the highlighted fields.");
      return;
    }
    try {
      await updateNominee({
        expectedVersion: data.version,
        name: form.name.trim(),
        relationship: apiRelationship,
        mobile: normalizeCustomerMobileInput(form.mobile),
        notes: buildNomineeNotes(dob, addressSame, parseNomineeNotes(form.notes).cleanedNotes),
      }).unwrap();
      toast.success("Nominee saved");
      router.replace(customerPath(tenantSlug, "profile"));
    } catch {
      toast.error("Could not save nominee");
    }
  };

  return (
    <div
      className="mx-auto max-w-lg"
      style={{ paddingBottom: `calc(${CUSTOMER_MOBILE_NAV_DOCK} + 1.25rem + env(safe-area-inset-bottom, 0px))` }}
    >
      <h2 className="text-[1.55rem] font-black leading-tight tracking-[-.03em] text-[#11111b]">
        Add someone you trust
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#777280]">
        Your nominee will be eligible to receive the benefits in the event of your demise.
      </p>

      <div className="mt-6 space-y-3">
        <NomineeFieldCard label="Full name" error={fieldErrors.name}>
          <NomineeValueTrack>
            <NomineePlainInput
              id="nominee-name"
              value={form.name}
              disabled={!editable}
              onChange={(e) => setField("name", e.target.value)}
              className={fieldErrors.name ? "text-red-700" : undefined}
            />
          </NomineeValueTrack>
        </NomineeFieldCard>

        <NomineeFieldCard label="Relationship">
          <NomineeValueTrack>
            <div className="min-w-0 flex-1">
              <Select value={relationshipKey} disabled={!editable} onValueChange={setRelationshipKey}>
                <SelectTrigger id="nominee-relationship" className={nomineeSelectTriggerClass}>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </NomineeValueTrack>
        </NomineeFieldCard>

        <NomineeFieldCard label="Date of birth">
          <NomineeValueTrack>
            <NomineePlainInput
              id="nominee-dob"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              value={dobDisplay}
              disabled={!editable}
              onChange={(e) => onDobDisplayChange(e.target.value)}
              className="pr-2"
            />
            <input
              ref={dateInputRef}
              type="date"
              value={dob}
              disabled={!editable}
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => onNativeDateChange(e.target.value)}
            />
            <button
              type="button"
              disabled={!editable}
              onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
              className="grid size-8 shrink-0 place-items-center text-[#8a8490]"
              aria-label="Pick date"
            >
              <CalendarDays className="size-4" strokeWidth={2} />
            </button>
          </NomineeValueTrack>
        </NomineeFieldCard>

        <NomineeFieldCard label="Mobile" error={fieldErrors.mobile}>
          <NomineeValueTrack>
            <NomineePlainInput
              id="nominee-mobile"
              inputMode="tel"
              value={form.mobile}
              disabled={!editable}
              onChange={(e) => setField("mobile", e.target.value)}
              className={fieldErrors.mobile ? "text-red-700" : undefined}
            />
          </NomineeValueTrack>
        </NomineeFieldCard>
      </div>

      <label className="mt-5 flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={addressSame}
          disabled={!editable}
          onChange={(e) => setAddressSame(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-[5px] border-2 transition",
            addressSame
              ? "border-[var(--customer-primary,#730321)] bg-[var(--customer-primary,#730321)] text-white"
              : "border-[#d4ccc4] bg-white",
          )}
        >
          {addressSame ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
        <span className="text-sm font-semibold text-[#171722]">Nominee address is same as mine</span>
      </label>

      <div className="mt-4 flex gap-3 rounded-[1.15rem] bg-[#fff4df] px-4 py-3.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[rgba(var(--customer-primary-rgb,115,3,33),0.2)] bg-white/70 text-[var(--customer-primary,#730321)]">
          <Info className="size-3.5" strokeWidth={2.5} />
        </span>
        <p className="text-xs leading-relaxed text-[#7a6a52]">
          You can update nominee details anytime before maturity.
        </p>
      </div>

      {editable ? (
        <Button
          disabled={!ready || updateState.isLoading}
          onClick={save}
          className="mt-6 h-12 w-full rounded-full text-base font-black text-white disabled:opacity-45"
          style={{ background: "var(--customer-primary, #730321)" }}
        >
          {updateState.isLoading ? <LoaderCircle className="animate-spin" /> : "Save nominee"}
        </Button>
      ) : null}
    </div>
  );
}
