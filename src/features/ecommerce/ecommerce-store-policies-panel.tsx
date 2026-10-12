"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/src/components/common/page-parts";

export type StorePoliciesForm = {
  shippingPolicyText: string;
  shippingApproved: boolean;
  returnsPolicyText: string;
  returnsApproved: boolean;
  cancellationPolicyText: string;
  cancellationApproved: boolean;
  refundContactPolicyText: string;
  refundContactApproved: boolean;
  returnEligibilityDays: string;
  returnExcludedCategoryIds: string;
};

const POLICY_MIN = 40;

export function storePoliciesFormFromApi(raw?: Record<string, unknown> | null): StorePoliciesForm {
  const p = (raw?.storePolicies as Record<string, unknown> | undefined) ?? {};
  return {
    shippingPolicyText: String(p.shippingPolicyText ?? ""),
    shippingApproved: Boolean(p.shippingPolicyApprovedAt),
    returnsPolicyText: String(p.returnsPolicyText ?? ""),
    returnsApproved: Boolean(p.returnsPolicyApprovedAt),
    cancellationPolicyText: String(p.cancellationPolicyText ?? ""),
    cancellationApproved: Boolean(p.cancellationPolicyApprovedAt),
    refundContactPolicyText: String(p.refundContactPolicyText ?? ""),
    refundContactApproved: Boolean(p.refundContactPolicyApprovedAt),
    returnEligibilityDays: p.returnEligibilityDays != null ? String(p.returnEligibilityDays) : "7",
    returnExcludedCategoryIds: ((p.returnExcludedCategoryIds as string[]) ?? []).join("\n"),
  };
}

export function storePoliciesPayload(form: StorePoliciesForm, current?: Record<string, unknown> | null) {
  const prev = (current?.storePolicies as Record<string, unknown> | undefined) ?? {};
  const now = new Date().toISOString();
  const days = Number.parseInt(form.returnEligibilityDays, 10);
  return {
    version: Number(prev.version ?? 0) + 1,
    publishedAt: now,
    shippingPolicyText: form.shippingPolicyText.trim(),
    shippingPolicyApprovedAt: form.shippingApproved ? now : undefined,
    returnsPolicyText: form.returnsPolicyText.trim(),
    returnsPolicyApprovedAt: form.returnsApproved ? now : undefined,
    cancellationPolicyText: form.cancellationPolicyText.trim(),
    cancellationPolicyApprovedAt: form.cancellationApproved ? now : undefined,
    refundContactPolicyText: form.refundContactPolicyText.trim(),
    refundContactPolicyApprovedAt: form.refundContactApproved ? now : undefined,
    returnEligibilityDays: Number.isFinite(days) ? days : 0,
    returnExcludedCategoryIds: form.returnExcludedCategoryIds
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export function storePolicyFieldIssues(form: StorePoliciesForm): string[] {
  const issues: string[] = [];
  const blocks: { label: string; text: string; approved: boolean }[] = [
    { label: "Shipping", text: form.shippingPolicyText, approved: form.shippingApproved },
    { label: "Returns", text: form.returnsPolicyText, approved: form.returnsApproved },
    { label: "Cancellation", text: form.cancellationPolicyText, approved: form.cancellationApproved },
    { label: "Refund contact", text: form.refundContactPolicyText, approved: form.refundContactApproved },
  ];
  for (const b of blocks) {
    if (b.text.trim().length > 0 && b.text.trim().length < POLICY_MIN) {
      issues.push(`${b.label} policy needs at least ${POLICY_MIN} characters or leave blank until ready.`);
    }
    if (b.approved && b.text.trim().length < POLICY_MIN) {
      issues.push(`${b.label} cannot be approved until the text meets the minimum length.`);
    }
  }
  return issues;
}

type Props = {
  form: StorePoliciesForm;
  disabled?: boolean;
  onChange: (next: StorePoliciesForm) => void;
};

export function EcommerceStorePoliciesPanel({ form, disabled, onChange }: Props) {
  function patch(partial: Partial<StorePoliciesForm>) {
    onChange({ ...form, ...partial });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/80 p-4">
      <div>
        <h3 className="font-semibold">Store policies (customer disclosure)</h3>
        <p className="mt-1 text-muted-foreground">
          Enter your own wording. Checkout stays blocked until all four policies are approved. This does not
          replace legal review.
        </p>
      </div>
      <PolicyBlock
        title="Shipping"
        text={form.shippingPolicyText}
        approved={form.shippingApproved}
        disabled={disabled}
        onText={(shippingPolicyText) => patch({ shippingPolicyText })}
        onApproved={(shippingApproved) => patch({ shippingApproved })}
      />
      <PolicyBlock
        title="Returns & exchanges"
        text={form.returnsPolicyText}
        approved={form.returnsApproved}
        disabled={disabled}
        onText={(returnsPolicyText) => patch({ returnsPolicyText })}
        onApproved={(returnsApproved) => patch({ returnsApproved })}
      />
      <PolicyBlock
        title="Cancellations"
        text={form.cancellationPolicyText}
        approved={form.cancellationApproved}
        disabled={disabled}
        onText={(cancellationPolicyText) => patch({ cancellationPolicyText })}
        onApproved={(cancellationApproved) => patch({ cancellationApproved })}
      />
      <PolicyBlock
        title="Refund timing & contact"
        text={form.refundContactPolicyText}
        approved={form.refundContactApproved}
        disabled={disabled}
        onText={(refundContactPolicyText) => patch({ refundContactPolicyText })}
        onApproved={(refundContactApproved) => patch({ refundContactApproved })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Return eligibility window (days after delivery)</FieldLabel>
          <Input
            type="number"
            min={0}
            max={365}
            disabled={disabled}
            value={form.returnEligibilityDays}
            onChange={(e) => patch({ returnEligibilityDays: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>Excluded category IDs (one per line, optional)</FieldLabel>
          <Textarea
            rows={3}
            disabled={disabled}
            value={form.returnExcludedCategoryIds}
            onChange={(e) => patch({ returnExcludedCategoryIds: e.target.value })}
            placeholder="Category IDs where returns are not offered"
          />
        </div>
      </div>
    </div>
  );
}

function PolicyBlock({
  title,
  text,
  approved,
  disabled,
  onText,
  onApproved,
}: {
  title: string;
  text: string;
  approved: boolean;
  disabled?: boolean;
  onText: (v: string) => void;
  onApproved: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel>{title}</FieldLabel>
      <Textarea
        rows={4}
        disabled={disabled}
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder={`${title} policy text for customers`}
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={approved}
          disabled={disabled}
          onCheckedChange={(v) => onApproved(v === true)}
        />
        Product owner approves this text for checkout
      </label>
    </div>
  );
}
