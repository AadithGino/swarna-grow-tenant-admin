import { istBusinessDateToday } from "@/src/lib/ist-business-date";
import type {
  Customer,
  CashHandoverDetail,
  DashboardGoldRate,
  Enrollment,
  GlobalSearchItem,
  GlobalSearchKind,
  GlobalSearchResult,
  PayableQuote,
  Payment,
  PortalAlert,
  RedemptionRecord,
  SchemePlan,
  SettlementLine,
  SettlementPreview,
  SettlementPreviewType,
} from "@/src/types/domain";
import type {
  StaffPerformanceCollectionRow,
  StaffPerformanceEnrolmentRow,
  StaffPerformanceHandoverRow,
  StaffPerformanceMoneyBlock,
  StaffPerformanceSummaryView,
  StaffPerformanceSectionResult,
  StaffPerformanceCollectionsSection,
  StaffPerformanceEnrolmentsSection,
  StaffPerformanceHandoversSection,
} from "@/src/types/staff-performance";
import { initials, money, preciseMoney } from "@/src/lib/format";
import { adaptEnrollmentStatusBreakdown } from "@/src/lib/enrollment-status-counts";
import { mergePageMeta, type ListPageMeta } from "@/src/lib/cursor-pagination";
import {
  cappedCyclePayableBounds,
  CAPPED_CYCLE_INCREMENT,
  CAPPED_CYCLE_NORMAL_MIN,
} from "@/src/lib/payment-limits";
import { readGoldAccrual } from "@/src/lib/gold-payment-display";

export type ContractWrapper<T = unknown> = {
  __contract: true;
  payload: T;
  meta?: any;
};
export const contractPayload = <T = any>(value: T | ContractWrapper<T>): T =>
  (value as ContractWrapper<T>)?.__contract
    ? (value as ContractWrapper<T>).payload
    : (value as T);
export const contractMeta = (value: unknown) =>
  (value as ContractWrapper)?.__contract
    ? (value as ContractWrapper).meta
    : undefined;

export function contractPage(raw: unknown): ListPageMeta {
  const meta = contractMeta(raw);
  return mergePageMeta((meta ?? raw) as Record<string, unknown>);
}

export function parseSettlementValueBasis(
  value: unknown,
): SettlementPreview["valueBasis"] {
  if (value === "GOLD_WEIGHT" || value === "CASH") return value;
  return undefined;
}

function unwrapEnrollmentList(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  const payload = contractPayload<any>(raw);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}
/**
 * Convert API money to rupees for display.
 * - `{ amountPaise }` money refs → amountPaise / 100
 * - bare numbers are treated as **paise** (backend contract)
 * - already-adapted UI rows should not call this again
 */
export const fromPaise = (value: any): number => {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value / 100;
  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value) / 100;
  }
  if (value && typeof value.amountPaise === "number")
    return value.amountPaise / 100;
  if (value && typeof value.ratePerGramPaise === "number")
    return value.ratePerGramPaise / 100;
  return 0;
};

/** @deprecated Prefer fromPaise for API amounts; kept as alias. */
export const rupees = fromPaise;
export const mgToGrams = (value: any): number => {
  if (typeof value === "number") return value / 1000;
  if (typeof value?.weightMg === "number") return value.weightMg / 1000;
  if (typeof value?.goldWeightMg === "number") return value.goldWeightMg / 1000;
  return 0;
};
const entityId = (item: any) => String(item?.id ?? item?._id ?? "");
const looksLikeOpaqueId = (value: string) =>
  /^(brn|usr|cus|sch|tnt|pay|spl|aud|enr)_/i.test(value.trim());
const branchName = (item: any) => {
  const fromObj = item?.branch?.name ?? item?.branch?.code;
  if (fromObj) return String(fromObj);
  if (typeof item?.branchName === "string" && item.branchName) {
    return item.branchName;
  }
  const asString =
    typeof item?.branch === "string" && item.branch ? item.branch : null;
  if (asString && !looksLikeOpaqueId(asString)) return asString;
  return "—";
};
const customerName = (item: any) => {
  const fromObj = item?.customer?.name ?? item?.customerName;
  if (fromObj) return String(fromObj);
  const asString =
    typeof item?.customer === "string" && item.customer ? item.customer : null;
  if (asString && !looksLikeOpaqueId(asString)) return asString;
  return "—";
};
const staffName = (item: any) => {
  const fromObj =
    item?.collectedBy?.name ??
    item?.staff?.name ??
    item?.actor?.name ??
    item?.performedBy?.name;
  if (fromObj) return String(fromObj);
  for (const key of ["collectedBy", "staff", "actor", "performedBy"] as const) {
    const value = item?.[key];
    if (typeof value === "string" && value && !looksLikeOpaqueId(value)) {
      return value;
    }
  }
  return "—";
};
const branchIdOf = (item: any) =>
  String(item?.branchId ?? item?.branch?.id ?? item?.branch?._id ?? "");
const formatAddress = (address: unknown): string => {
  if (typeof address === "string") return address;
  if (!address || typeof address !== "object") return "";
  const a = address as {
    line1?: string;
    line2?: string;
    city?: string;
    pincode?: string;
  };
  return [a.line1, a.line2, a.city, a.pincode].filter(Boolean).join(", ");
};
const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";
const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";

function kycDocumentLabel(side: string, type?: string) {
  if (side === "BACK") return "Aadhaar — back";
  if (side === "FRONT") return type === "PAN" ? "PAN card" : "Aadhaar — front";
  return "Identity document";
}

function buildAdminKycDocuments(kyc: Record<string, unknown>) {
  const fromApi =
    (kyc.documents as Array<Record<string, unknown>> | undefined) ?? [];
  if (fromApi.length) {
    return fromApi.map((doc) => ({
      side: (doc.side as string) ?? "SINGLE",
      label: String(
        doc.label ??
          kycDocumentLabel(String(doc.side ?? "SINGLE"), kyc.type as string),
      ),
      uploadId: (doc.uploadId as string) ?? undefined,
      previewUrl: (doc.previewUrl ?? doc.viewUrl) as string | undefined,
    }));
  }
  const docs: Array<{
    side: string;
    label: string;
    uploadId?: string;
    previewUrl?: string;
  }> = [];
  if (kyc.frontUploadId) {
    docs.push({
      side: "FRONT",
      label: kycDocumentLabel("FRONT", kyc.type as string),
      uploadId: String(kyc.frontUploadId),
    });
  }
  if (kyc.backUploadId) {
    docs.push({
      side: "BACK",
      label: kycDocumentLabel("BACK", kyc.type as string),
      uploadId: String(kyc.backUploadId),
    });
  }
  return docs;
}

export function adaptCustomerList(raw: any): {
  items: Customer[];
  total: number;
  page: ListPageMeta;
} {
  if (raw?.items?.[0]?.customerNo) {
    return {
      ...raw,
      page: raw.page ?? mergePageMeta(raw, { total: raw.total }),
    };
  }
  const list = contractPayload<any[]>(raw) ?? [];
  const rows = Array.isArray(list) ? list : ((list as any)?.items ?? []);
  const items = rows.map((item: any) => {
    const kycStatus = String(
      item.kyc?.status ?? item.kycStatus ?? "NOT_SUBMITTED",
    ).toUpperCase();
    return {
      id: entityId(item),
      customerNo:
        item.passbookNumber ?? item.customerNumber ?? item.customerNo ?? "",
      name: item.name,
      initials: initials(item.name),
      phone: item.mobile,
      email: item.email ?? "",
      branch: branchName(item),
      branchId: branchIdOf(item),
      activeSchemes:
        item.schemeSummary?.active ?? item.summary?.activeSchemes ?? 0,
      nextDue: date(item.nextDue?.date),
      nextDueAmount: fromPaise(
        item.nextDue?.amountPaise ?? item.nextDue?.amount,
      ),
      overdueAmount: fromPaise(
        item.overdue?.amountPaise ?? item.overdue?.amount,
      ),
      lastPayment: date(item.lastPaymentAt),
      lastPaymentAmount: 0,
      kyc:
        kycStatus === "VERIFIED"
          ? "VERIFIED"
          : kycStatus === "REJECTED"
            ? "REJECTED"
            : "PENDING",
      status: item.status,
      joined: date(item.createdAt),
      version: item.audit?.version ?? item.version ?? 1,
      address: formatAddress(item.address),
    };
  }) as Customer[];
  const meta = contractMeta(raw);
  const total = meta?.total ?? items.length;
  return {
    items,
    total,
    page: mergePageMeta(meta ?? raw, { total }),
  };
}

export function adaptCustomer(raw: any): Customer {
  if (raw?.customerNo && raw?.version != null) return raw;
  const item = contractPayload<any>(raw);
  const kycDetail =
    raw?.kycDetail ??
    (item.kyc
      ? {
          type: item.kyc.type ?? "AADHAAR",
          status: item.kyc.status ?? "NOT_SUBMITTED",
          number: item.kyc.number ?? undefined,
          submittedAt: date(item.kyc.submittedAt),
          verifiedAt: date(item.kyc.verifiedAt),
          verifiedBy: item.kyc.verifiedBy?.name,
          rejectionRemarks:
            item.kyc.rejectionRemarks ?? item.kyc.rejectionReason,
          documents: buildAdminKycDocuments(item.kyc),
        }
      : undefined);
  const nomineeDetail =
    raw?.nomineeDetail ??
    (item.nominee
      ? {
          name: item.nominee.name,
          relationship: item.nominee.relationship,
          relationshipLabel: item.nominee.relationshipLabel,
          mobile: item.nominee.mobile,
          notes: item.nominee.notes,
          updatedAt: date(item.nominee.updatedAt),
          updatedBy: item.nominee.updatedBy?.name,
        }
      : undefined);
  return {
    id: entityId(item),
    customerNo:
      item.passbookNumber ?? item.customerNumber ?? item.customerNo ?? "",
    name: item.name,
    initials: initials(item.name),
    phone: item.mobile,
    email: item.email ?? "",
    branch: branchName(item),
    branchId: branchIdOf(item),
    activeSchemes:
      item.summary?.activeSchemes ?? item.schemeSummary?.active ?? 0,
    lifetimePaid: fromPaise(
      item.summary?.lifetimePaidPaise ?? item.lifetimePaidPaise,
    ),
    paymentCount: Number(item.summary?.paymentCount ?? 0),
    nextDue: date(item.nextDue?.date),
    nextDueAmount: fromPaise(item.nextDue?.amountPaise ?? item.nextDue?.amount),
    overdueAmount: fromPaise(item.overdue?.amountPaise ?? item.overdue?.amount),
    lastPayment: "—",
    lastPaymentAmount: 0,
    kyc:
      item.kyc?.status === "VERIFIED"
        ? "VERIFIED"
        : item.kyc?.status === "REJECTED"
          ? "REJECTED"
          : "PENDING",
    status: item.status,
    joined: date(item.audit?.createdAt ?? item.createdAt),
    version: item.audit?.version ?? item.version ?? 1,
    address: formatAddress(item.address),
    nominee: nomineeDetail
      ? [
          nomineeDetail.name,
          nomineeDetail.relationshipLabel,
          nomineeDetail.mobile,
        ]
          .filter(Boolean)
          .join(" · ")
      : undefined,
    nomineeDetail,
    kycDetail,
  };
}

export function adaptEnrollmentList(
  raw: any,
  customerFallback = "",
): Enrollment[] {
  if (Array.isArray(raw) && (!raw.length || raw[0]?.enrollmentNo)) return raw;
  if (
    raw?.items &&
    Array.isArray(raw.items) &&
    (!raw.items.length || raw.items[0]?.enrollmentNo)
  ) {
    return raw.items;
  }
  const list = unwrapEnrollmentList(raw);
  if (!list.length) return [];
  return list.map((item) => {
    const plan = item.plan ?? item.planSnapshot ?? {};
    const installments = Array.isArray(item.installments)
      ? item.installments
      : [];
    const paidInstallments = installments.filter((row: any) =>
      ["PAID", "WAIVED"].includes(String(row.status ?? "")),
    ).length;
    const nextDueRow =
      item.nextDue ??
      item.duePreview ??
      installments.find((row: any) =>
        ["DUE", "PARTIALLY_PAID", "OVERDUE", "PENDING"].includes(
          String(row.status ?? ""),
        ),
      );
    const paidPaise =
      (typeof item.progress?.amountPaid?.amountPaise === "number"
        ? item.progress.amountPaid.amountPaise
        : null) ??
      (typeof item.totals?.totalPaid?.amountPaise === "number"
        ? item.totals.totalPaid.amountPaise
        : null) ??
      (typeof item.totals?.amountPaidPaise === "number"
        ? item.totals.amountPaidPaise
        : null) ??
      (typeof item.amountPaidPaise === "number"
        ? item.amountPaidPaise
        : null) ??
      installments.reduce(
        (sum: number, row: any) => sum + Number(row.paidPaise ?? 0),
        0,
      );
    const outstandingPaise = installments.reduce((sum: number, row: any) => {
      if (["PAID", "WAIVED"].includes(String(row.status ?? ""))) return sum;
      return (
        sum +
        Math.max(0, Number(row.amountPaise ?? 0) - Number(row.paidPaise ?? 0))
      );
    }, 0);
    // Unpaid on instalments whose due date has arrived (IST) — what the customer owes today.
    const todayIstYmd = istBusinessDateToday();
    const dueNowPaise = installments.reduce((sum: number, row: any) => {
      if (["PAID", "WAIVED"].includes(String(row.status ?? ""))) return sum;
      const due = String(row.dueDate ?? "").slice(0, 10);
      if (!due || due > todayIstYmd) return sum;
      return (
        sum +
        Math.max(0, Number(row.amountPaise ?? 0) - Number(row.paidPaise ?? 0))
      );
    }, 0);
    const installmentPaise =
      item.installmentAmountPaise ??
      nextDueRow?.amountPaise ??
      (typeof item.installmentAmount === "number" &&
      item.installmentAmount > 1000
        ? item.installmentAmount
        : null) ??
      plan.amountRules?.fixedAmountPaise ??
      0;
    return {
      id: entityId(item),
      enrollmentNo:
        item.schemeNumber ?? item.enrollmentNumber ?? item.enrollmentNo ?? "",
      customerId: String(
        item.customer?.id ?? item.customer?._id ?? item.customerId ?? "",
      ),
      customer: item.customer?.name ?? item.customerName ?? customerFallback,
      plan: plan.name ?? item.planName ?? "—",
      collectionFrequency: item.collectionFrequency,
      collectionBonus: item.collectionBonus,
      oneTimeProgress: item.oneTimeProgress,
      branch: branchName(item),
      progress:
        item.progress?.installmentsPaid ??
        item.progress?.paidCycles ??
        paidInstallments,
      tenure:
        (item.collectionFrequency && installments.length ? installments.length : undefined) ??
        item.progress?.installmentsTotal ??
        item.durationMonths ??
        plan.durationMonths ??
        plan.installmentCount ??
        installments.length ??
        0,
      paid: fromPaise(paidPaise),
      installment: fromPaise(installmentPaise),
      /** Every unpaid instalment, including ones not due yet. */
      outstanding: fromPaise(outstandingPaise),
      /** Unpaid instalments already due (today or earlier). */
      dueNow: fromPaise(dueNowPaise),
      nextDue: date(
        nextDueRow?.date ?? nextDueRow?.dueDate ?? item.nextDueDate,
      ),
      nextDueAmount: fromPaise(
        nextDueRow?.remainingPaise ??
          nextDueRow?.amountPaise ??
          installmentPaise,
      ),
      maturity: date(item.maturityDate ?? item.dates?.maturityDate),
      status: item.uiStatus ?? item.status,
      valueBasis:
        plan.valueBasis ??
        item.planSnapshot?.valueBasis ??
        item.valueBasis ??
        "CASH",
      accumulatedGold: mgToGrams(
        item.goldAccrued ??
          item.totals?.goldAccrued ??
          item.totals?.goldWeightMg ??
          item.goldWeightMg,
      ),
      paymentPattern:
        plan.paymentPattern === "FLEXIBLE" || item.paymentPattern === "FLEXIBLE"
          ? "FLEXIBLE"
          : item.paymentPattern === "FIXED" || plan.paymentPattern === "FIXED"
            ? "FIXED"
            : item.displayMode?.startsWith("FLEXIBLE")
              ? "FLEXIBLE"
              : "FIXED",
      displayMode:
        item.displayMode ??
        (item.paymentPattern === "FIXED"
          ? "FIXED"
          : item.flexiblePhase === "FLEXIBLE"
            ? "FLEXIBLE_FREE_WINDOW"
            : item.paymentPattern === "FLEXIBLE"
              ? "FLEXIBLE_LOCK_WINDOW"
              : "FIXED"),
      version: item.version ?? item.audit?.version ?? 1,
      canRecordPayment:
        item.actions?.canRecordPayment ??
        (item.uiStatus ?? item.status) === "ACTIVE",
      canRedeem:
        item.actions?.canRedeem ?? (item.uiStatus ?? item.status) === "MATURED",
      pendingRedemption: item.pendingRedemption ?? null,
      completedRedemption: item.completedRedemption ?? null,
      allowedRedemptionModes:
        item.planSnapshot?.redemptionRules?.allowedModes ??
        plan.redemptionRules?.allowedModes ??
        item.allowedRedemptionModes,
      cashSettlementBasis:
        item.planSnapshot?.redemptionRules?.cashSettlementBasis ??
        plan.redemptionRules?.cashSettlementBasis,
      paidAmountBenefitTreatment:
        item.planSnapshot?.redemptionRules?.paidAmountBenefitTreatment ??
        plan.redemptionRules?.paidAmountBenefitTreatment,
      shopBalanceSummary: item.shopBalanceSummary ?? null,
    };
  }) as Enrollment[];
}

export function adaptEnrollment(raw: any): Enrollment {
  if (raw?.enrollmentNo && raw?.displayMode) return raw as Enrollment;
  const item = contractPayload<any>(raw) ?? raw;
  const list = adaptEnrollmentList([item]);
  const row = list[0];
  const payable = item.payableThisMonth ?? {};
  const position = item.paymentPosition ?? {};
  const flexible = item.flexible ?? {};
  const schedule = item.schedule;
  const rows: Enrollment["schedule"] = [];
  const schemeId = entityId(item);
  const passbookRows = item.passbook?.rows;
  if (Array.isArray(passbookRows) && passbookRows.length) {
    rows.push(
      ...passbookRows.map((entry: any, index: number) => ({
        id: entityId(entry) || `${schemeId}_${index}`,
        cycle: entry.installmentNumber ?? entry.cycleNumber ?? index + 1,
        label:
          entry.cycleLabel ??
          `Installment ${entry.installmentNumber ?? index + 1}`,
        due: date(entry.dueDate),
        amount: rupees(entry.amountDue ?? entry.amount ?? entry.amountPaise),
        paid: rupees(
          entry.payment?.amountPaid ?? entry.paid ?? entry.paidPaise,
        ),
        remaining: rupees(
          entry.remaining ??
            entry.remainingPaise ??
            Math.max(
              0,
              Number(entry.amountPaise ?? 0) - Number(entry.paidPaise ?? 0),
            ),
        ),
        status: entry.status,
        receipt: entry.payment?.receiptNumber,
        goldAccrual: readGoldAccrual(
          entry.payment ?? entry.goldAccrual ?? entry,
        ),
        paymentId:
          entry.payment?.id ??
          entry.payment?._id ??
          entry.paymentId ??
          undefined,
      })),
    );
  } else if (Array.isArray(item.installments) && item.installments.length) {
    rows.push(
      ...item.installments.map((entry: any, index: number) => ({
        id: entityId(entry) || `${schemeId}_inst_${index}`,
        cycle: entry.number ?? entry.installmentNumber ?? index + 1,
        label: `Installment ${entry.number ?? entry.installmentNumber ?? index + 1}`,
        due: date(entry.dueDate),
        amount: rupees(entry.amountPaise ?? entry.amount),
        paid: rupees(entry.paidPaise ?? entry.paid),
        remaining: rupees(
          entry.remainingPaise ??
            Math.max(
              0,
              Number(entry.amountPaise ?? 0) - Number(entry.paidPaise ?? 0),
            ),
        ),
        status: entry.status,
        receipt: entry.payment?.receiptNumber,
        goldAccrual: readGoldAccrual(entry.payment ?? entry),
        paymentId:
          entry.payment?.id ??
          entry.payment?._id ??
          entry.paymentId ??
          undefined,
      })),
    );
  } else if (Array.isArray(item.cycles) && item.cycles.length) {
    rows.push(
      ...item.cycles.map((entry: any, index: number) => ({
        id: entityId(entry) || `${schemeId}_cycle_${index}`,
        cycle: index + 1,
        label: entry.cycle ?? `Cycle ${index + 1}`,
        due: String(entry.expiresAt ?? entry.cycle ?? "—"),
        amount: rupees(entry.capPaise ?? entry.amountPaise),
        paid: rupees(entry.paidPaise),
        remaining: rupees(entry.remainingPaise),
        paymentCount: entry.paymentCount,
        status: entry.status,
      })),
    );
  } else if (schedule) {
    const pack = [
      ...(schedule.completed ?? []),
      schedule.current,
      ...(schedule.upcoming ?? []),
    ].filter(Boolean);
    rows.push(
      ...pack.map((entry: any) => ({
        id: `${schemeId}_${entry.cycleNumber}`,
        cycle: entry.cycleNumber,
        label: entry.cycleLabel,
        due: entry.cycleLabel,
        amount: (entry.capPaise ?? 0) / 100,
        paid: (entry.paidPaise ?? 0) / 100,
        remaining: (entry.remainingPaise ?? 0) / 100,
        paymentCount: entry.paymentCount,
        status: entry.status,
      })),
    );
  }
  return {
    ...row,
    collectionFrequency: item.collectionFrequency,
    collectionBonus: item.collectionBonus,
    version: item.version ?? item.audit?.version ?? row.version ?? 1,
    helperText: item.pendingRedemption
      ? "Redemption is in progress. Collections are blocked until it is completed or rejected."
      : item.completedRedemption || item.status === "REDEEMED"
        ? "This enrollment is fully redeemed. No further collections apply."
        : item.status === "CLOSED_PREMATURE"
          ? "This enrollment was closed early. Settlement is recorded in the ledger."
          : payable.helperText,
    pendingRedemption: item.pendingRedemption ?? row.pendingRedemption ?? null,
    completedRedemption:
      item.completedRedemption ?? row.completedRedemption ?? null,
    schemeSpend: Array.isArray(item.schemeSpend) ? item.schemeSpend : row.schemeSpend ?? [],
    schemeSpendAttempts: Array.isArray(item.schemeSpendAttempts)
      ? item.schemeSpendAttempts
      : row.schemeSpendAttempts ?? [],
    shopBalanceSummary: item.shopBalanceSummary ?? row.shopBalanceSummary ?? null,
    payableMin: rupees(payable.min),
    payableMax: rupees(payable.max),
    payableSuggested: payable.suggested ? rupees(payable.suggested) : null,
    positionVersion: position.positionVersion ?? payable.positionVersion,
    targetCycle: position.targetCycle ?? payable.targetCycle,
    cycleLabel: position.cycleLabel,
    formulaLabel:
      flexible.capSnapshot?.formulaLabel ??
      flexible.projectedLock?.formulaLabel,
    explainerText:
      flexible.capSnapshot?.explainerText ?? flexible.projectedLock?.note,
    currentCycleCap: rupees(
      position.currentCycleCap ?? flexible.capSnapshot?.cycleCap,
    ),
    confirmedThisCycle: rupees(position.confirmedThisCycle),
    remainingThisCycle: rupees(position.remainingThisCycle),
    lockDate: flexible.freeWindow?.lockDate,
    daysToLock: flexible.freeWindow?.daysToLock,
    projectedMonthly: rupees(flexible.projectedLock?.ifWindowClosedToday),
    phase: flexible.phase,
    allowedRedemptionModes:
      item.planSnapshot?.redemptionRules?.allowedModes ??
      item.plan?.redemptionRules?.allowedModes ??
      row.allowedRedemptionModes ??
      (row.valueBasis === "GOLD_WEIGHT"
        ? ["GOLD_HANDOVER", "CASH", "PURCHASE_ADJUSTMENT"]
        : ["CASH", "PURCHASE_ADJUSTMENT", "GOLD_HANDOVER"]),
    cashSettlementBasis:
      item.planSnapshot?.redemptionRules?.cashSettlementBasis ??
      item.plan?.redemptionRules?.cashSettlementBasis,
    paidAmountBenefitTreatment:
      item.planSnapshot?.redemptionRules?.paidAmountBenefitTreatment ??
      item.plan?.redemptionRules?.paidAmountBenefitTreatment,
    monthlyBreakdown: (flexible.freeWindow?.monthlyBreakdown ?? []).map(
      (m: any) => ({
        month: m.month,
        paid: rupees(m.paid),
        paymentCount: m.paymentCount,
        status: rupees(m.paid) > 0 ? "PAID" : "UPCOMING",
      }),
    ),
    schedule: rows.length ? rows : row.schedule,
  };
}

export function adaptPayableRange(raw: any): PayableQuote {
  if (raw?.helperText && typeof raw.min === "number" && raw.displayMode)
    return raw;
  const item = contractPayload<any>(raw) ?? {};
  const limits = item.limits ?? {};

  // Live `payableRange` returns minPayablePaise / maxPayablePaise / suggestedPaise.
  const minFromLive =
    item.minPayablePaise != null
      ? Number(item.minPayablePaise) / 100
      : typeof item.min === "number"
        ? item.min
        : null;
  const maxFromLive =
    item.maxPayablePaise != null
      ? Number(item.maxPayablePaise) / 100
      : typeof item.max === "number"
        ? item.max
        : null;
  const suggestedFromLive =
    item.suggestedPaise != null
      ? Number(item.suggestedPaise) / 100
      : item.suggested != null
        ? typeof item.suggested === "number"
          ? item.suggested
          : rupees(item.suggested)
        : null;

  const displayMode =
    item.displayMode ??
    (item.phase === "CAPPED" || item.currentPhase === "CAPPED"
      ? "FLEXIBLE_LOCK_WINDOW"
      : item.phase === "FLEXIBLE" ||
          item.currentPhase === "FREE_WINDOW" ||
          item.model === "FLEXIBLE" ||
          item.paymentPattern === "FLEXIBLE"
        ? "FLEXIBLE_FREE_WINDOW"
        : "FIXED");

  const remaining =
    item.remainingPaise != null
      ? Number(item.remainingPaise) / 100
      : (item.capPosition?.remainingThisCyclePaise ?? 0) / 100 ||
        maxFromLive ||
        rupees(item.max ?? { amountPaise: limits.maximumPayableNowPaise });

  const normalMin =
    minFromLive ??
    (rupees(item.min ?? { amountPaise: limits.minimumNormalPaymentPaise }) ||
      CAPPED_CYCLE_NORMAL_MIN);

  const flexiblePayAnyAmount =
    displayMode === "FLEXIBLE_FREE_WINDOW" ||
    displayMode === "FLEXIBLE_LOCK_WINDOW";

  const increment = flexiblePayAnyAmount
    ? 1
    : item.paymentIncrementPaise != null
      ? Number(item.paymentIncrementPaise) / 100
      : rupees(item.multipleOf ?? { amountPaise: limits.incrementPaise }) ||
        CAPPED_CYCLE_INCREMENT;

  const cappedBounds =
    displayMode === "FLEXIBLE_LOCK_WINDOW"
      ? cappedCyclePayableBounds(remaining, normalMin, increment)
      : null;

  const min = cappedBounds?.min ?? normalMin;
  const max = cappedBounds?.max ?? maxFromLive ?? remaining;
  const suggested = suggestedFromLive ?? min ?? null;

  const paymentPattern: PayableQuote["paymentPattern"] =
    item.model === "FLEXIBLE" ||
    item.paymentPattern === "FLEXIBLE" ||
    displayMode.startsWith("FLEXIBLE")
      ? "FLEXIBLE"
      : "FIXED";

  return {
    schemeId: item.schemeId ?? "",
    paymentPattern,
    displayMode,
    eligible: item.payable !== false && item.eligible !== false,
    helperText: item.helperText ?? item.warnings?.[0]?.message ?? "",
    suggested:
      suggested != null
        ? suggested
        : rupees({ amountPaise: limits.recommendedAmountPaise }) || null,
    min,
    max,
    multipleOf: flexiblePayAnyAmount
      ? undefined
      : (cappedBounds?.multipleOf ?? increment) || undefined,
    coversInstallments: item.coversInstallments,
    targetCycle: item.targetCycle,
    cycleLabel: item.cycleLabel,
    cycleNumber: item.cycleNumber ?? item.installmentNumber,
    positionVersion: item.expectedVersion ?? item.positionVersion,
    currentCycleCap:
      item.capPaise != null
        ? Number(item.capPaise) / 100
        : (item.capPosition?.currentCycleCapPaise ?? 0) / 100,
    confirmedThisCycle:
      item.paidPaise != null
        ? Number(item.paidPaise) / 100
        : (item.capPosition?.confirmedThisCyclePaise ?? 0) / 100,
    remainingThisCycle: remaining,
    successfulPaymentCountThisCycle: item.successfulPaymentsThisCycle?.length,
    finalRemainderException:
      cappedBounds?.finalRemainderException ??
      item.allowFinalRemainderBelowMinimum ??
      limits.finalRemainderException,
    nextCycleAction: item.futureCycle?.available
      ? {
          available: true,
          targetCycle: item.futureCycle.nextEligibleCycle ?? "",
          cycleLabel: item.futureCycle.nextEligibleCycle ?? "",
          remaining: (item.futureCycle.remainingThatCyclePaise ?? 0) / 100,
          label: "Pay next cycle",
        }
      : null,
    blockingReasons: item.blockingReasons,
    customer: item.customer?.name ?? "",
    enrollmentNo:
      item.schemeNumber ?? item.enrollmentNumber ?? item.enrollmentNo ?? "",
    plan: item.plan?.name ?? "",
    status: item.status ?? "ACTIVE",
  };
}

/** Normalize live `{ valid, installmentAmountPaise, firstInstallmentRequired }` into UI preview. */
export function adaptEnrolValidation(raw: any): {
  blockers?: { code: string; message: string; actionPath?: string }[];
  warnings?: { code: string; message: string }[];
  preview?: {
    installmentAmount?: number;
    installmentCount?: number;
    maturityDateProvisional?: boolean;
    collectionFrequency?: import("@/src/types/collection").CollectionFrequency;
    phaseSummary?: string;
    illustrativeCapPerCycle?: number;
    totalCommitment?: number;
    totalPayableNote?: string;
    isFlexible?: boolean;
    firstDueDate?: string;
    maturityDate?: string;
    benefitLabel?: string;
    projectedValue?: number;
    schedulePreview?: {
      sequence: number;
      dueDate: string;
      amountDisplay: string;
      note?: string | null;
    }[];
  };
} {
  const item = contractPayload<any>(raw) ?? raw ?? {};
  const moneyToRupees = (value: any) => {
    if (value == null) return undefined;
    if (typeof value === "number") return value;
    if (typeof value.amountPaise === "number") return value.amountPaise / 100;
    return undefined;
  };
  const normalizePreview = (preview: any) => {
    if (!preview || typeof preview !== "object") return undefined;
    return {
      installmentAmount: moneyToRupees(
        preview.referencePaymentAmount ?? preview.installmentAmount,
      ),
      installmentCount: preview.installmentCount,
      maturityDateProvisional: preview.maturityDateProvisional,
      collectionFrequency: preview.collectionFrequency,
      phaseSummary: preview.phaseSummary,
      illustrativeCapPerCycle: moneyToRupees(preview.illustrativeCapPerCycle),
      totalCommitment: moneyToRupees(
        preview.totalPayable ?? preview.totalCommitment,
      ),
      totalPayableNote: preview.totalPayableNote,
      isFlexible: preview.paymentPattern === "FLEXIBLE",
      firstDueDate: preview.firstDueDate,
      maturityDate: preview.maturityDate,
      benefitLabel:
        preview.benefit?.displayLabel ??
        preview.benefitLabel ??
        preview.benefit?.type,
      projectedValue: moneyToRupees(
        preview.estimatedMaturityValue ?? preview.projectedValue,
      ),
      schedulePreview: (preview.schedulePreview ?? []).map(
        (row: any, index: number) => ({
          sequence: row.installmentNumber ?? row.sequence ?? index + 1,
          dueDate: row.dueDate,
          amountDisplay:
            (preview.collectionFrequency && typeof row.amount?.amountPaise === "number"
              ? preciseMoney(row.amount.amountPaise / 100) : undefined) ??
            row.amount?.amountDisplay ??
            row.amountDisplay ??
            (row.amount?.amountPaise != null
              ? money(row.amount.amountPaise / 100)
              : "—"),
          note: row.note,
        }),
      ),
    };
  };
  if (item.preview != null || Array.isArray(item.blockers)) {
    return {
      blockers: item.blockers ?? [],
      warnings: item.warnings ?? [],
      preview: normalizePreview(item.preview) ?? {},
    };
  }
  const installmentAmount =
    item.installmentAmountPaise != null
      ? Number(item.installmentAmountPaise) / 100
      : undefined;
  return {
    blockers:
      item.valid === false
        ? [
            {
              code: "INVALID",
              message:
                "Enrolment is not valid for the selected plan and amount.",
            },
          ]
        : [],
    warnings: item.firstInstallmentRequired
      ? [
          {
            code: "FIRST_INSTALLMENT_REQUIRED",
            message: "First installment must be collected now.",
          },
        ]
      : [],
    preview: {
      installmentAmount,
    },
  };
}

export function adaptEnrollments(raw: any): {
  items: Enrollment[];
  total: number;
  summary: ReturnType<typeof enrollmentSummaryFromItems>;
  page: ListPageMeta;
  shopBalanceOverview?: import("@/src/lib/scheme-shop-balance").CustomerShopBalanceOverview | null;
} {
  if (raw?.items && Array.isArray(raw.items)) {
    if (raw.items.length === 0) {
      const meta = contractMeta(raw);
      return {
        items: [],
        total: raw.total ?? 0,
        summary: enrollmentSummaryFromMeta(meta?.summary, []),
        page: raw.page ?? mergePageMeta(raw, { total: raw.total ?? 0 }),
      };
    }
    if (raw.items[0]?.enrollmentNo) {
      return {
        items: raw.items as Enrollment[],
        total: raw.total ?? raw.items.length,
        summary: raw.summary ?? enrollmentSummary(raw.items),
        page: raw.page ?? mergePageMeta(raw, { total: raw.total }),
      };
    }
  }
  const items = adaptEnrollmentList(raw);
  const meta = contractMeta(raw);
  const total = meta?.total ?? raw.total ?? items.length;
  const payload = contractPayload(raw) ?? raw;
  return {
    items,
    total,
    summary: enrollmentSummaryFromMeta(meta?.summary, items),
    page: mergePageMeta(meta ?? raw, { total }),
    shopBalanceOverview:
      payload?.shopBalanceOverview
      ?? raw?.shopBalanceOverview
      ?? meta?.shopBalanceOverview
      ?? null,
  };
}

function enrollmentSummaryFromMeta(
  metaSummary: Record<string, unknown> | undefined,
  items: Enrollment[],
) {
  if (metaSummary && typeof metaSummary.active === "number") {
    const activeAndLocked = Number(
      metaSummary.activeAndLocked ?? metaSummary.active ?? 0,
    );
    const defaulted = Number(metaSummary.defaulted ?? 0);
    return {
      active: activeAndLocked,
      activeAndLocked,
      open: Number(metaSummary.open ?? activeAndLocked + defaulted),
      pendingFirstPayment: Number(metaSummary.pendingFirstPayment ?? 0),
      locked: Number(metaSummary.locked ?? 0),
      defaulted,
      matured: Number(metaSummary.matured ?? 0),
      redeemed: Number(metaSummary.redeemed ?? 0),
      pending: Number(metaSummary.redemptionPending ?? 0),
      termEnded: 0,
      redemptionPending: Number(metaSummary.redemptionPending ?? 0),
    };
  }
  return enrollmentSummaryFromItems(items);
}

function enrollmentSummaryFromItems(items: Enrollment[]) {
  const count = (status: string) =>
    items.filter((x) => x.status === status).length;
  return {
    active: count("ACTIVE") + count("LOCKED"),
    locked: count("LOCKED"),
    defaulted: count("DEFAULTED"),
    pending: 0,
    termEnded: 0,
    matured: count("MATURED"),
    redeemed: count("REDEEMED") + count("CLOSED_PREMATURE"),
    redemptionPending: count("REDEEMED") + count("CLOSED_PREMATURE"),
  };
}

/** @deprecated use enrollmentSummaryFromItems */
function enrollmentSummary(items: Enrollment[]) {
  return enrollmentSummaryFromItems(items);
}

export type SchemeLedgerRow = {
  id: string;
  paymentId?: string | null;
  sequence: number | null;
  type: string | null;
  description: string | null;
  date: string;
  receiptNo: string;
  amount: number;
  mode?: string | null;
  goldAccrual?: import("@/src/types/customer").PaymentGoldAccrual | null;
};

export function adaptSchemeLedgerList(raw: unknown): SchemeLedgerRow[] {
  const payload = contractPayload<any>(raw);
  const list: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.entries)
        ? payload.entries
        : Array.isArray((raw as any)?.data)
          ? (raw as any).data
          : [];
  return list.map((item) => {
    const amountPaise =
      item.amount?.amountPaise ??
      item.amountPaise ??
      (typeof item.amount === "number" ? Math.round(item.amount * 100) : 0);
    return {
      id: entityId(item),
      paymentId: item.paymentId
        ? String(item.paymentId)
        : item.payment?._id
          ? String(item.payment._id)
          : item.payment?.id
            ? String(item.payment.id)
            : null,
      sequence: item.sequence ?? null,
      type: item.type ?? null,
      description: item.description ?? null,
      date: dateTime(item.effectiveAt ?? item.createdAt ?? item.paidAt),
      receiptNo: item.receiptNumber ?? item.receiptNo ?? "—",
      amount: amountPaise / 100,
      mode: item.mode ?? null,
      goldAccrual: readGoldAccrual(item),
    };
  });
}

export function adaptPaymentList(raw: any, customerName = ""): Payment[] {
  if (Array.isArray(raw) && (!raw.length || raw[0]?.receiptNo)) return raw;
  const payload = contractPayload<any>(raw);
  const list: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw)
          ? raw
          : payload
            ? [payload]
            : [];
  return list.map((item: any) => {
    const grossAmount = rupees(
      item.grossAmount ?? { amountPaise: item.amountPaise ?? 0 },
    );
    const refundedAmount = rupees(
      item.refundedAmount ?? { amountPaise: item.refundedAmountPaise ?? 0 },
    );
    const netAmount = rupees(
      item.netAmount ?? {
        amountPaise: Math.max(
          0,
          Number(item.amountPaise ?? 0) - Number(item.refundedAmountPaise ?? 0),
        ),
      },
    );
    const customer =
      item.customer?.name ??
      (typeof item.customer === "string" && item.customer
        ? item.customer
        : null) ??
      (item.customerId != null ? String(item.customerId) : null) ??
      (customerName || null) ??
      "—";
    const sourceRaw = String(item.source ?? "").toUpperCase();
    const source: Payment["source"] =
      sourceRaw === "PORTAL" || sourceRaw === "ADMIN"
        ? "ADMIN"
        : sourceRaw === "STAFF_APP" || sourceRaw === "STAFF"
          ? "STAFF"
          : "PAYMENT_LINK";
    const recordedBy =
      sourceRaw === "CUSTOMER_APP"
        ? "Customer app"
        : sourceRaw === "STAFF_APP"
          ? staffName(item) !== "—"
            ? staffName(item)
            : "Staff app"
          : sourceRaw === "PORTAL" || sourceRaw === "ADMIN"
            ? staffName(item) !== "—"
              ? staffName(item)
              : "Admin panel"
            : staffName(item) === "—" && sourceRaw === "CUSTOMER_APP"
              ? "Customer app"
              : staffName(item);
    return {
      id: entityId(item),
      receiptNo: item.receiptNumber ?? item.receiptNo ?? "",
      date: dateTime(item.paidAt ?? item.createdAt),
      customer,
      customerId: String(
        item.customer?.id ?? item.customer?._id ?? item.customerId ?? "",
      ),
      enrollmentNo:
        item.scheme?.enrollmentNumber ??
        item.scheme?.schemeNumber ??
        item.enrollmentNumber ??
        item.enrollmentNo ??
        item.schemeNumber ??
        "—",
      schemeId: String(
        item.schemeId ?? item.scheme?._id ?? item.scheme?.id ?? "",
      ),
      amount: netAmount,
      grossAmount,
      refundedAmount,
      netAmount,
      gatewayRefundReservedAmount: rupees(
        item.gatewayRefundReservedAmount ?? {
          amountPaise: item.gatewayRefundReservedPaise ?? 0,
        },
      ),
      mode: item.mode,
      staff: recordedBy,
      branch: branchName(item),
      status: item.status,
      source,
      isLateSuccess: Boolean(item.isLateSuccess),
      goldAccrual: readGoldAccrual(item),
    } as Payment;
  });
}

function byModeFromSuccessfulItems(items: Payment[]) {
  const buckets = new Map<string, { count: number; amount: number }>();
  for (const row of items) {
    if (!["SUCCESS", "PARTIALLY_REFUNDED"].includes(row.status)) continue;
    const mode = row.mode ?? "CASH";
    const prev = buckets.get(mode) ?? { count: 0, amount: 0 };
    prev.count += 1;
    prev.amount += Number(row.netAmount ?? row.amount ?? 0);
    buckets.set(mode, prev);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mode, stats]) => ({
      mode,
      label: PAYMENT_MODE_LABELS[mode] ?? mode,
      count: stats.count,
      amount: stats.amount,
    }));
}

function paymentSummaryFromItems(items: Payment[]) {
  const sum = (predicate: (p: Payment) => boolean) =>
    items
      .filter(predicate)
      .reduce((total, row) => total + Number(row.amount ?? 0), 0);
  const isCollected = (p: Payment) =>
    p.status === "SUCCESS" || p.status === "PARTIALLY_REFUNDED";
  const sumNet = (predicate: (p: Payment) => boolean) =>
    items
      .filter(predicate)
      .reduce(
        (total, row) => total + Number(row.netAmount ?? row.amount ?? 0),
        0,
      );
  const collected = sumNet(isCollected);
  const cash = sumNet((p) => isCollected(p) && p.mode === "CASH");
  const card = sumNet((p) => isCollected(p) && p.mode === "CARD");
  const upi = sumNet((p) => isCollected(p) && p.mode === "UPI");
  const online = sum(
    (p) =>
      isCollected(p) &&
      (p.mode === "ONLINE_GATEWAY" || p.mode === "BANK_TRANSFER"),
  );
  return {
    collected,
    cash,
    card,
    upi,
    online,
    digital: card + upi + online,
    pending: sum((p) => p.status === "PENDING"),
    reversed: sum((p) => p.status === "REVERSED"),
    refunded: items.reduce(
      (total, row) => total + Number(row.refundedAmount ?? 0),
      0,
    ),
    failed: items.filter((p) => p.status === "FAILED").length,
    lateSuccess: sum((p) => Boolean(p.isLateSuccess)),
  };
}

export function adaptPayments(raw: any) {
  if (raw?.items?.[0]?.receiptNo) {
    const items = raw.items as Payment[];
    const derived = paymentSummaryFromItems(items);
    const summary = {
      ...derived,
      ...(raw.summary ?? {}),
      collected: raw.summary?.collected ?? derived.collected,
      cash: raw.summary?.cash ?? derived.cash,
      card: raw.summary?.card ?? derived.card,
      upi: raw.summary?.upi ?? derived.upi,
      online: raw.summary?.online ?? derived.online,
      digital: raw.summary?.digital ?? derived.digital,
      pending: raw.summary?.pending ?? derived.pending,
      reversed: raw.summary?.reversed ?? derived.reversed,
      refunded:
        raw.summary?.refunded ??
        rupees(
          raw.summary?.totalRefundedAmount ?? raw.summary?.refundedAmount,
        ) ??
        derived.refunded,
      failed: raw.summary?.failed ?? derived.failed,
      lateSuccess: raw.summary?.lateSuccess ?? derived.lateSuccess,
    };
    return { ...raw, summary };
  }
  const items = adaptPaymentList(raw);
  const meta = contractMeta(raw)?.summary ?? {};
  const derived = paymentSummaryFromItems(items);
  let byModeRows: Array<{
    mode: string;
    label: string;
    count: number;
    amount: number;
  }> = (meta.byMode ?? []).map((x: any) => ({
    mode: x.mode,
    label: x.label ?? x.mode,
    count: x.count ?? 0,
    amount: rupees(x.amount),
  }));
  if (!byModeRows.some((row) => row.amount > 0) && derived.collected > 0) {
    byModeRows = byModeFromSuccessfulItems(items);
  }
  const byMode = Object.fromEntries(
    byModeRows.map((x: { mode: string; amount: number }) => [x.mode, x.amount]),
  );
  const chartSeries = meta.charts?.modeDistribution?.series?.[0]?.data ?? [];
  const listMeta = contractMeta(raw);
  const cash = byMode.CASH ?? derived.cash;
  const card = byMode.CARD ?? derived.card;
  const upi = byMode.UPI ?? derived.upi;
  const onlineFromModes =
    (byMode.ONLINE_GATEWAY ?? 0) + (byMode.BANK_TRANSFER ?? 0);
  const online = onlineFromModes || derived.online;
  const digital =
    Object.entries(byMode)
      .filter(([key]) => key !== "CASH")
      .reduce((sum, [, value]) => sum + Number(value), 0) || derived.digital;
  return {
    items,
    byMode: byModeRows,
    modeChart: chartSeries.map((point: any) => ({
      name: point.x,
      value: rupees({ amountPaise: point.y }),
      mode: point.modeKey,
    })),
    page: mergePageMeta(listMeta ?? raw, {
      total: meta.count ?? listMeta?.total ?? items.length,
    }),
    summary: {
      count: Number(meta.count ?? listMeta?.total ?? items.length),
      successfulCount: Number(meta.successfulCount ?? 0),
      collected: rupees(meta.successfulAmount) || derived.collected,
      cash,
      card,
      upi,
      online,
      digital,
      pending:
        rupees(
          meta.pendingAmount ??
            (meta.byStatus ?? []).find((x: any) => x.status === "PENDING")
              ?.amount,
        ) || derived.pending,
      pendingCount: Number(meta.pendingCount ?? 0),
      failed: meta.failedCount ?? derived.failed,
      reversed: rupees(meta.reversedAmount) || derived.reversed,
      reversedCount: Number(meta.reversedCount ?? 0),
      /** Partial refunds on payments that still count as collected (excludes full reversals). */
      refunded: rupees(meta.refundedAmount) || derived.refunded,
      grossCollected: rupees(meta.grossSuccessfulAmount),
      lateSuccess: derived.lateSuccess,
    },
  };
}

export function adaptPlans(raw: any) {
  if (
    Array.isArray(raw?.items) &&
    hasListPagination(raw) &&
    (raw.items.length === 0 ||
      (raw.items[0]?.activeEnrollments !== undefined &&
        raw.items[0]?.tenure !== undefined))
  ) {
    return {
      items: raw.items,
      summary: raw.summary ?? {
        active: raw.items.filter((x: SchemePlan) => x.status === "ACTIVE")
          .length,
        draft: raw.items.filter((x: SchemePlan) => x.status === "DRAFT").length,
        enrollments: raw.items.reduce(
          (s: number, x: SchemePlan) => s + (x.activeEnrollments ?? 0),
          0,
        ),
        monthlyValue: 0,
      },
      page: mergePageMeta(raw),
    };
  }
  const list = listArrayFromRaw(raw);
  const items = list.map((item) => {
    const rules = item.amountRules ?? {};
    const schedule = item.scheduleRules ?? {};
    const fixedAmount = fromPaise(rules.fixedAmountPaise);
    const minAmount = fromPaise(rules.minInstallmentPaise);
    const slabs = Array.isArray(rules.slabsPaise)
      ? rules.slabsPaise.map((p: number) => fromPaise(p))
      : [];
    const amountMode =
      rules.amountMode ?? item.amountSummary?.amountMode ?? "CUSTOMER_CHOSEN";
    const amount =
      amountMode === "JEWELLER_FIXED"
        ? fixedAmount
        : amountMode === "JEWELLER_SLABS" && slabs.length
          ? slabs[0]
          : minAmount || fromPaise(item.amountSummary?.min);
    return {
      id: entityId(item),
      code: item.code,
      name: item.displayName ?? item.name,
      displayName: item.displayName ?? item.name,
      valueBasis: item.valueBasis,
      paymentPattern:
        item.paymentPattern === "FIXED"
          ? "FIXED_DATE"
          : item.paymentPattern === "FLEXIBLE"
            ? "FLEXIBLE_AVERAGE"
            : item.paymentPattern,
      amountMode,
      tenure: item.durationMonths,
      amount,
      fixedAmount,
      slabs,
      minAmount,
      maxAmount: fromPaise(rules.maxInstallmentPaise) || undefined,
      amountStep: fromPaise(rules.multipleOfPaise) || undefined,
      collectionRules: item.collectionRules,
      oneTimeRules: item.oneTimeRules,
      firstInstallmentModeDefault:
        schedule.firstInstallmentModeDefault ?? "COLLECT_NOW",
      firstInstallmentModeEditable:
        schedule.firstInstallmentModeEditable !== false,
      activeEnrollments: item.stats?.activeSchemes ?? 0,
      status: item.status,
      editLocked: item.editLocked,
    };
  }) as SchemePlan[];
  const meta = contractMeta(raw);
  const apiSummary = meta?.summary;
  const pageSummary = {
    active: items.filter((x) => x.status === "ACTIVE").length,
    draft: items.filter((x) => x.status === "DRAFT").length,
    enrollments: items.reduce((s, x) => s + x.activeEnrollments, 0),
    monthlyValue: list.reduce(
      (s, x) => s + rupees(x.stats?.collectedThisMonth),
      0,
    ),
  };
  return {
    items,
    summary: {
      active: apiSummary?.activePlans ?? pageSummary.active,
      draft: apiSummary?.draftPlans ?? pageSummary.draft,
      enrollments: apiSummary?.activeEnrollments ?? pageSummary.enrollments,
      monthlyValue:
        apiSummary?.projectedMonthlyPaise != null
          ? rupees(apiSummary.projectedMonthlyPaise)
          : pageSummary.monthlyValue,
    },
    page: mergePageMeta(meta ?? raw, { total: meta?.total ?? items.length }),
  };
}

export function adaptPlanMutationResponse(raw: unknown): SchemePlan {
  const data = (contractPayload(raw) ?? raw) as Record<string, unknown>;
  const rules = (data.amountRules ?? {}) as Record<string, unknown>;
  const minPaise = Number(
    rules.minInstallmentPaise ?? rules.fixedAmountPaise ?? 0,
  );
  return {
    id: entityId(data),
    code: String(data.code ?? ""),
    name: String(data.displayName ?? data.name ?? ""),
    valueBasis: (data.valueBasis as SchemePlan["valueBasis"]) ?? "CASH",
    paymentPattern:
      data.paymentPattern === "FLEXIBLE" ? "FLEXIBLE_AVERAGE" : "FIXED_DATE",
    amountMode:
      (rules.amountMode as SchemePlan["amountMode"]) ?? "CUSTOMER_CHOSEN",
    tenure: Number(data.durationMonths ?? 0),
    amount: minPaise / 100,
    activeEnrollments: 0,
    status: (data.status as SchemePlan["status"]) ?? "DRAFT",
    editLocked: false,
  };
}

export function adaptPlanDetail(raw: unknown): Record<string, unknown> {
  const data = (contractPayload(raw) ?? raw) as Record<string, unknown>;
  if (data.amountSummary && data.stats) return data;
  return data;
}

function normalizePlanChartBlock(block: Record<string, unknown>) {
  const yAxis =
    block.yAxis && typeof block.yAxis === "object"
      ? block.yAxis
      : { type: "count", label: "Count" };
  const axisType = (yAxis as { type?: string }).type ?? "count";
  const series = Array.isArray(block.series)
    ? block.series.map((s: any) => ({
        ...s,
        data: (s.data ?? []).map((p: any) => ({
          ...p,
          yDisplay:
            p.yDisplay ?? (axisType === "count" ? String(p.y ?? 0) : undefined),
        })),
      }))
    : [];
  return { ...block, yAxis, series };
}

export function adaptPlanStats(raw: unknown): Record<string, unknown> {
  const data = (contractPayload(raw) ?? raw) as Record<string, unknown>;
  if (data.enrolments && typeof data.enrolments === "object") {
    const charts = data.charts as Record<string, unknown> | undefined;
    if (charts && typeof charts === "object") {
      data.charts = Object.fromEntries(
        Object.entries(charts).map(([key, chart]) => [
          key,
          normalizePlanChartBlock(chart as Record<string, unknown>),
        ]),
      );
    }
    return data;
  }
  const active = Number(data.active ?? 0);
  const total = Number(data.total ?? active);
  const completed = Number(data.completed ?? 0);
  return {
    enrolments: {
      total,
      active,
      locked: 0,
      matured: 0,
      redeemed: completed,
      closedPremature: 0,
      defaulted: 0,
    },
    financials: {},
    charts: {},
  };
}

export function adaptPaginatedList<T = Record<string, unknown>>(
  raw: unknown,
): { items: T[]; page: ListPageMeta; range?: { from?: string; to?: string } } {
  const items = (contractPayload(raw) as T[]) ?? [];
  const meta = (contractMeta(raw) ?? {}) as Record<string, unknown>;
  return {
    items: Array.isArray(items) ? items : [],
    page: mergePageMeta(meta),
    range: meta.range as { from?: string; to?: string } | undefined,
  };
}

function adaptMoneyBlock(
  value: unknown,
): StaffPerformanceMoneyBlock | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const amountPaise =
    row.amountPaise != null ? Number(row.amountPaise) : undefined;
  const amountDisplay =
    row.amountDisplay != null ? String(row.amountDisplay) : undefined;
  if (amountPaise == null && !amountDisplay) return undefined;
  return { amountPaise, amountDisplay };
}

export function adaptStaffPerformanceSummary(
  raw: unknown,
): StaffPerformanceSummaryView {
  const data = (contractPayload(raw) ?? {}) as Record<string, unknown>;
  const cashRaw = data.cash as Record<string, unknown> | undefined;
  return {
    range: data.range as StaffPerformanceSummaryView["range"],
    trendGroupBy:
      data.trendGroupBy != null ? String(data.trendGroupBy) : undefined,
    collectionTotal: adaptMoneyBlock(data.collectionTotal),
    averageTicket: adaptMoneyBlock(data.averageTicket),
    enrolments: data.enrolments != null ? Number(data.enrolments) : undefined,
    customersServed:
      data.customersServed != null ? Number(data.customersServed) : undefined,
    paymentsCount:
      data.paymentsCount != null ? Number(data.paymentsCount) : undefined,
    collectionTrend: Array.isArray(data.collectionTrend)
      ? data.collectionTrend.map((point) => {
          const p = point as Record<string, unknown>;
          return {
            date: p.date != null ? String(p.date) : undefined,
            label: p.label != null ? String(p.label) : undefined,
            count: p.count != null ? Number(p.count) : undefined,
            amount: adaptMoneyBlock(p.amount),
          };
        })
      : undefined,
    cash: cashRaw
      ? {
          cashInHand: adaptMoneyBlock(cashRaw.cashInHand),
          cashPendingAcceptance: adaptMoneyBlock(cashRaw.cashPendingAcceptance),
          cashCollected: adaptMoneyBlock(cashRaw.cashCollected),
          handedOver: adaptMoneyBlock(cashRaw.handedOver),
        }
      : undefined,
  };
}

export function adaptStaffPerformanceCollectionRow(
  raw: unknown,
): StaffPerformanceCollectionRow {
  const row = (raw ?? {}) as Record<string, unknown>;
  const customer = row.customer as Record<string, unknown> | undefined;
  const scheme = row.scheme as Record<string, unknown> | undefined;
  return {
    paidAt: row.paidAt != null ? String(row.paidAt) : undefined,
    receiptNumber:
      row.receiptNumber != null ? String(row.receiptNumber) : undefined,
    mode: row.mode != null ? String(row.mode) : undefined,
    source: row.source != null ? String(row.source) : undefined,
    amount: adaptMoneyBlock(row.amount),
    customer: customer
      ? {
          id: customer.id != null ? String(customer.id) : undefined,
          name: customer.name != null ? String(customer.name) : undefined,
        }
      : undefined,
    scheme: scheme
      ? {
          id: scheme.id != null ? String(scheme.id) : undefined,
          enrollmentNumber:
            scheme.enrollmentNumber != null
              ? String(scheme.enrollmentNumber)
              : undefined,
        }
      : undefined,
  };
}

export function adaptStaffPerformanceEnrolmentRow(
  raw: unknown,
): StaffPerformanceEnrolmentRow {
  const row = (raw ?? {}) as Record<string, unknown>;
  const customer = row.customer as Record<string, unknown> | undefined;
  const plan = row.plan as Record<string, unknown> | undefined;
  return {
    id: row.id != null ? String(row.id) : undefined,
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
    enrollmentNumber:
      row.enrollmentNumber != null ? String(row.enrollmentNumber) : undefined,
    status: row.status != null ? String(row.status) : undefined,
    customer: customer
      ? {
          id: customer.id != null ? String(customer.id) : undefined,
          name: customer.name != null ? String(customer.name) : undefined,
        }
      : undefined,
    plan: plan
      ? {
          name: plan.name != null ? String(plan.name) : undefined,
          code: plan.code != null ? String(plan.code) : undefined,
        }
      : undefined,
  };
}

export function adaptStaffPerformanceHandoverRow(
  raw: unknown,
): StaffPerformanceHandoverRow {
  const row = (raw ?? {}) as Record<string, unknown>;
  return {
    submittedAt: row.submittedAt != null ? String(row.submittedAt) : undefined,
    settledAt: row.settledAt != null ? String(row.settledAt) : undefined,
    status: row.status != null ? String(row.status) : undefined,
    amount: adaptMoneyBlock(row.amount),
    acceptedAmount: adaptMoneyBlock(row.acceptedAmount),
  };
}

export function adaptStaffPerformanceSection(
  raw: unknown,
  section: "collections",
): StaffPerformanceCollectionsSection;
export function adaptStaffPerformanceSection(
  raw: unknown,
  section: "enrolments",
): StaffPerformanceEnrolmentsSection;
export function adaptStaffPerformanceSection(
  raw: unknown,
  section: "handovers",
): StaffPerformanceHandoversSection;
export function adaptStaffPerformanceSection(
  raw: unknown,
  section: "collections" | "enrolments" | "handovers",
): StaffPerformanceSectionResult {
  const list = adaptPaginatedList(raw);
  if (section === "collections") {
    return {
      kind: "collections",
      ...list,
      items: list.items.map((item) => adaptStaffPerformanceCollectionRow(item)),
    };
  }
  if (section === "enrolments") {
    return {
      kind: "enrolments",
      ...list,
      items: list.items.map((item) => adaptStaffPerformanceEnrolmentRow(item)),
    };
  }
  return {
    kind: "handovers",
    ...list,
    items: list.items.map((item) => adaptStaffPerformanceHandoverRow(item)),
  };
}

export function adaptStaffDetail(raw: unknown): Record<string, unknown> {
  const data = (contractPayload(raw) ?? raw) as Record<string, unknown>;
  const branch = data.branch as Record<string, unknown> | null | undefined;
  return {
    ...data,
    id: entityId(data),
    mustChangePassword:
      data.mustChangePassword ?? data.mustSetPassword ?? false,
    lastLoginAt: data.lastLoginAt ?? data.lastSeenAt ?? null,
    scope:
      data.scope ??
      (!branch?.id &&
      ["TENANT_OWNER", "TENANT_ADMIN"].includes(String(data.role ?? ""))
        ? "TENANT"
        : "BRANCH"),
  };
}

export function adaptStaffList(raw: any): {
  items: {
    id: string;
    name: string;
    initials: string;
    role: string;
    branch: string;
    today: number;
    sessions: number;
    lastSeen: string;
    status: string;
  }[];
  page: ListPageMeta;
} {
  if (
    Array.isArray(raw?.items) &&
    hasListPagination(raw) &&
    (raw.items.length === 0 ||
      (raw.items[0]?.name &&
        typeof raw.items[0]?.branch === "string" &&
        raw.items[0]?.initials !== undefined))
  ) {
    return {
      items: raw.items,
      page: mergePageMeta(raw),
    };
  }
  const list = listArrayFromRaw(raw);
  const items = list.map((item) => ({
    id: entityId(item),
    name: item.name,
    initials: item.initials ?? initials(String(item.name ?? "")),
    role: item.role,
    branch: branchName(item),
    today: rupees(
      item.performance?.collectionTodayPaise ??
        item.performance?.collectionThisMonth ??
        item.today,
    ),
    sessions: Number(item.activeSessions ?? item.sessions ?? 0),
    lastSeen:
      dateTime(item.lastLoginAt ?? item.lastSeenAt) || item.lastSeen || "—",
    status: item.status ?? "ACTIVE",
  }));
  const meta = contractMeta(raw);
  return {
    items,
    page: mergePageMeta(meta ?? raw, { total: meta?.total ?? items.length }),
  };
}

export function adaptSettingsProfile(raw: unknown): Record<string, unknown> {
  const data = (contractPayload(raw) ?? raw) as Record<string, unknown>;
  if (data.businessName != null) return data;
  return {
    businessName: data.name ?? "",
    displayName: data.displayName ?? data.name ?? "",
    ownerName: data.ownerName ?? "",
    ownerMobile: data.ownerMobile ?? data.mobile ?? "",
    ownerEmail: data.ownerEmail ?? data.email ?? "",
    address: data.address ?? null,
    supportNumber: data.supportNumber ?? data.mobile ?? "",
    gstin: data.gstin ?? null,
    tenantCode: data.tenantCode ?? data.code ?? "",
    audit: data.audit ?? { version: data.version ?? 1 },
  };
}

export function adaptSettingsBranding(raw: unknown): Record<string, unknown> {
  const data = (contractPayload(raw) ?? raw) as Record<string, unknown>;
  const branding = (data.branding ?? data) as Record<string, unknown>;
  if (data.appDisplayName != null || data.primaryColor != null) {
    return {
      ...data,
      secondaryColor: data.secondaryColor ?? branding.accentColor ?? "#C9A227",
      appDisplayName: data.appDisplayName ?? branding.displayName ?? "",
    };
  }
  return {
    logoUrl: branding.logoUploadId
      ? String(branding.logoUploadId)
      : data.logoUrl,
    primaryColor: branding.primaryColor ?? "#730321",
    secondaryColor: branding.accentColor ?? "#C9A227",
    appDisplayName: branding.displayName ?? "",
    previewUrls: data.previewUrls,
    audit: data.audit ?? { version: data.version ?? 1 },
  };
}

export function adaptSettingsOperations(raw: unknown): Record<string, unknown> {
  const data = (contractPayload(raw) ?? raw) as Record<string, unknown>;
  if (data.multiSchemePerCustomer != null) return data;
  const settings = (data.settings ?? {}) as Record<string, unknown>;
  const ops = (data.operations ?? {}) as Record<string, unknown>;
  return {
    multiSchemePerCustomer:
      ops.multiSchemePerCustomer ??
      !Boolean(settings.oneActiveSchemePerCustomer),
    kycMandatory: ops.kycMandatory ?? Boolean(settings.requireKycForEnrolment),
    kycAllowedTypes: ops.kycAllowedTypes ?? ["AADHAAR", "PAN"],
    customerSelfEnrolEnabled: ops.customerSelfEnrolEnabled ?? true,
    customerSelfRegistrationEnabled:
      ops.customerSelfRegistrationEnabled ?? true,
    customerLoginMode: ops.customerLoginMode ?? "OTP_ONLY",
    customerAppWriteEnabled: ops.customerAppWriteEnabled ?? true,
    customerAppPaymentsEnabled:
      (ops.customerAppWriteEnabled ?? true) &&
      (ops.customerAppPaymentsEnabled ?? true),
    agentCanRegisterCustomers: ops.agentCanRegisterCustomers === true,
    agentCanEnrolSchemes: ops.agentCanEnrolSchemes === true,
    receiptPrefix: ops.receiptPrefix ?? "",
    receiptNumberFormat: ops.receiptNumberFormat ?? "",
    passbookNumberFormat: ops.passbookNumberFormat ?? "",
    schemeNumberFormat: ops.schemeNumberFormat ?? "",
    goldPurity: ops.goldPurity ?? "22K",
    weightRoundingMode: ops.weightRoundingMode ?? "HALF_UP",
    paymentReversalWindowHours: ops.paymentReversalWindowHours ?? 48,
    redemptionApprovalRequired: ops.redemptionApprovalRequired ?? true,
    termsAndConditions: ops.termsAndConditions ?? "",
    ecommerceEnabled:
      data.ecommerceEnabled === true || ops.ecommerceEnabled === true,
    ecommerce: (data.ecommerce as Record<string, unknown> | undefined) ??
      (ops.ecommerce as Record<string, unknown> | undefined) ?? {
        planEntitled: false,
        enabled: false,
        active: false,
      },
    audit: data.audit ?? { version: data.version ?? 1 },
  };
}

export function adaptSubscriptionInvoice(
  row: unknown,
): Record<string, unknown> {
  const inv = (row ?? {}) as Record<string, unknown>;
  const amountRaw = inv.amount as Record<string, unknown> | undefined;
  return {
    id: entityId(inv),
    number: inv.invoiceNumber ?? inv.number ?? inv.reference ?? entityId(inv),
    periodLabel: inv.periodLabel ?? inv.dueDate ?? "—",
    amount:
      amountRaw?.amountDisplay != null
        ? amountRaw
        : inv.amountPaise != null
          ? {
              amountPaise: inv.amountPaise,
              amountDisplay: `₹${(Number(inv.amountPaise) / 100).toLocaleString("en-IN")}`,
            }
          : undefined,
    status: inv.status ?? "ISSUED",
    paidAt: inv.paidAt ?? null,
    dueDate: inv.dueDate ?? null,
    createdAt: inv.createdAt ?? null,
  };
}

export function adaptSubscriptionInvoices(
  raw: unknown,
): Record<string, unknown>[] {
  const payload = contractPayload(raw);
  if (Array.isArray(payload)) {
    return payload.map((row) => adaptSubscriptionInvoice(row));
  }
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { items?: unknown[] }).items)
  ) {
    return (payload as { items: unknown[] }).items.map((row) =>
      adaptSubscriptionInvoice(row),
    );
  }
  return [];
}

export function adaptSubscription(raw: unknown): Record<string, unknown> {
  const data = (contractPayload(raw) ?? raw) as Record<string, unknown>;
  if (data.currentPlan && data.usage) {
    return {
      ...data,
      ecommerce:
        data.ecommerce ??
        ({
          planEntitled: false,
          enabled: false,
          active: false,
        } as const),
    };
  }
  const sub = (data.subscription ?? data) as Record<string, unknown>;
  const limits = (sub.limits ?? {}) as Record<string, number>;
  const tier = String(sub.tier ?? "STARTER");
  return {
    currentPlan: {
      tier,
      name: tier,
      monthlyPrice: sub.monthlyPrice ?? { amountDisplay: "—" },
      billingCycle: sub.billingCycle ?? "MONTHLY",
    },
    status: sub.status ?? "ACTIVE",
    daysRemaining: sub.daysRemaining ?? 0,
    renewsAutomatically: sub.renewsAutomatically ?? false,
    usage: {
      activeCustomers: {
        used: 0,
        limit: limits.activeCustomers ?? 0,
        percent: 0,
        status: "OK",
      },
      branches: {
        used: 0,
        limit: limits.branches ?? 0,
        percent: 0,
        status: "OK",
      },
      staffSeats: {
        used: 0,
        limit: limits.staff ?? 0,
        percent: 0,
        status: "OK",
      },
      schemePlans: {
        used: 0,
        limit: limits.schemePlans ?? 0,
        percent: 0,
        status: "OK",
      },
    },
    features: data.features ?? {},
  };
}

export function adaptBranchDetail(raw: unknown): Record<string, unknown> {
  const data = (contractPayload(raw) ?? raw) as Record<string, unknown>;
  const addressRaw = data.address;
  let address: Record<string, string | null> | null = null;
  if (
    addressRaw &&
    typeof addressRaw === "object" &&
    !Array.isArray(addressRaw)
  ) {
    const a = addressRaw as Record<string, unknown>;
    address = {
      line1: a.line1 != null ? String(a.line1) : null,
      city: a.city != null ? String(a.city) : null,
      pincode: a.pincode != null ? String(a.pincode) : null,
    };
  } else if (typeof addressRaw === "string" && addressRaw.trim()) {
    address = { line1: addressRaw.trim(), city: null, pincode: null };
  }
  const contact = data.contactNumber ?? data.mobile ?? null;
  return {
    ...data,
    id: entityId(data),
    address,
    contactNumber: contact != null ? String(contact) : null,
    status: data.status ?? (data.active === false ? "INACTIVE" : "ACTIVE"),
  };
}

export function adaptBranchList(raw: any): {
  items: {
    id: string;
    name: string;
    code: string;
    city: string;
    staff: number;
    customers: number;
    status: string;
  }[];
  page: ListPageMeta;
} {
  if (
    Array.isArray(raw?.items) &&
    hasListPagination(raw) &&
    (raw.items.length === 0 ||
      (raw.items[0]?.code &&
        typeof raw.items[0]?.city === "string" &&
        typeof raw.items[0]?.staff === "number"))
  ) {
    return {
      items: raw.items,
      page: mergePageMeta(raw),
    };
  }
  const list = listArrayFromRaw(raw);
  const items = list.map((item) => {
    const cityFromAddress =
      typeof item.address === "string"
        ? item.address
        : (item.address?.city ?? item.city);
    return {
      id: entityId(item),
      name: item.name,
      code: item.code,
      city:
        cityFromAddress && String(cityFromAddress).trim()
          ? String(cityFromAddress)
          : "—",
      staff: item.stats?.staffCount ?? item.staff ?? 0,
      customers: item.stats?.activeCustomers ?? item.customers ?? 0,
      status: item.active === false ? "INACTIVE" : (item.status ?? "ACTIVE"),
    };
  });
  const meta = contractMeta(raw);
  return {
    items,
    page: mergePageMeta(meta ?? raw, { total: meta?.total ?? items.length }),
  };
}

function formatGrievanceSla(g: any) {
  if (typeof g.sla === "string") return g.sla;
  if (g.sla?.firstResponseOverdue) return "Overdue";
  if (g.sla?.firstRespondedAt) return "First response met";
  if (g.firstResponseOverdue) return "Overdue";
  if (g.firstResponseDueAt) return "Active";
  return "—";
}

export function adaptGrievanceRow(
  g: any,
): import("@/src/types/domain").Grievance {
  return {
    id: entityId(g),
    ticketNo: g.ticketNumber ?? g.ticketNo ?? "",
    customerId: String(
      entityId(g.customer) || g.customerId || g.customer?._id || "",
    ),
    customer:
      typeof g.customer === "object"
        ? (g.customer?.name ?? "")
        : String(g.customer ?? ""),
    subject: g.subject ?? "",
    category: g.categoryLabel ?? g.category ?? "",
    priority: (g.priority === "MEDIUM"
      ? "NORMAL"
      : (g.priority ??
        "NORMAL")) as import("@/src/types/domain").Grievance["priority"],
    status: ((g.status === "WAITING_FOR_CUSTOMER"
      ? "WAITING_CUSTOMER"
      : g.status) ??
      "OPEN") as import("@/src/types/domain").Grievance["status"],
    assignee:
      typeof g.assignee === "object"
        ? (g.assignee?.name ?? "Unassigned")
        : String(g.assignee ?? "Unassigned"),
    createdAt: g.createdAt ?? "",
    sla: formatGrievanceSla(g),
    version: g.version,
  };
}

function adaptGrievanceSummary(summaryRaw: any, list: any[]) {
  if (!summaryRaw) {
    const openStatuses = [
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_CUSTOMER",
      "WAITING_CUSTOMER",
    ];
    return {
      open: list.filter((g: any) => openStatuses.includes(g.status)).length,
      inProgress: list.filter((g: any) => g.status === "IN_PROGRESS").length,
      waitingForCustomer: list.filter((g: any) =>
        ["WAITING_FOR_CUSTOMER", "WAITING_CUSTOMER"].includes(g.status),
      ).length,
      urgent: list.filter((g: any) => g.priority === "URGENT").length,
      overdue: list.filter(
        (g: any) => g.firstResponseOverdue || g.sla?.firstResponseOverdue,
      ).length,
      resolvedToday: 0,
    };
  }
  const openActive =
    (summaryRaw.open ?? 0) +
    (summaryRaw.inProgress ?? 0) +
    (summaryRaw.waitingForCustomer ?? 0);
  return {
    open: summaryRaw.open ?? summaryRaw.openRequests ?? openActive,
    inProgress: summaryRaw.inProgress ?? 0,
    waitingForCustomer: summaryRaw.waitingForCustomer ?? 0,
    urgent:
      summaryRaw.urgent ??
      list.filter((g: any) => g.priority === "URGENT").length,
    overdue: summaryRaw.overdue ?? summaryRaw.overdueFirstResponse ?? 0,
    resolvedToday: summaryRaw.resolvedToday ?? 0,
  };
}

export function adaptGrievanceList(raw: any) {
  if (
    Array.isArray(raw?.items) &&
    raw.items[0]?.ticketNo &&
    !raw.items[0]?.ticketNumber &&
    hasListPagination(raw)
  ) {
    return {
      items: raw.items as import("@/src/types/domain").Grievance[],
      summary: raw.summary ?? adaptGrievanceSummary(undefined, raw.items),
      page: mergePageMeta(raw),
    };
  }
  const list = raw?.items ?? contractPayload<any[]>(raw) ?? [];
  const meta = contractMeta(raw);
  const summaryRaw = meta?.summary ?? raw?.summary;
  return {
    items: list.map(adaptGrievanceRow),
    summary: adaptGrievanceSummary(summaryRaw, list),
    page: mergePageMeta(meta ?? raw, {
      limit: meta?.limit,
      hasMore: meta?.hasMore,
      nextCursor: meta?.nextCursor ?? null,
      total: typeof meta?.total === "number" ? meta.total : undefined,
    }),
  };
}

export function adaptGrievanceDetail(
  raw: any,
): import("@/src/types/domain").GrievanceDetail {
  if (raw?.messages && raw?.ticketNo) return raw;
  const data = contractPayload<any>(raw) ?? raw;
  const base = adaptGrievanceRow(data);
  const messages = (data.messages ?? []).map((m: any) => ({
    id: entityId(m),
    messageType: m.messageType,
    body: m.body,
    authorName: m.author?.name ?? "Unknown",
    authorType: (m.author?.actorType === "SYSTEM"
      ? "SYSTEM"
      : m.messageType === "CUSTOMER_MESSAGE" ||
          m.author?.actorType === "CUSTOMER"
        ? "CUSTOMER"
        : "USER") as import("@/src/types/domain").GrievanceMessage["authorType"],
    createdAt: m.createdAt,
  }));
  return {
    ...base,
    description: data.description ?? "",
    customerMobile: data.customer?.mobile,
    branchName: data.branch?.name,
    relatedEntityLabel: data.relatedEntity?.displayLabel,
    relatedEntityPath: data.relatedEntity?.path,
    slaDueAt: data.sla?.firstResponseDueAt ?? data.firstResponseDueAt,
    slaFirstRespondedAt: data.sla?.firstRespondedAt ?? data.firstRespondedAt,
    slaOverdue: Boolean(
      data.sla?.firstResponseOverdue ?? data.firstResponseOverdue,
    ),
    messages,
    version: data.version ?? base.version ?? 1,
  };
}

export function adaptCustomerResourceList<T>(
  raw: any,
  mapItems: (raw: any) => T[],
) {
  const items = mapItems(raw);
  const meta = contractMeta(raw);
  return {
    items,
    page: mergePageMeta(meta ?? raw, { total: meta?.total ?? items.length }),
  };
}

export function adaptPortalAlerts(raw: any): PortalAlert[] {
  const list = Array.isArray(raw) ? raw : (contractPayload<any[]>(raw) ?? []);
  const severityMap: Record<string, PortalAlert["severity"]> = {
    CRITICAL: "HIGH",
    WARNING: "MEDIUM",
    INFO: "INFO",
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
  };
  const actionPathForType = (type?: string) => {
    if (type === "MISSING_GOLD_RATE") return "/gold-rates";
    return "/";
  };
  return list.map((a: any, index: number) => {
    const key = a.key ?? a.type ?? "UNKNOWN";
    const rawSeverity = String(a.severity ?? "MEDIUM").toUpperCase();
    const severity =
      severityMap[rawSeverity] ??
      (["HIGH", "MEDIUM", "LOW", "INFO"].includes(rawSeverity)
        ? (rawSeverity as PortalAlert["severity"])
        : "MEDIUM");
    return {
      id: entityId(a) || `alt_${key}_${index}`,
      severity,
      key,
      title: a.title ?? a.type ?? "Alert",
      message: a.message ?? a.detail ?? "",
      actionLabel: a.actionLabel,
      actionPath: a.actionPath ?? actionPathForType(a.type ?? a.key),
      dismissible:
        typeof a.dismissible === "boolean"
          ? a.dismissible
          : a.status != null
            ? a.status === "OPEN"
            : true,
      count: a.count,
      createdAt: a.createdAt,
    };
  });
}

export type DashboardWidget = {
  key: string;
  label: string;
  displayValue: string;
  secondaryLabel?: string;
  actionPath?: string;
  severity?: string;
  valueType?: string;
  /** "kpi" = headline numbers; "attention" = queues someone should clear. */
  group?: "kpi" | "attention";
  /** Raw count/amount, used to quiet attention cards that are at zero. */
  rawValue?: number;
};

const DEFAULT_DASHBOARD_CHARTS = [
  "collection-trend",
  "collection-by-mode",
  "scheme-status-distribution",
] as const;

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash in hand",
  CARD: "Card",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  ONLINE_GATEWAY: "Online",
  LEGACY_ONLINE: "Online (legacy)",
};

const DASHBOARD_CHART_META: Record<
  string,
  {
    chartType: string;
    title: string;
    yAxis: { type: "currency" | "count" | "weight" | "percent"; label: string };
    seriesKey: string;
    seriesName: string;
  }
> = {
  "collection-trend": {
    chartType: "line",
    title: "Collection trend",
    yAxis: { type: "currency", label: "Amount" },
    seriesKey: "COLLECTED",
    seriesName: "Collected",
  },
  "collection-by-mode": {
    chartType: "donut",
    title: "By payment mode",
    yAxis: { type: "currency", label: "Amount" },
    seriesKey: "MODE",
    seriesName: "Amount",
  },
  "collection-by-branch": {
    chartType: "horizontalBar",
    title: "Collection by branch",
    yAxis: { type: "currency", label: "Amount" },
    seriesKey: "BRANCH",
    seriesName: "Collected",
  },
  "scheme-status-distribution": {
    chartType: "donut",
    title: "Scheme status (current portfolio)",
    yAxis: { type: "count", label: "Schemes" },
    seriesKey: "STATUS",
    seriesName: "Schemes",
  },
  "gold-accrual-trend": {
    chartType: "line",
    title: "Gold accrual",
    yAxis: { type: "weight", label: "Weight" },
    seriesKey: "GOLD",
    seriesName: "Gold",
  },
};

function formatDashboardWidgetValue(value: unknown, valueType?: string) {
  if (valueType === "currency") {
    if (typeof value === "number") return money(value);
    if (value && typeof value === "object") {
      const v = value as { amountDisplay?: string; amountPaise?: number };
      return v.amountDisplay ?? money(rupees(v));
    }
  }
  if (valueType === "weight" && value && typeof value === "object") {
    return (
      (value as { weightDisplay?: string }).weightDisplay ??
      `${((value as { weightMg?: number }).weightMg ?? 0) / 1000} g`
    );
  }
  if (valueType === "percent") return `${value}%`;
  if (typeof value === "number") return String(value);
  return String(value ?? "—");
}

/** Convert live dashboard chart payloads (paise/count arrays) into ChartSeriesBlock. */
export function adaptDashboardChart(
  chartKey: string,
  raw: any,
): import("@/src/types/admin-report").ChartSeriesBlock {
  const payload = contractPayload<any>(raw);
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    payload.chartType &&
    Array.isArray(payload.series)
  ) {
    return payload as import("@/src/types/admin-report").ChartSeriesBlock;
  }

  const meta = DASHBOARD_CHART_META[chartKey] ?? {
    chartType: "bar",
    title: chartKey.replace(/-/g, " "),
    yAxis: { type: "currency" as const, label: "Amount" },
    seriesKey: "VALUE",
    seriesName: "Value",
  };

  const rows: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.points)
      ? payload.points
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  const yAxisType = meta.yAxis.type;
  const data = rows.map((row: any) => {
    const rawKey = String(row.label ?? row.key ?? row.x ?? row._id ?? "");
    const x =
      chartKey === "collection-by-mode"
        ? (PAYMENT_MODE_LABELS[rawKey] ?? rawKey)
        : rawKey;
    const y = Number(row.y ?? row.value ?? row.amountPaise ?? row.count ?? 0);
    const yDisplay =
      yAxisType === "count"
        ? String(y)
        : yAxisType === "weight"
          ? `${(y / 1000).toFixed(3)} g`
          : yAxisType === "percent"
            ? `${y}%`
            : money(y / 100);
    return {
      x: x || "—",
      y,
      yDisplay,
      ...(chartKey === "collection-by-mode" ? { modeKey: rawKey } : {}),
    };
  });

  return {
    chartType: meta.chartType,
    title: meta.title,
    yAxis: meta.yAxis,
    series: [
      {
        key: meta.seriesKey,
        name: meta.seriesName,
        data,
      },
    ],
  };
}

function adaptDashboardAttentionRows(summary: any, extrasAttention?: any[]) {
  if (Array.isArray(extrasAttention) && extrasAttention.length) {
    return extrasAttention;
  }
  if (Array.isArray(summary?.attentionItems)) return summary.attentionItems;
  if (Array.isArray(summary?.attention)) return summary.attention;

  const attention = summary?.attention;
  if (!attention || typeof attention !== "object") return [];

  // The live summary only carries counts — those render as attention cards
  // (see adaptDashboard), so no synthetic ₹0 / "—" table rows are produced.
  if (summary?.today != null && summary?.schemes != null) return [];
  const rows: any[] = [];
  const cash = Number(attention.pendingCashHandovers ?? 0);
  if (cash > 0) {
    rows.push({
      priority: "HIGH",
      item: "Pending cash handovers",
      customer: "Cash desk",
      amount: 0,
      age: "—",
      status: `${cash} pending`,
      actionPath: "/cash-control",
      actionLabel: "Review",
    });
  }
  const grievances = Number(attention.openGrievances ?? 0);
  if (grievances > 0) {
    rows.push({
      priority: "MEDIUM",
      item: "Open grievances",
      customer: "Support",
      amount: 0,
      age: "—",
      status: `${grievances} open`,
      actionPath: "/support",
      actionLabel: "Open",
    });
  }
  const overdue = Number(summary?.schemes?.overdue ?? 0);
  if (overdue > 0) {
    rows.push({
      priority: "HIGH",
      item: "Overdue schemes",
      customer: "Collections",
      amount: 0,
      age: "—",
      status: `${overdue} schemes`,
      actionPath: "/dues",
      actionLabel: "Collect",
    });
  }
  return rows;
}

export function adaptDashboard(
  summaryRaw: any,
  trendRaw?: any,
  modeRaw?: any,
  extras?: {
    attention?: any[];
    charts?: Record<
      string,
      import("@/src/types/admin-report").ChartSeriesBlock
    >;
    defaultCharts?: string[];
  },
) {
  if (
    summaryRaw?.stats &&
    !summaryRaw?.widgets &&
    !summaryRaw?.widgetsFormatted
  )
    return summaryRaw;
  const summary = contractPayload<any>(summaryRaw) ?? {};
  const backendSummaryShape =
    summary?.today != null &&
    summary?.customers != null &&
    summary?.schemes != null &&
    summary?.attention != null &&
    !Array.isArray(summary?.widgets) &&
    !summary?.widgetsFormatted;

  let widgets: DashboardWidget[] = (summary.widgets ?? []).map((w: any) => ({
    key: w.key,
    label: w.label,
    displayValue: formatDashboardWidgetValue(w.value, w.valueType),
    secondaryLabel: w.secondary?.label
      ? `${w.secondary.label}${
          w.secondary.value != null &&
          !String(w.secondary.label).includes(String(w.secondary.value))
            ? `: ${typeof w.secondary.value === "object" ? formatDashboardWidgetValue(w.secondary.value, "currency") : w.secondary.value}`
            : ""
        }`
      : undefined,
    actionPath: w.actionPath,
    severity: w.severity,
    valueType: w.valueType,
  }));

  if (backendSummaryShape && widgets.length === 0) {
    // Each card states exactly what GET /admin/dashboard/summary counts
    // (backend/src/services/reporting.service.js#dashboard).
    const attention = summary.attention ?? {};
    const plural = (n: number, one: string, many = `${one}s`) =>
      `${n} ${n === 1 ? one : many}`;
    const periodLabel = String(summary.period?.label ?? "This month");
    const pc = summary.periodCollection;
    const todayCount = Number(summary.today?.count ?? 0);
    const count = (v: unknown) => Number(v ?? 0);
    widgets = [
      ...(pc
        ? [
            {
              key: "PERIOD_COLLECTION",
              label: `Collected · ${periodLabel}`,
              displayValue: money((pc.amountPaise ?? 0) / 100),
              secondaryLabel:
                (pc.refundOutflowPaise ?? 0) > 0
                  ? `${plural(count(pc.count), "payment")} · net of ${money(pc.refundOutflowPaise / 100)} refunds`
                  : `${plural(count(pc.count), "payment")} · net of refunds`,
              valueType: "currency",
              actionPath: "/collections",
              group: "kpi" as const,
              rawValue: (pc.amountPaise ?? 0) / 100,
            },
          ]
        : []),
      {
        key: "COLLECTION",
        label: "Collected today",
        displayValue: money((summary.today?.amountPaise ?? 0) / 100),
        secondaryLabel: `${plural(todayCount, "payment")} today`,
        valueType: "currency",
        actionPath: "/collections",
        group: "kpi",
        rawValue: (summary.today?.amountPaise ?? 0) / 100,
      },
      {
        key: "ACTIVE_CUSTOMERS",
        label: "Active customers",
        displayValue: String(count(summary.customers?.active)),
        secondaryLabel: "Accounts marked active",
        actionPath: "/customers",
        group: "kpi",
        rawValue: count(summary.customers?.active),
      },
      {
        key: "ACTIVE_SCHEMES",
        label: "Open enrollments",
        displayValue: String(
          adaptEnrollmentStatusBreakdown(summary.schemes?.statusBreakdown)
            ?.open ?? count(summary.schemes?.open ?? summary.schemes?.active),
        ),
        secondaryLabel: (() => {
          const b = adaptEnrollmentStatusBreakdown(
            summary.schemes?.statusBreakdown,
          );
          if (b) {
            return `${b.activePaying} paying · ${b.planCapped} capped · ${b.defaulted} defaulted`;
          }
          return "Paying, capped, or defaulted";
        })(),
        actionPath: "/enrollments",
        group: "kpi",
        rawValue:
          adaptEnrollmentStatusBreakdown(summary.schemes?.statusBreakdown)
            ?.open ?? count(summary.schemes?.open ?? summary.schemes?.active),
      },
      {
        key: "OVERDUE",
        label: "Overdue enrollments",
        displayValue: String(count(summary.schemes?.overdue)),
        secondaryLabel: "Grace period ended, instalment unpaid",
        actionPath: "/dues",
        severity: count(summary.schemes?.overdue) > 0 ? "WARNING" : undefined,
        group: "attention",
        rawValue: count(summary.schemes?.overdue),
      },
      {
        key: "MATURING_THIS_MONTH",
        label: "Matured, not redeemed",
        displayValue: String(count(summary.schemes?.matured)),
        secondaryLabel: "Ready to hand over",
        actionPath: "/maturity",
        group: "attention",
        rawValue: count(summary.schemes?.matured),
      },
      {
        key: "OPEN_REDEMPTIONS",
        label: "Redemption requests",
        displayValue: String(count(attention.openRedemptions)),
        secondaryLabel: "Requested or approved, not yet settled",
        actionPath: "/maturity",
        group: "attention",
        rawValue: count(attention.openRedemptions),
      },
      {
        key: "PENDING_CASH",
        label: "Cash handovers to accept",
        displayValue: String(count(attention.pendingCashHandovers)),
        secondaryLabel: "Submitted by collectors",
        actionPath: "/cash-control",
        group: "attention",
        rawValue: count(attention.pendingCashHandovers),
      },
      {
        key: "OPEN_GRIEVANCES",
        label: "Open support tickets",
        displayValue: String(count(attention.openGrievances)),
        secondaryLabel: "Open or in progress",
        actionPath: "/support",
        group: "attention",
        rawValue: count(attention.openGrievances),
      },
    ];
  }

  const value = (key: string) => {
    const v = summary.widgets?.find((x: any) => x.key === key)?.value;
    if (v != null) return typeof v === "number" ? v : rupees(v);
    if (backendSummaryShape) {
      switch (key) {
        case "COLLECTION":
          return (summary.today?.amountPaise ?? 0) / 100;
        case "ACTIVE_CUSTOMERS":
          return Number(summary.customers?.active ?? 0);
        case "ACTIVE_SCHEMES":
          return Number(summary.schemes?.open ?? summary.schemes?.active ?? 0);
        case "OVERDUE":
          return Number(summary.schemes?.overdue ?? 0);
        case "MATURING_THIS_MONTH":
          return Number(summary.schemes?.matured ?? 0);
        case "PENDING_CASH":
          return Number(summary.attention?.pendingCashHandovers ?? 0);
        case "OPEN_GRIEVANCES":
          return Number(summary.attention?.openGrievances ?? 0);
        case "OPEN_REDEMPTIONS":
          return Number(summary.attention?.openRedemptions ?? 0);
        default:
          return 0;
      }
    }
    return 0;
  };

  const adaptedCharts: Record<
    string,
    import("@/src/types/admin-report").ChartSeriesBlock
  > = {};
  for (const [key, chart] of Object.entries(extras?.charts ?? {})) {
    adaptedCharts[key] = adaptDashboardChart(key, chart);
  }
  if (!adaptedCharts["collection-trend"] && trendRaw) {
    adaptedCharts["collection-trend"] = adaptDashboardChart(
      "collection-trend",
      trendRaw,
    );
  }
  if (!adaptedCharts["collection-by-mode"] && modeRaw) {
    adaptedCharts["collection-by-mode"] = adaptDashboardChart(
      "collection-by-mode",
      modeRaw,
    );
  }

  const chartRows = (
    block?: import("@/src/types/admin-report").ChartSeriesBlock,
  ) => {
    const series = block?.series ?? [];
    if (!series.length) return [];
    const points = new Map<string, any>();
    const divisor =
      block?.yAxis?.type === "currency" || !block?.yAxis?.type ? 100 : 1;
    series.forEach((s) =>
      s.data?.forEach((p) =>
        points.set(p.x, {
          ...(points.get(p.x) ?? { day: p.x }),
          [s.key]: Number(p.y) / divisor,
        }),
      ),
    );
    return [...points.values()];
  };

  const trendBlock = adaptedCharts["collection-trend"];
  const modeBlock = adaptedCharts["collection-by-mode"];
  const trend = chartRows(trendBlock);
  const modePoints = modeBlock?.series?.[0]?.data ?? [];
  const modeDivisor =
    modeBlock?.yAxis?.type === "currency" || !modeBlock?.yAxis?.type ? 100 : 1;
  const total = modePoints.reduce((sum, p) => sum + Number(p.y), 0) || 1;

  const defaultCharts = extras?.defaultCharts?.length
    ? extras.defaultCharts
    : summary.defaultCharts?.length
      ? summary.defaultCharts
      : [...DEFAULT_DASHBOARD_CHARTS];

  return {
    widgets,
    defaultCharts,
    charts: adaptedCharts,
    stats: {
      todayCollection: value("COLLECTION"),
      dueToday: value("DUE_TODAY"),
      overdue: value("OVERDUE"),
      upcomingMaturities: value("MATURING_THIS_MONTH"),
      redemptions: value("PENDING_APPROVALS"),
      customers: value("ACTIVE_CUSTOMERS"),
    },
    collectionTrend: trend.map((p: any) => {
      const hasCashDigitalSplit =
        p.CASH != null ||
        p.DIGITAL != null ||
        p.cash != null ||
        p.digital != null;
      if (hasCashDigitalSplit) {
        return {
          day: p.day,
          cash: Number(p.CASH ?? p.cash ?? 0),
          digital: Number(p.DIGITAL ?? p.digital ?? 0),
        };
      }
      const legacyTotal = Number(p.COLLECTED ?? 0);
      return { day: p.day, cash: legacyTotal, digital: 0 };
    }),
    collectionByMode: modePoints.map((p) => {
      const amount = Number(p.y) / modeDivisor;
      return {
        name: p.x,
        value: amount,
        sharePercent: Math.round((Number(p.y) / total) * 100),
        amount,
      };
    }),
    attention: adaptDashboardAttentionRows(summary, extras?.attention),
    alerts: adaptPortalAlerts(summary.alerts),
    goldRate: summary.goldRate
      ? ({
          isSetForToday: summary.goldRate.isSetForToday !== false,
          ratePerGram: rupees(summary.goldRate.ratePerGram),
          changeDisplay: summary.goldRate.change?.amountDisplay,
          asOf: summary.goldRate.asOf,
          warning: summary.goldRate.warning,
        } satisfies DashboardGoldRate)
      : null,
    scope: summary.scope ?? { label: "All showrooms" },
    period: summary.period ?? { label: "This month" },
    enrollmentStatus:
      adaptEnrollmentStatusBreakdown(summary.schemes?.statusBreakdown) ??
      undefined,
    redemptionFulfillment: summary.redemptions
      ? {
          count: Number(summary.redemptions.count ?? 0),
          totalSettled: fromPaise(summary.redemptions.settlementPaise ?? 0),
          cashHandedOut: fromPaise(
            summary.redemptions.cashSettlementPaise ?? 0,
          ),
          benefitPaid: fromPaise(summary.redemptions.benefitPaise ?? 0),
          penaltyCollected: fromPaise(summary.redemptions.penaltyPaise ?? 0),
          goldHandedGrams:
            Number(
              summary.redemptions.goldWeightMg ??
                summary.redemptions.weightMg ??
                0,
            ) / 1000,
          goldHandoverValue: fromPaise(
            summary.redemptions.goldHandoverValuePaise ?? 0,
          ),
          maturityCount: Number(
            summary.redemptions.maturityRedemptions?.count ?? 0,
          ),
          maturityHandedOut:
            summary.redemptions.maturityRedemptions?.settlementPaise != null
              ? fromPaise(
                  summary.redemptions.maturityRedemptions.settlementPaise,
                )
              : undefined,
          purchaseCredit: fromPaise(
            summary.redemptions.purchaseAdjustmentSettlementPaise ?? 0,
          ),
          prematureCount: Number(
            summary.redemptions.prematureClosures?.count ?? 0,
          ),
          prematurePenalty: fromPaise(
            summary.redemptions.prematureClosures?.penaltyPaise ?? 0,
          ),
        }
      : undefined,
  };
}

export const adaptGoldHistory = (
  raw: any,
): {
  current: {
    ratePerGram: number;
    effectiveAt: string;
    branch: string;
    isSetForToday: boolean;
    enteredBy?: string;
  };
  history: {
    id: string;
    effectiveAt: string;
    ratePerGram: number;
    enteredBy: string;
    branch: string;
    movement?: number | null;
  }[];
  page: ListPageMeta;
} => {
  if (raw?.current && raw?.page && Array.isArray(raw?.history)) {
    return {
      current: raw.current,
      history: raw.history as {
        id: string;
        effectiveAt: string;
        ratePerGram: number;
        enteredBy: string;
        branch: string;
        movement?: number | null;
      }[],
      page: mergePageMeta(raw),
    };
  }
  const payload = contractPayload<any>(raw);
  const list = Array.isArray(payload) ? payload : (payload?.items ?? []);
  const history = list.map((x: any, index: number) => {
    const ratePerGram = rupees(x);
    const previous = list[index + 1];
    const previousRate = previous ? rupees(previous) : null;
    const movement = previousRate == null ? null : ratePerGram - previousRate;
    return {
      id: entityId(x),
      effectiveAt: dateTime(
        x.createdAt ?? x.effectiveAt ?? x.asOf ?? x.effectiveDate,
      ),
      effectiveDate: x.effectiveDate ?? null,
      ratePerGram,
      enteredBy:
        typeof x.enteredBy === "string"
          ? x.enteredBy
          : (x.enteredBy?.name ?? "—"),
      branch:
        x.branch?.name ??
        (branchName(x) !== "—" ? branchName(x) : "All branches"),
      movement,
    };
  });
  const istToday = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const latest = history[0];
  const current = {
    ratePerGram: latest?.ratePerGram ?? 0,
    effectiveAt: latest?.effectiveAt ?? "—",
    branch: latest?.branch ?? "All branches",
    isSetForToday: latest?.effectiveDate === istToday,
    enteredBy: latest?.enteredBy,
  };
  const meta = contractMeta(raw);
  return {
    current,
    history,
    page: mergePageMeta(meta ?? raw, { total: meta?.total ?? history.length }),
  };
};

/** Mock lists spread `page` fields at the top level; real API uses `meta` or nested `page`. */
function hasListPagination(raw: any): boolean {
  if (!raw || typeof raw !== "object") return false;
  return (
    raw.page != null ||
    raw.nextCursor !== undefined ||
    raw.hasMore !== undefined ||
    typeof raw.total === "number"
  );
}

function listArrayFromRaw(raw: any): any[] {
  const payload = contractPayload<any>(raw);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.staff)) return raw.staff;
  if (Array.isArray(raw?.branches)) return raw.branches;
  return [];
}

function mapAdaptListItem(item: any): any {
  // Already adapted UI row
  if (
    item?.enrollmentNo &&
    item?.customer != null &&
    typeof item.customer === "string"
  ) {
    return item;
  }
  // Scheme / maturity lean doc from backend
  if (
    item?.maturityDate != null ||
    item?.enrollmentNumber ||
    item?.schemeNumber ||
    item?.installments
  ) {
    const plan = item.plan ?? item.planSnapshot ?? {};
    const installments = Array.isArray(item.installments)
      ? item.installments
      : [];
    const paidFromInstallments = installments.reduce(
      (sum: number, row: any) => sum + Number(row.paidPaise ?? 0),
      0,
    );
    return {
      id: entityId(item),
      enrollmentNo:
        item.schemeNumber ??
        item.enrollmentNumber ??
        item.enrollmentNo ??
        entityId(item),
      customer: customerName(item),
      customerId: String(
        item.customerId ?? item.customer?._id ?? item.customer?.id ?? "",
      ),
      collectionFrequency: item.collectionFrequency,
      collectionBonus: item.collectionBonus,
      oneTimeProgress: item.oneTimeProgress,
      plan:
        (typeof plan === "object" && plan?.name) ||
        item.planName ||
        (typeof item.plan === "string" ? item.plan : "—"),
      branch: branchName(item),
      maturity: date(item.maturityDate ?? item.dates?.maturityDate),
      maturityDate: item.maturityDate ?? item.dates?.maturityDate,
      paid: rupees(
        item.totals?.totalPaid ??
          item.totals?.amountPaidPaise ??
          item.progress?.amountPaid ??
          item.amountPaidPaise ??
          paidFromInstallments,
      ),
      accumulatedGold: mgToGrams(
        item.totals?.goldAccrued ??
          item.totals?.goldWeightMg ??
          item.goldAccrued ??
          item.goldWeightMg,
      ),
      valueBasis: item.valueBasis ?? plan.valueBasis ?? "CASH",
      status: item.status ?? "ACTIVE",
    };
  }
  const customer =
    typeof item?.customer === "object" && item.customer
      ? customerName(item)
      : item?.customer;
  return {
    id: entityId(item),
    ...item,
    ...(customer !== item?.customer ? { customer } : {}),
  };
}

export function adaptListBundle(raw: any): {
  items: any[];
  summary: Record<string, any>;
  page: ListPageMeta;
  total?: number;
} {
  const payload = contractPayload<any>(raw);
  const meta = contractMeta(raw);
  let list: any[] = [];
  if (Array.isArray(payload)) list = payload;
  else if (Array.isArray(payload?.items)) list = payload.items;
  else if (Array.isArray(raw?.items)) list = raw.items;
  else if (Array.isArray(raw)) list = raw;

  const items = list.map(mapAdaptListItem);

  if (
    Array.isArray(raw?.items) &&
    raw?.summary &&
    (raw?.page || hasListPagination(raw))
  ) {
    return {
      items,
      summary: raw.summary,
      page:
        raw.page ?? mergePageMeta(raw, { total: raw.total ?? items.length }),
      total: raw.total ?? items.length,
    };
  }

  const apiSummary = meta?.summary ?? raw?.summary ?? payload?.summary;
  const summary = normalizeMaturitySummaryFromApi(
    apiSummary as Record<string, unknown> | undefined,
    items,
  );

  return {
    items,
    summary,
    total: meta?.total ?? raw?.total ?? items.length,
    page: mergePageMeta(meta ?? raw, {
      total: meta?.total ?? raw?.total ?? items.length,
    }),
  };
}

function globalSearchHref(item: {
  kind: GlobalSearchKind;
  id: string;
  title?: string;
}): string {
  switch (item.kind) {
    case "CUSTOMER":
      return `/customers/${item.id}`;
    case "ENROLLMENT":
      return `/enrollments/${item.id}`;
    case "RECEIPT":
      return `/collections?q=${encodeURIComponent(item.title ?? "")}`;
    case "REDEMPTION":
      return `/maturity?review=${encodeURIComponent(item.id)}`;
    default:
      return "/";
  }
}

export function adaptGlobalSearch(raw: unknown): GlobalSearchResult {
  const payload = contractPayload<any>(raw) ?? {};
  const groups = (Array.isArray(payload.groups) ? payload.groups : []).map(
    (group: any) => ({
      kind: group.kind as GlobalSearchKind,
      label: String(group.label ?? group.kind ?? "Results"),
      items: (Array.isArray(group.items) ? group.items : []).map(
        (item: any): GlobalSearchItem => {
          const kind = item.kind as GlobalSearchKind;
          const id = String(item.id ?? "");
          const title = String(item.title ?? id);
          return {
            id,
            kind,
            title,
            subtitle: item.subtitle ? String(item.subtitle) : undefined,
            meta: item.meta != null ? String(item.meta) : undefined,
            href: globalSearchHref({ kind, id, title }),
          };
        },
      ),
    }),
  );
  return {
    query: String(payload.query ?? ""),
    groups,
  };
}

function daysPastDue(dueDate?: string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
}

function mapDueWorkboardRow(
  scheme: any,
  inst: {
    dueDate?: string;
    amountPaise?: number;
    paidPaise?: number;
    amount?: number;
    status?: string;
    graceEndsAt?: string;
    paymentPattern?: string;
    flexiblePhase?: string;
    targetCycle?: string;
    /** Backend-classified workboard state (DUE | GRACE | OVERDUE | DEFAULTED). */
    state?: string;
    openInstalments?: number;
    openRemainingPaise?: number;
  },
  context: {
    schemeId: string;
    enrollmentNo: string;
    customer: string;
    customerId: string;
    phone: string;
    plan: string;
    branch: string;
    schemeStatus?: string;
  },
) {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const dueDateRaw = String(inst.dueDate ?? "").slice(0, 10);
  const amount =
    ((inst.amountPaise ?? 0) - (inst.paidPaise ?? 0)) / 100 ||
    Number(inst.amount ?? 0);
  let status = String(inst.status ?? "DUE");
  if (inst.state) status = String(inst.state);
  else if (context.schemeStatus === "DEFAULTED") status = "DEFAULTED";
  else if (status === "OVERDUE") status = "OVERDUE";
  else if (
    dueDateRaw &&
    dueDateRaw < today &&
    (!inst.graceEndsAt || String(inst.graceEndsAt).slice(0, 10) >= today) &&
    status !== "OVERDUE"
  ) {
    status = "GRACE";
  } else if (status === "PARTIALLY_PAID") {
    status = "DUE";
  }
  return {
    id: context.schemeId,
    schemeId: context.schemeId,
    customer: context.customer,
    customerId: context.customerId,
    phone: context.phone,
    enrollmentNo: context.enrollmentNo,
    plan: context.plan,
    collectionFrequency: scheme.collectionFrequency,
    branch: context.branch,
    dueDate: date(dueDateRaw) !== "—" ? date(dueDateRaw) : dueDateRaw || "—",
    amount,
    /** Total unpaid across every visible instalment of this enrollment (arrears). */
    totalOpenAmount:
      inst.openRemainingPaise != null ? inst.openRemainingPaise / 100 : amount,
    openInstalments: Number(inst.openInstalments ?? 1),
    overdueDays: daysPastDue(dueDateRaw),
    status,
    paymentPattern: inst.paymentPattern === "FLEXIBLE" ? "FLEXIBLE" : "FIXED",
    flexiblePhase:
      inst.flexiblePhase === "CAPPED"
        ? "CAPPED"
        : inst.flexiblePhase === "FLEXIBLE"
          ? "FLEXIBLE"
          : undefined,
    targetCycle: inst.targetCycle ? String(inst.targetCycle) : undefined,
  };
}

function flattenDueInstallments(schemes: any[]): any[] {
  const rows: any[] = [];
  for (const scheme of schemes) {
    const schemeId = entityId(scheme);
    const enrollmentNo =
      scheme.schemeNumber ??
      scheme.enrollmentNumber ??
      scheme.enrollmentNo ??
      schemeId;
    const customer = scheme.customer?.name ?? scheme.customerName ?? "—";
    const customerId = String(
      scheme.customerId ?? scheme.customer?._id ?? scheme.customer?.id ?? "",
    );
    const phone =
      scheme.customer?.mobile ?? scheme.customer?.phone ?? scheme.phone ?? "—";
    const plan =
      scheme.planSnapshot?.name ?? scheme.plan?.name ?? scheme.planName ?? "—";
    const branch = branchName(scheme);
    const context = {
      schemeId,
      enrollmentNo,
      customer,
      customerId,
      phone,
      plan,
      branch,
      schemeStatus: scheme.status,
    };
    if (scheme.duePreview) {
      const dp = scheme.duePreview;
      rows.push(
        mapDueWorkboardRow(
          scheme,
          {
            dueDate: dp.dueDate,
            amountPaise: dp.amountPaise,
            paidPaise: dp.paidPaise ?? 0,
            status: dp.status,
            state: dp.state,
            openInstalments: dp.openInstalments,
            openRemainingPaise: dp.openRemainingPaise,
            graceEndsAt: dp.graceEndsAt,
            paymentPattern: dp.paymentPattern,
            flexiblePhase: dp.flexiblePhase,
            targetCycle: dp.targetCycle,
          },
          context,
        ),
      );
      continue;
    }
    const installments = Array.isArray(scheme.installments)
      ? scheme.installments
      : [];
    const dueLike = installments.filter((inst: any) =>
      ["DUE", "PARTIALLY_PAID", "OVERDUE", "GRACE"].includes(
        String(inst.status ?? ""),
      ),
    );
    const source = dueLike.length
      ? dueLike
      : scheme.status === "DEFAULTED"
        ? [
            {
              dueDate: scheme.nextDue?.date ?? scheme.maturityDate,
              amountPaise: scheme.installmentAmountPaise ?? 0,
              paidPaise: 0,
              status: "DEFAULTED",
            },
          ]
        : [];

    for (const inst of source) {
      rows.push(mapDueWorkboardRow(scheme, inst, context));
    }
  }
  return rows;
}

function deriveDuesSummary(items: any[]): Record<string, any> {
  const sumStatus = (...statuses: string[]) =>
    items
      .filter((row) => statuses.includes(String(row.status ?? "")))
      .reduce((total, row) => total + Number(row.amount ?? 0), 0);
  const customers = new Set(
    items
      .map((row) => String(row.customerId || row.customer || ""))
      .filter(Boolean),
  );
  return {
    due: sumStatus("DUE", "PARTIALLY_PAID"),
    grace: sumStatus("GRACE"),
    overdue: sumStatus("OVERDUE"),
    defaulted: sumStatus("DEFAULTED"),
    customers: customers.size || items.length,
  };
}

/** Dedicated dues/overdues adapter — never reuse maturity summary mapping. */
export function adaptDueList(raw: any): {
  items: any[];
  summary: Record<string, any>;
  page: ListPageMeta;
  total?: number;
} {
  if (
    Array.isArray(raw?.items) &&
    (raw.items.length === 0 ||
      (raw.items[0]?.dueDate != null && raw.items[0]?.amount != null))
  ) {
    const items = raw.items.map((item: any) => ({
      ...item,
      branch:
        typeof item.branch === "string" && looksLikeOpaqueId(item.branch)
          ? "—"
          : (item.branch ?? branchName(item)),
      customer: item.customer ?? item.customerName ?? "—",
    }));
    const summary = {
      ...deriveDuesSummary(items),
      ...(raw.summary ?? {}),
      due: raw.summary?.due ?? deriveDuesSummary(items).due,
      grace: raw.summary?.grace ?? deriveDuesSummary(items).grace,
      overdue: raw.summary?.overdue ?? deriveDuesSummary(items).overdue,
      defaulted: raw.summary?.defaulted ?? deriveDuesSummary(items).defaulted,
      customers: raw.summary?.customers ?? deriveDuesSummary(items).customers,
    };
    return {
      items,
      summary,
      page:
        raw.page ?? mergePageMeta(raw, { total: raw.total ?? items.length }),
      total: raw.total ?? items.length,
    };
  }

  const payload = contractPayload<any>(raw);
  const meta = contractMeta(raw);
  let list: any[] = [];
  if (Array.isArray(payload)) list = payload;
  else if (Array.isArray(payload?.items)) list = payload.items;
  else if (Array.isArray(raw?.items)) list = raw.items;
  else if (Array.isArray(raw)) list = raw;

  const looksLikeSchemes =
    list.length > 0 &&
    (Array.isArray(list[0]?.installments) ||
      list[0]?.enrollmentNumber != null ||
      list[0]?.schemeNumber != null ||
      list[0]?.paymentPattern != null);

  const items = looksLikeSchemes
    ? flattenDueInstallments(list)
    : list.map((item) => ({
        id: entityId(item) || item.schemeId,
        schemeId: item.schemeId ?? entityId(item),
        customer: item.customer?.name ?? item.customer ?? "—",
        customerId: String(item.customerId ?? item.customer?._id ?? ""),
        phone: item.phone ?? item.customer?.mobile ?? "—",
        enrollmentNo:
          item.enrollmentNo ??
          item.enrollmentNumber ??
          item.schemeNumber ??
          "—",
        plan: item.plan?.name ?? item.plan ?? "—",
        branch: branchName(item),
        dueDate: item.dueDate ?? "—",
        amount:
          typeof item.amount === "number"
            ? item.amount
            : ((item.amountPaise ?? 0) - (item.paidPaise ?? 0)) / 100,
        overdueDays: item.overdueDays ?? daysPastDue(item.dueDate),
        status: item.status ?? "DUE",
      }));

  const derived = deriveDuesSummary(items);
  const summary = {
    ...derived,
    ...(raw?.summary ?? meta?.summary ?? {}),
    due: raw?.summary?.due ?? meta?.summary?.due ?? derived.due,
    grace: raw?.summary?.grace ?? meta?.summary?.grace ?? derived.grace,
    overdue: raw?.summary?.overdue ?? meta?.summary?.overdue ?? derived.overdue,
    defaulted:
      raw?.summary?.defaulted ?? meta?.summary?.defaulted ?? derived.defaulted,
    customers:
      raw?.summary?.customers ?? meta?.summary?.customers ?? derived.customers,
    customersByState:
      raw?.summary?.customersByState ?? meta?.summary?.customersByState,
    total: raw?.summary?.total ?? meta?.summary?.total,
    chart: raw?.summary?.chart ?? meta?.summary?.chart,
  };

  return {
    items,
    summary,
    total: meta?.total ?? raw?.total ?? items.length,
    page: mergePageMeta(meta ?? raw, {
      total: meta?.total ?? raw?.total ?? items.length,
    }),
  };
}

export function adaptMessages(raw: any): {
  items: any[];
  summary: Record<string, any>;
  page: ListPageMeta;
  total?: number;
} {
  if (
    Array.isArray(raw?.items) &&
    (raw.items.length === 0 || raw.items[0]?.date != null)
  ) {
    const items = raw.items.map((item: any) => ({
      ...item,
      customer:
        typeof item.customer === "string" && looksLikeOpaqueId(item.customer)
          ? customerName(item)
          : (item.customer ?? customerName(item)),
    }));
    const derived = messageSummaryFromItems(items);
    return {
      items,
      summary: {
        ...derived,
        ...(raw.summary ?? {}),
        sent: raw.summary?.sent ?? derived.sent,
        delivered: raw.summary?.delivered ?? derived.delivered,
        read: raw.summary?.read ?? derived.read,
        failed: raw.summary?.failed ?? derived.failed,
        queued: raw.summary?.queued ?? derived.queued,
      },
      page:
        raw.page ?? mergePageMeta(raw, { total: raw.total ?? items.length }),
      total: raw.total ?? items.length,
    };
  }

  const payload = contractPayload<any>(raw);
  const meta = contractMeta(raw);
  let list: any[] = [];
  if (Array.isArray(payload)) list = payload;
  else if (Array.isArray(payload?.items)) list = payload.items;
  else if (Array.isArray(raw?.items)) list = raw.items;
  else if (Array.isArray(raw)) list = raw;

  const items = list.map((item) => {
    if (
      item?.date &&
      item?.customer != null &&
      typeof item.customer === "string" &&
      !looksLikeOpaqueId(item.customer)
    ) {
      return item;
    }
    return {
      id: entityId(item),
      date: dateTime(item.createdAt ?? item.sentAt ?? item.date),
      customer: customerName(item),
      customerId: String(
        item.customerId ?? item.customer?._id ?? item.customer?.id ?? "",
      ),
      type: item.type ?? "—",
      channel: item.channel ?? "WHATSAPP",
      status: item.status ?? "QUEUED",
      cost: item.cost ?? 0,
      failure: item.failureMessage ?? item.failure,
    };
  });

  const derived = messageSummaryFromItems(items);
  return {
    items,
    summary: {
      ...derived,
      ...(raw?.summary ?? meta?.summary ?? {}),
      sent: raw?.summary?.sent ?? meta?.summary?.sent ?? derived.sent,
      delivered:
        raw?.summary?.delivered ??
        meta?.summary?.delivered ??
        derived.delivered,
      read: raw?.summary?.read ?? meta?.summary?.read ?? derived.read,
      failed: raw?.summary?.failed ?? meta?.summary?.failed ?? derived.failed,
      queued: raw?.summary?.queued ?? meta?.summary?.queued ?? derived.queued,
    },
    total: meta?.total ?? raw?.total ?? items.length,
    page: mergePageMeta(meta ?? raw, {
      total: meta?.total ?? raw?.total ?? items.length,
    }),
  };
}

function messageSummaryFromItems(items: any[]) {
  const count = (status: string) =>
    items.filter((row) => String(row.status).toUpperCase() === status).length;
  const read = count("READ");
  const failed = count("FAILED");
  const queued = count("QUEUED");
  const sentExplicit = count("SENT");
  const deliveredExplicit = count("DELIVERED");
  const delivered = deliveredExplicit + sentExplicit;
  return {
    sent: sentExplicit + deliveredExplicit + read + failed || items.length,
    delivered,
    read,
    failed,
    queued,
  };
}

function settlementPreviewMetaFields(payload: Record<string, unknown>) {
  const ratePaise = Number(
    payload.valuationRatePerGramPaise ??
      (payload.computation as { valuationRate?: { ratePerGramPaise?: number } })
        ?.valuationRate?.ratePerGramPaise ??
      0,
  );
  const goldMg = Number(payload.goldWeightMg ?? payload.principalWeightMg ?? 0);
  const compGold = (
    payload.computation as { goldWeight?: { weightDisplay?: string } }
  )?.goldWeight?.weightDisplay;
  return {
    cashSettlementBasis:
      (payload.cashSettlementBasis as SettlementPreview["cashSettlementBasis"]) ??
      "GOLD_VALUE",
    paidAmountBenefitTreatment:
      (payload.paidAmountBenefitTreatment as SettlementPreview["paidAmountBenefitTreatment"]) ??
      "EXCLUDE",
    principalPaid: fromPaise(Number(payload.principalPaise ?? 0)),
    includedMonetaryBenefit: fromPaise(
      Number(payload.includedMonetaryBenefitPaise ?? 0),
    ),
    accruedGoldWeightDisplay:
      compGold ?? (goldMg > 0 ? `${(goldMg / 1000).toFixed(3)} g` : undefined),
    valuationRateEffectiveDate: String(
      payload.valuationRateEffectiveDate ?? "",
    ),
    valuationRateDisplay:
      ratePaise > 0
        ? `${new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(ratePaise / 100)} / g`
        : undefined,
    valueBasis:
      parseSettlementValueBasis(
        (payload.scheme as { valueBasis?: unknown })?.valueBasis,
      ) ?? parseSettlementValueBasis(payload.valueBasis),
  };
}

export function adaptSettlementPreview(
  raw: unknown,
  fallbackType: SettlementPreviewType,
): SettlementPreview {
  const payload = contractPayload<any>(raw) ?? {};
  if (
    payload &&
    typeof payload.eligible === "boolean" &&
    Array.isArray(payload.lines) &&
    Array.isArray(payload.allowedModes) &&
    payload.allowedModes.length > 0 &&
    typeof payload.allowedModes[0] === "object" &&
    payload.computation == null
  ) {
    return payload as SettlementPreview;
  }

  const mapLine = (line: any) => ({
    key: String(line.key ?? ""),
    label: String(line.label ?? ""),
    amount: fromPaise(line.amount?.amountPaise ?? line.amount ?? 0),
    sign: (line.sign === "-" ? "-" : "+") as "+" | "-",
    forfeited: line.forfeited,
    forfeitReason: line.forfeitReason,
    weightDisplay: line.weight?.weightDisplay ?? line.weightDisplay,
    note: line.note,
  });

  if (Array.isArray(payload.computation?.lines)) {
    return {
      type: payload.type ?? fallbackType,
      eligible: Boolean(payload.eligible),
      blockers: payload.blockers ?? [],
      scheme: payload.scheme
        ? {
            ...(payload.scheme as Record<string, unknown>),
            valueBasis: parseSettlementValueBasis(
              (payload.scheme as { valueBasis?: unknown }).valueBasis,
            ),
          }
        : payload.scheme,
      customer: payload.customer,
      lines: payload.computation.lines.map(mapLine),
      finalValue: fromPaise(
        payload.computation.finalValue?.amountPaise ??
          payload.computation.finalValue ??
          payload.settlementPaise ??
          0,
      ),
      finalWeightDisplay:
        payload.computation.finalWeight?.weightDisplay ??
        payload.computation.goldWeight?.weightDisplay,
      textBenefits: payload.textBenefits ?? [],
      allowedModes: (payload.allowedModes ?? []).map((m: any) => ({
        mode: m.mode ?? String(m),
        label: m.label ?? m.mode ?? String(m),
        available: m.available !== false,
        note: m.note,
      })),
      modePreviews: payload.modePreviews,
      approvalRequired: Boolean(payload.approvalRequired),
      approvalReason: payload.approvalReason,
      warningText: payload.warningText,
      valuationNote: payload.valuationNote,
      ecommerceSchemeNotes: Array.isArray(payload.ecommerceSchemeNotes)
        ? (payload.ecommerceSchemeNotes as string[])
        : undefined,
      ...settlementPreviewMetaFields(payload),
      handoverValue:
        payload.handoverValuePaise != null
          ? fromPaise(Number(payload.handoverValuePaise))
          : undefined,
      roundingDelta:
        payload.roundingDeltaPaise != null
          ? fromPaise(Number(payload.roundingDeltaPaise))
          : undefined,
    };
  }

  const settlementPaise = Number(payload?.settlementPaise ?? 0);
  const allowedModes = (payload?.allowedModes as string[] | undefined) ?? [];
  const blockers = (payload?.blockers as SettlementPreview["blockers"]) ?? [];
  const principal = fromPaise(payload?.principalPaise ?? settlementPaise);
  const benefit = fromPaise(payload?.benefitPaise ?? 0);
  const penalty = fromPaise(payload?.penaltyPaise ?? 0);
  return {
    eligible: typeof payload?.eligible === "boolean" ? payload.eligible : false,
    type: (payload?.type as SettlementPreviewType) ?? fallbackType,
    finalValue: settlementPaise / 100,
    lines:
      settlementPaise || principal
        ? [
            {
              key: "TOTAL_PAID",
              label: "Total paid",
              amount: principal,
              sign: "+",
            },
            ...(benefit > 0
              ? [
                  {
                    key: "BENEFIT",
                    label: "Benefit",
                    amount: benefit,
                    sign: "+" as const,
                  },
                ]
              : []),
            {
              key: "PENALTY",
              label: "Penalty",
              amount: penalty,
              sign: "-",
            },
          ]
        : [],
    allowedModes: allowedModes.map((m) => ({
      mode: m,
      label: m,
      available: true,
    })),
    blockers,
    textBenefits: [],
    approvalRequired: Boolean(payload?.approvalRequired),
    ...settlementPreviewMetaFields(payload ?? {}),
  };
}

const REDEMPTION_CLOSURE_LABELS: Record<string, string> = {
  MATURITY_REDEMPTION: "Maturity redemption",
  PREMATURE_CLOSURE: "Premature closure",
};

const REDEMPTION_MODE_LABELS: Record<string, string> = {
  CASH: "Cash payout",
  GOLD_HANDOVER: "Take as gold",
  PURCHASE_ADJUSTMENT: "Adjust against purchase",
};

export type RedemptionDetailView = {
  id: string;
  redemptionNumber: string;
  status: string;
  closureType: SettlementPreviewType;
  closureTypeLabel: string;
  mode: string;
  modeLabel: string;
  version: number;
  requestedAt: string;
  approvedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
  branchName?: string;
  requestReason?: string;
  customer: {
    id: string;
    name: string;
    mobile?: string;
    customerNo?: string;
  };
  scheme: {
    id: string;
    enrollmentNumber: string;
    planName?: string;
    maturityDate?: string;
    status?: string;
  };
  settlementPreview: SettlementPreview;
  fulfilment?: {
    cashOut: number;
    goldWeightG?: number;
    handoverValue?: number;
    handoverRatePerGram?: number;
    handoverRateDate?: string;
  };
  handoverOtpActive?: boolean;
  handoverOtpExpiresAt?: string | null;
  handoverOtpFailedAttempts?: number;
  handoverOtpReleasedAt?: string | null;
  handoverOtpMaxAttempts?: number;
};

export function adaptRedemptionDetail(raw: unknown): RedemptionDetailView {
  const item = contractPayload<any>(raw) ?? {};
  const id = entityId(item);
  const closureType = (item.closureType ??
    "PREMATURE_CLOSURE") as SettlementPreviewType;
  const principal = Number(item.principalPaise ?? 0);
  const calculatedBenefit = Number(
    item.calculatedBenefitPaise ?? item.benefitPaise ?? 0,
  );
  const includedBenefit = Number(
    item.includedBenefitPaise ?? item.benefitPaise ?? 0,
  );
  const penalty = Number(item.penaltyPaise ?? 0);
  const settlement = Number(item.settlementPaise ?? 0);
  const lines: SettlementLine[] = [];

  if (principal > 0) {
    lines.push({
      key: "principal",
      label: "Amount paid in",
      amount: fromPaise(principal),
      sign: "+",
    });
  }
  if (includedBenefit > 0) {
    lines.push({
      key: "benefit",
      label: "Benefit included in payout",
      amount: fromPaise(includedBenefit),
      sign: "+",
    });
  } else if (calculatedBenefit > 0) {
    lines.push({
      key: "benefit",
      label: "Eligible benefit (excluded from payout)",
      amount: fromPaise(0),
      sign: "+",
      forfeited: true,
      forfeitReason: `Eligible benefit ${fromPaise(calculatedBenefit)} was not paid in cash.`,
    });
  } else if (
    closureType === "PREMATURE_CLOSURE" &&
    item.modeDetails?.acknowledgeBenefitForfeit
  ) {
    lines.push({
      key: "benefit",
      label: "Benefit",
      amount: 0,
      sign: "+",
      forfeited: true,
      forfeitReason: "Forfeited on premature closure",
    });
  }
  if (penalty > 0) {
    lines.push({
      key: "penalty",
      label: "Premature closure penalty",
      amount: fromPaise(penalty),
      sign: "-",
    });
  }

  const weightMg = Number(item.weightMg ?? 0);
  const finalWeightDisplay =
    weightMg > 0 ? `${(weightMg / 1000).toFixed(3)} g` : undefined;

  const scheme = item.scheme ?? {};
  const branch = item.branch ?? {};
  const reasonRaw = item.modeDetails?.reason;
  const requestReason =
    typeof reasonRaw === "string"
      ? reasonRaw
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
      : undefined;

  const status = String(item.status ?? "REQUESTED");
  const pendingApproval =
    status === "REQUESTED" || status === "PENDING_APPROVAL";
  const mode = String(item.mode ?? "CASH");
  const isCompleted = status === "COMPLETED";
  const handoverRate = Number(item.handoverRatePerGramPaise ?? 0);
  const fulfilment =
    isCompleted && mode === "GOLD_HANDOVER" && weightMg > 0
      ? {
          cashOut: 0,
          goldWeightG: weightMg / 1000,
          handoverValue: fromPaise(
            Number(item.handoverValuePaise ?? settlement),
          ),
          handoverRatePerGram: handoverRate
            ? fromPaise(handoverRate)
            : undefined,
          handoverRateDate: item.handoverRateEffectiveDate
            ? String(item.handoverRateEffectiveDate)
            : undefined,
        }
      : isCompleted
        ? {
            cashOut: fromPaise(
              Number(item.cashOutPaise ?? item.settlementPaise ?? settlement),
            ),
          }
        : undefined;

  return {
    id,
    redemptionNumber: item.redemptionNumber ?? id,
    status,
    closureType,
    closureTypeLabel:
      REDEMPTION_CLOSURE_LABELS[closureType] ?? closureType.replace(/_/g, " "),
    mode,
    modeLabel: REDEMPTION_MODE_LABELS[mode] ?? mode,
    version: Number(item.version ?? 0),
    requestedAt: dateTime(item.requestedAt ?? item.createdAt),
    approvedAt: item.approvedAt ? dateTime(item.approvedAt) : undefined,
    completedAt: item.completedAt ? dateTime(item.completedAt) : undefined,
    rejectionReason: item.rejectionReason,
    branchName: branch.name ? String(branch.name) : undefined,
    requestReason,
    handoverOtpActive: item.handoverOtpActive === true,
    handoverOtpExpiresAt: item.handoverOtpExpiresAt
      ? String(item.handoverOtpExpiresAt)
      : null,
    handoverOtpFailedAttempts: Number(item.handoverOtpFailedAttempts ?? 0),
    handoverOtpReleasedAt: item.handoverOtpReleasedAt
      ? String(item.handoverOtpReleasedAt)
      : null,
    handoverOtpMaxAttempts: Number(item.handoverOtpMaxAttempts ?? 5),
    customer: {
      id: entityId(item.customer) || String(item.customerId ?? ""),
      name: customerName(item),
      mobile: item.customer?.mobile,
      customerNo: item.customer?.customerNumber,
    },
    scheme: {
      id: entityId(scheme) || String(item.schemeId ?? ""),
      enrollmentNumber: scheme.enrollmentNumber ?? scheme.schemeNumber ?? "—",
      planName: scheme.name ?? scheme.planSnapshot?.name,
      maturityDate: scheme.maturityDate,
      status: scheme.status,
    },
    settlementPreview: {
      type: closureType,
      eligible: true,
      blockers: [],
      scheme: {
        schemeNumber: scheme.enrollmentNumber,
        planName: scheme.name ?? scheme.planSnapshot?.name,
        maturityDate: scheme.maturityDate,
      },
      customer: {
        name: customerName(item),
        mobile: item.customer?.mobile,
        passbookNumber: item.customer?.customerNumber,
      },
      lines,
      finalValue: fromPaise(settlement),
      finalWeightDisplay,
      textBenefits: [],
      allowedModes: [],
      approvalRequired: pendingApproval,
      approvalReason: pendingApproval
        ? "Review settlement and customer acknowledgements before approving."
        : undefined,
    },
    fulfilment,
  };
}

export function adaptRedemptionRecord(raw: unknown): RedemptionRecord {
  const item = contractPayload<any>(raw) ?? {};
  return {
    id: entityId(item),
    redemptionNumber: item.redemptionNumber ?? entityId(item),
    type: item.closureType ?? item.type ?? "PREMATURE_CLOSURE",
    status: item.status ?? "PENDING_APPROVAL",
    mode: item.mode ?? "CASH",
    finalValue: fromPaise(item.settlementPaise ?? item.finalValue),
    schemeStatus: item.schemeStatus ?? "ACTIVE",
  };
}

function mapAdaptRedemptionItem(item: any) {
  if (
    item?.redemptionNumber &&
    item?.amount != null &&
    item?.customer != null &&
    typeof item.customer === "string" &&
    (typeof item.scheme === "string" || item.scheme == null)
  ) {
    return item;
  }
  return {
    id: entityId(item),
    redemptionNumber:
      item.redemptionNumber ?? entityId(item) ?? String(item._id ?? ""),
    customer: customerName(item),
    customerId: String(
      item.customerId ?? item.customer?._id ?? item.customer?.id ?? "",
    ),
    schemeId: String(
      item.schemeId ?? item.scheme?._id ?? item.scheme?.id ?? "",
    ),
    scheme:
      item.scheme?.enrollmentNumber ??
      item.scheme?.schemeNumber ??
      item.scheme?.name ??
      (typeof item.scheme === "string" && !looksLikeOpaqueId(item.scheme)
        ? item.scheme
        : null) ??
      "—",
    amount:
      item.settlementPaise != null
        ? Number(item.settlementPaise) / 100
        : Number(item.amount ?? 0),
    status: item.status ?? "REQUESTED",
    submittedAt: item.submittedAt
      ? item.submittedAt
      : dateTime(item.requestedAt ?? item.createdAt),
  };
}

export function adaptRedemptions(raw: any): {
  items: any[];
  summary: Record<string, any>;
  page: ListPageMeta;
  total?: number;
} {
  if (
    Array.isArray(raw?.items) &&
    (raw.items.length === 0 ||
      (raw.items[0]?.redemptionNumber != null && raw.items[0]?.amount != null))
  ) {
    return {
      items: raw.items.map(mapAdaptRedemptionItem),
      summary: raw.summary ?? {},
      page:
        raw.page ??
        mergePageMeta(raw, { total: raw.total ?? raw.items.length }),
      total: raw.total ?? raw.items.length,
    };
  }

  const payload = contractPayload<any>(raw);
  const meta = contractMeta(raw);
  let list: any[] = [];
  if (Array.isArray(payload)) list = payload;
  else if (Array.isArray(payload?.items)) list = payload.items;
  else if (Array.isArray(raw?.items)) list = raw.items;
  else if (Array.isArray(raw)) list = raw;

  const items = list.map(mapAdaptRedemptionItem);

  return {
    items,
    summary: raw?.summary ?? meta?.summary ?? {},
    total: meta?.total ?? raw?.total ?? items.length,
    page: mergePageMeta(meta ?? raw, {
      total: meta?.total ?? raw?.total ?? items.length,
    }),
  };
}

function normalizeMaturitySummaryFromApi(
  apiSummary: Record<string, unknown> | undefined,
  items: any[],
): Record<string, number> {
  if (
    apiSummary &&
    (typeof apiSummary.upcoming === "number" ||
      apiSummary.liabilityPaise != null)
  ) {
    return {
      upcoming: Number(apiSummary.upcoming ?? 0),
      maturedToday: Number(apiSummary.maturedToday ?? 0),
      incomplete: Number(apiSummary.incomplete ?? 0),
      notRedeemed: Number(apiSummary.notRedeemed ?? 0),
      liability: Number(apiSummary.liabilityPaise ?? 0) / 100,
      gold: Number(apiSummary.goldMg ?? 0) / 1000,
      maturedTodayLiability:
        Number(apiSummary.maturedTodayLiabilityPaise ?? 0) / 100,
      incompleteLiability:
        Number(apiSummary.incompleteLiabilityPaise ?? 0) / 100,
      upcomingLiability: Number(apiSummary.upcomingLiabilityPaise ?? 0) / 100,
      notRedeemedLiability:
        Number(apiSummary.notRedeemedLiabilityPaise ?? 0) / 100,
      periodCount: Number(apiSummary.periodCount ?? 0),
    };
  }
  return deriveMaturitySummary(items);
}

function deriveMaturitySummary(items: any[]): Record<string, number> {
  const today = istBusinessDateToday();
  const in30 = istBusinessDateToday(new Date(Date.now() + 30 * 86400000));
  let upcoming = 0;
  let maturedToday = 0;
  let incomplete = 0;
  let notRedeemed = 0;
  let liability = 0;
  let gold = 0;
  for (const row of items) {
    const status = String(row.status ?? "");
    const maturityRaw = row.maturityDate ?? row.maturity;
    const maturityIso =
      typeof maturityRaw === "string" && maturityRaw.includes("T")
        ? maturityRaw.slice(0, 10)
        : typeof maturityRaw === "string" &&
            /^\d{4}-\d{2}-\d{2}/.test(maturityRaw)
          ? maturityRaw.slice(0, 10)
          : null;
    if (status === "MATURED" || row.pendingRedemption) notRedeemed += 1;
    if (status === "DEFAULTED") incomplete += 1;
    if (maturityIso === today) maturedToday += 1;
    if (maturityIso && maturityIso >= today && maturityIso <= in30)
      upcoming += 1;
    liability += Number(row.paid ?? 0);
    gold += Number(row.accumulatedGold ?? 0);
  }
  return {
    upcoming: upcoming || items.length,
    maturedToday,
    incomplete,
    notRedeemed:
      notRedeemed || items.filter((r) => r.status === "MATURED").length,
    liability,
    gold,
  };
}

export type CashOverviewSummary = {
  inHand: number;
  submitted: number;
  pendingHandovers: number;
  discrepancy: number;
  /** Staff currently holding any cash (from GET /admin/cash/overview totals). */
  staffHoldingCash?: number;
};

export type CashStaffBalanceRow = {
  id: string;
  name: string;
  branch: string;
  today: number;
  balance: number;
  availableForHandover: number;
  lastSeen: string;
  status: string;
};

export type CashReportGroupRow = {
  id: string;
  label: string;
  collected: number;
  handedOver: number;
  inHand: number;
  handoverCount: number;
  discrepancies: number;
};

function adaptCashStaffBalanceRow(item: any): CashStaffBalanceRow {
  if (item?.id && item?.name && !item?.staff) {
    const balance = Number(item.balance ?? item.today ?? 0);
    const available = Number(item.availableForHandover ?? balance);
    return {
      id: entityId(item),
      name: item.name,
      branch: String(item.branch ?? "—"),
      today: Number(item.today ?? 0),
      balance,
      availableForHandover: available,
      lastSeen: String(item.lastSeen ?? "—"),
      status: String(item.status ?? "ACTIVE"),
    };
  }
  const balance = rupees(item.cashInHand);
  const pending = rupees(item.cashPendingAcceptance);
  const available =
    item.availableForHandover != null
      ? rupees(item.availableForHandover)
      : Math.max(0, balance - pending);
  return {
    id: entityId(item.staff) || entityId(item),
    name: item.staff?.name ?? "—",
    branch: branchName(item),
    today: rupees(item.cashCollectedToday),
    balance,
    availableForHandover: available,
    lastSeen: item.lastHandoverAt
      ? dateTime(item.lastHandoverAt)
      : item.daysHolding != null
        ? `${item.daysHolding}d holding`
        : "—",
    status:
      item.status ??
      (item.riskFlag === "HOLDING_TOO_LONG"
        ? "SUSPENDED"
        : item.riskFlag
          ? "ATTENTION"
          : "ACTIVE"),
  };
}

function adaptCashHandoverRow(item: any) {
  if (
    item?.handoverNo &&
    item?.id &&
    !item?.handoverNumber &&
    !item?.amountPaise &&
    typeof item?.staff === "string" &&
    typeof item?.branch === "string"
  ) {
    return item;
  }
  const id = entityId(item);
  const amount =
    rupees(item.amount) ||
    rupees(item.systemAmount) ||
    (typeof item.amountPaise === "number" ? item.amountPaise / 100 : 0);
  const declared =
    rupees(item.acceptedAmount) ||
    (typeof item.acceptedAmountPaise === "number"
      ? item.acceptedAmountPaise / 100
      : 0) ||
    amount;
  const staff =
    item.staff?.name ??
    item.staffName ??
    (typeof item.staff === "string" && !looksLikeOpaqueId(item.staff)
      ? item.staff
      : "—");
  return {
    id,
    handoverNo: item.handoverNumber ?? item.handoverNo ?? id,
    staff,
    branch: branchName(item),
    amount,
    declared,
    payments: item.receiptCount ?? item.payments ?? 0,
    submittedAt:
      dateTime(item.submittedAt ?? item.createdAt) ||
      String(item.submittedAt ?? item.createdAt ?? "—"),
    status: item.status,
    initiatedBy: item.initiatedBy ?? item.initiator,
    acceptedBy:
      item.acceptedBy?.name ??
      item.settledBy?.name ??
      (typeof item.acceptedBy === "string" ? item.acceptedBy : undefined),
    remarks: item.remarks ?? item.reason,
  };
}

export function adaptCashHandoverDetail(raw: any): CashHandoverDetail {
  const data = contractPayload<any>(raw) ?? raw;
  // Already-adapted mock / UI detail shape (string staff/branch labels).
  if (
    data?.handoverNo &&
    Array.isArray(data?.timeline) &&
    Array.isArray(data?.paymentLines) &&
    typeof data?.systemAmount === "number" &&
    typeof data?.staff === "string" &&
    typeof data?.branch === "string"
  ) {
    return data as CashHandoverDetail;
  }

  const base = adaptCashHandoverRow(data);
  const systemAmount =
    rupees(data?.systemAmount) ||
    rupees(data?.amount) ||
    (typeof data?.amountPaise === "number" ? data.amountPaise / 100 : 0) ||
    base.amount;
  const declared =
    rupees(data?.acceptedAmount) ||
    (typeof data?.acceptedAmountPaise === "number"
      ? data.acceptedAmountPaise / 100
      : 0) ||
    base.declared ||
    systemAmount;

  const timelineRaw = Array.isArray(data?.timeline) ? data.timeline : [];
  const timeline = timelineRaw.map((ev: any) => ({
    at: dateTime(ev?.at) || String(ev?.at ?? "—"),
    event: String(ev?.event ?? "EVENT"),
    by: ev?.by?.name ?? (typeof ev?.by === "string" ? ev.by : "—"),
    note: ev?.note ? String(ev.note) : undefined,
  }));

  const paymentLinesRaw = Array.isArray(data?.paymentLines)
    ? data.paymentLines
    : Array.isArray(data?.payments) && typeof data.payments[0] === "object"
      ? data.payments
      : [];
  const paymentLines = paymentLinesRaw.map((p: any, index: number) => ({
    id: entityId(p) || `pay_line_${index}`,
    receiptNo: String(p?.receiptNo ?? p?.receiptNumber ?? "—"),
    customer:
      p?.customer?.name ?? (typeof p?.customer === "string" ? p.customer : "—"),
    amount:
      rupees(p?.amount) ||
      (typeof p?.amountPaise === "number" ? p.amountPaise / 100 : 0),
    paidAt: dateTime(p?.paidAt ?? p?.collectedAt) || String(p?.paidAt ?? "—"),
  }));

  const denominations = Array.isArray(data?.denominations)
    ? data.denominations.map((den: any) => ({
        denomination: Number(den?.denomination ?? den?.value ?? 0),
        count: Number(den?.count ?? 0),
      }))
    : [];

  return {
    ...base,
    declared,
    systemAmount,
    declaredReceiptCount:
      Number(
        data?.declaredReceiptCount ?? data?.receiptCount ?? paymentLines.length,
      ) || base.payments,
    coversFrom: data?.coversFrom
      ? dateTime(data.coversFrom) || String(data.coversFrom)
      : undefined,
    coversUntil: data?.coversUntil
      ? dateTime(data.coversUntil) || String(data.coversUntil)
      : undefined,
    paymentLines,
    denominations: denominations.length ? denominations : undefined,
    timeline,
    acceptedBy:
      data?.settledBy?.name ??
      data?.acceptedBy?.name ??
      (typeof data?.acceptedBy === "string" ? data.acceptedBy : undefined) ??
      base.acceptedBy,
    remarks: data?.remarks ?? data?.reason ?? base.remarks,
  };
}

export function adaptCashOverview(raw: any): {
  summary: CashOverviewSummary;
  chart?: import("@/src/types/admin-report").ChartSeriesBlock;
  alerts?: { severity: string; message: string; actionPath?: string }[];
} {
  if (raw?.summary?.inHand != null && !raw?.totals && !raw?.chart) {
    return { summary: raw.summary as CashOverviewSummary };
  }
  const data = contractPayload<any>(raw);
  if (
    data &&
    typeof data.pending === "number" &&
    typeof data.acceptedAmountPaise === "number" &&
    !data.totals
  ) {
    return {
      summary: {
        inHand: 0,
        submitted: data.acceptedAmountPaise / 100,
        pendingHandovers: data.pending,
        discrepancy: 0,
      },
    };
  }
  const t = data?.totals ?? {};
  return {
    summary: {
      inHand: rupees(t.totalCashInHand),
      submitted: rupees(t.pendingAcceptance),
      pendingHandovers: Number(t.pendingHandoverCount ?? 0),
      discrepancy: rupees(t.discrepancyTotal),
      staffHoldingCash: Number(t.staffHoldingCash ?? 0),
    },
    chart: data?.chart,
    alerts: data?.alerts,
  };
}

export function adaptCashStaffBalances(raw: any): {
  items: CashStaffBalanceRow[];
  page: ListPageMeta;
} {
  if (raw?.items?.[0]?.name && raw?.page) {
    return {
      items: raw.items as CashStaffBalanceRow[],
      page: mergePageMeta(raw),
    };
  }
  const payload = contractPayload<any>(raw);
  const list = Array.isArray(payload)
    ? payload
    : (payload?.items ?? raw?.staff ?? []);
  const items = list.map(adaptCashStaffBalanceRow);
  const meta = contractMeta(raw);
  const total =
    meta?.summary?.staffCount ??
    (typeof meta?.total === "number" ? meta.total : items.length);
  return {
    items,
    page: mergePageMeta(meta ?? raw, { total }),
  };
}

export function adaptCashHandovers(raw: any): {
  items: ReturnType<typeof adaptCashHandoverRow>[];
  page: ListPageMeta;
} {
  if (raw?.items?.[0]?.handoverNo && raw?.page) {
    return {
      items: raw.items as ReturnType<typeof adaptCashHandoverRow>[],
      page: mergePageMeta(raw),
    };
  }
  const payload = contractPayload<any>(raw);
  const list = Array.isArray(payload)
    ? payload
    : (payload?.items ?? raw?.handovers ?? []);
  const items = list.map(adaptCashHandoverRow);
  const meta = contractMeta(raw);
  const total =
    meta?.summary?.count ??
    (typeof meta?.total === "number" ? meta.total : items.length);
  return {
    items,
    page: mergePageMeta(meta ?? raw, { total }),
  };
}

export function adaptCashReport(raw: any): {
  totals: {
    collected: number;
    handedOver: number;
    inHand: number;
    discrepancy: number;
    handoverCount: number;
  };
  groups: {
    id: string;
    label: string;
    collected: number;
    handedOver: number;
    inHand: number;
    handoverCount: number;
    discrepancies: number;
  }[];
  page: ListPageMeta;
} {
  if (raw?.groups?.[0]?.label && raw?.page && raw?.totals) {
    return {
      totals: raw.totals,
      groups: raw.groups,
      page: mergePageMeta(raw),
    };
  }
  const data = contractPayload<any>(raw);
  const t = data?.totals ?? raw?.totals ?? {};
  const groups = (data?.groups ?? raw?.groups ?? []).map((g: any) => ({
    id: String(g.key ?? (entityId(g) || "—")),
    label: String(g.label ?? "—"),
    collected: rupees(g.cashCollected),
    handedOver: rupees(g.handedOver),
    inHand: rupees(g.inHand),
    handoverCount: Number(g.handoverCount ?? 0),
    discrepancies: Number(g.discrepancies ?? 0),
  }));
  const meta = contractMeta(raw);
  return {
    totals: {
      collected: rupees(t.cashCollected),
      handedOver: rupees(t.handedOver),
      inHand: rupees(t.currentlyInHand),
      discrepancy: rupees(t.discrepancyTotal),
      handoverCount: Number(t.handoverCount ?? 0),
    },
    groups,
    page: mergePageMeta(meta ?? raw, {
      total:
        typeof meta?.total === "number"
          ? meta.total
          : typeof (raw as { total?: number })?.total === "number"
            ? (raw as { total: number }).total
            : groups.length,
    }),
  };
}

export function adaptAdminReport(raw: any) {
  const data = contractPayload<any>(raw);
  const meta = contractMeta(raw);
  const rows = (data?.rows ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    id: String(row.key ?? (entityId(row) || "")),
  }));
  return {
    reportKey: String(data?.reportKey ?? "OUTSTANDING"),
    title: String(data?.title ?? "Report"),
    scope: data?.scope,
    period: data?.period,
    generatedAt: data?.generatedAt,
    valuationRate: data?.valuationRate,
    summary: data?.summary ?? [],
    charts: data?.charts ?? {},
    columns: data?.columns ?? [],
    rows,
    totalsRow: data?.totalsRow,
    exportFormats: data?.exportFormats ?? ["CSV", "XLSX", "PDF"],
    page: mergePageMeta(meta ?? raw, {
      total: typeof meta?.total === "number" ? meta.total : rows.length,
    }),
  };
}

/** Map lean or rich GET /admin/customers/analytics into summary + charts. */
export function adaptCustomerAnalytics(raw: any): {
  summary: import("@/src/types/admin-report").ReportSummaryItem[];
  charts: Record<string, import("@/src/types/admin-report").ChartSeriesBlock>;
  period?: {
    from?: string;
    to?: string;
    label?: string;
    comparedTo?: { from?: string; to?: string; label?: string };
    groupBy?: string;
  };
  scope?: { level?: string; label?: string; branchId?: string | null };
  totals?: Record<string, unknown>;
  generatedAt?: string;
} {
  const data = contractPayload<any>(raw) ?? {};
  if (Array.isArray(data?.summary) && data.summary.length && data?.charts) {
    return {
      summary: data.summary,
      charts: data.charts,
      period: data.period,
      scope: data.scope,
      totals: data.totals,
      generatedAt: data.generatedAt,
    };
  }

  const total = Number(data.total ?? 0);
  const active = Number(data.active ?? 0);
  const blocked = Number(data.blocked ?? 0);
  const inactive = Number(
    data.inactive ?? Math.max(0, total - active - blocked),
  );
  const kycVerified = Number(data.kycVerified ?? 0);
  const kycPending = Number(data.kycPending ?? 0);
  const withActiveScheme = Number(data.withActiveScheme ?? 0);

  const summary: import("@/src/types/admin-report").ReportSummaryItem[] =
    Array.isArray(data.summary) && data.summary.length
      ? data.summary
      : [
          {
            key: "TOTAL",
            label: "Total customers",
            value: total,
            valueType: "count",
          },
          { key: "ACTIVE", label: "Active", value: active, valueType: "count" },
          {
            key: "BLOCKED",
            label: "Blocked",
            value: blocked,
            valueType: "count",
            severity: blocked > 0 ? "WARNING" : undefined,
          },
          {
            key: "KYC_VERIFIED",
            label: "KYC verified",
            value: kycVerified,
            valueType: "count",
          },
          {
            key: "KYC_PENDING",
            label: "KYC pending",
            value: kycPending,
            valueType: "count",
          },
          {
            key: "WITH_ACTIVE_SCHEME",
            label: "With active scheme",
            value: withActiveScheme,
            valueType: "count",
          },
        ];

  const charts: Record<
    string,
    import("@/src/types/admin-report").ChartSeriesBlock
  > = { ...(data.charts ?? {}) };

  if (!charts.customerStatusDistribution) {
    charts.customerStatusDistribution = {
      chartType: "donut",
      title: "Customer status",
      yAxis: { type: "count", label: "Customers" },
      series: [
        {
          key: "STATUS",
          name: "Customers",
          data: [
            { x: "Active", y: active, yDisplay: String(active) },
            { x: "Blocked", y: blocked, yDisplay: String(blocked) },
            { x: "Inactive", y: inactive, yDisplay: String(inactive) },
          ].filter((p) => p.y > 0),
        },
      ],
    };
  }

  const byBranch = Array.isArray(data.customersByBranch)
    ? data.customersByBranch
    : [];
  if (!charts.customersByBranch && byBranch.length) {
    charts.customersByBranch = {
      chartType: "horizontalBar",
      title: "Customers by branch",
      yAxis: { type: "count", label: "Customers" },
      series: [
        {
          key: "BRANCH",
          name: "Customers",
          data: byBranch.map((row: any) => ({
            x: String(row.name ?? row.branchId ?? row._id ?? "—"),
            y: Number(row.count ?? 0),
            yDisplay: String(row.count ?? 0),
          })),
        },
      ],
    };
  }

  return {
    summary,
    charts,
    period: data.period,
    scope: data.scope,
    totals: data.totals,
    generatedAt: data.generatedAt,
  };
}

/** Same envelope shape as customer analytics. */
export function adaptEnrollmentAnalytics(raw: any) {
  return adaptCustomerAnalytics(raw);
}

/** Map audit-event list payloads into UI rows (When / Actor / Action / Summary). */
function auditEntityLabel(item: Record<string, unknown>) {
  if (typeof item.entity === "string" && item.entity) return item.entity;
  const type = item.entityType ? String(item.entityType) : "";
  const id = item.entityId ? String(item.entityId) : "";
  if (type && id) return `${type} · ${id}`;
  return type || id || "—";
}

function auditBranchLabel(item: Record<string, unknown>) {
  return branchName(item);
}

export function adaptAuditEvents(raw: any): {
  items: {
    id: string;
    at: string;
    actor: string;
    action: string;
    summary: string;
    entityType?: string;
    entity?: string;
    branch?: string;
    ip?: string;
    changes?: { field: string; from: string; to: string }[];
  }[];
  page: ListPageMeta;
  total: number;
} {
  if (
    Array.isArray(raw?.items) &&
    (raw.items.length === 0 || raw.items[0]?.at != null)
  ) {
    const items = raw.items.map((item: Record<string, unknown>) => ({
      ...item,
      id: String(item.id ?? entityId(item) ?? ""),
      actor:
        typeof item.actor === "string" && !looksLikeOpaqueId(item.actor)
          ? item.actor
          : ((item.actor as { name?: string })?.name ?? staffName(item) ?? "—"),
      action: String(item.action ?? "—"),
      entityType: item.entityType ? String(item.entityType) : undefined,
      entity: auditEntityLabel(item),
      branch: auditBranchLabel(item),
      ip: item.ip ? String(item.ip) : undefined,
      summary: String(item.summary ?? item.action ?? "—"),
    }));
    return {
      items,
      page:
        raw.page ?? mergePageMeta(raw, { total: raw.total ?? items.length }),
      total: raw.total ?? items.length,
    };
  }

  const payload = contractPayload<any>(raw);
  const meta = contractMeta(raw);
  const list: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw)
          ? raw
          : [];

  const items = list.map((item) => {
    const actorName =
      item.actor?.name ??
      (typeof item.actor === "string" && !looksLikeOpaqueId(item.actor)
        ? item.actor
        : null) ??
      item.actorName ??
      staffName(item) ??
      (item.actorType === "SYSTEM" ? "System" : null) ??
      "—";
    const action = String(item.action ?? "—");
    const summary =
      item.summary ??
      item.message ??
      (item.metadata?.note
        ? `${action.replaceAll("_", " ")} · ${item.metadata.note}`
        : action.replaceAll("_", " "));
    return {
      id:
        entityId(item) ||
        `${action}_${item.occurredAt ?? item.createdAt ?? ""}`,
      at: dateTime(item.occurredAt ?? item.createdAt ?? item.at),
      actor: actorName,
      action,
      summary,
      entityType: item.entityType ? String(item.entityType) : undefined,
      entity: auditEntityLabel(item),
      branch: auditBranchLabel(item),
      ip: item.ip ? String(item.ip) : undefined,
      changes: Array.isArray(item.changes) ? item.changes : [],
    };
  });

  const pageMeta = mergePageMeta(meta ?? raw);
  const total =
    typeof meta?.total === "number"
      ? meta.total
      : typeof raw?.total === "number"
        ? raw.total
        : typeof pageMeta.total === "number"
          ? pageMeta.total
          : pageMeta.hasMore
            ? undefined
            : items.length;

  return {
    items,
    total: typeof total === "number" ? total : items.length,
    page: mergePageMeta(meta ?? raw, {
      total: typeof total === "number" ? total : undefined,
    }),
  };
}
