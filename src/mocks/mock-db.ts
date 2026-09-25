import type {
  AuditEvent,
  Branch,
  CashHandover,
  Customer,
  DueItem,
  Enrollment,
  GoldRate,
  Grievance,
  MessageLog,
  Payment,
  SchemePlan,
  Staff,
} from "@/src/types/domain";

const customerSeeds = [
  ["Anjali Nair", "98470 12345", "Kochi Main"],
  ["Ramesh S", "98956 23456", "Kozhikode"],
  ["Priya Pillai", "94460 34567", "Trivandrum"],
  ["Muhammed G", "99950 45678", "Malappuram"],
  ["Sreedevi B", "96568 56789", "Kochi Main"],
  ["Vivek J", "97459 67890", "Thrissur"],
  ["Anitha Kumar", "98460 78901", "Kollam"],
  ["Jithin P", "97780 89012", "Kozhikode"],
  ["Lekshmi R", "94472 90123", "Trivandrum"],
  ["Deepak Menon", "98471 01234", "Kochi Main"],
  ["Nisha Joseph", "96055 45621", "Thrissur"],
  ["Arun Raj", "94963 81020", "Kochi Main"],
] as const;

export const customers: Customer[] = customerSeeds.map(
  ([name, phone, branch], index) => ({
    id: `cus_${String(index + 1).padStart(2, "0")}`,
    customerNo: `CUS-${10482 + index}`,
    name,
    initials: name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join(""),
    phone: `+91 ${phone}`,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    branch,
    branchId: `brn_${branch.toLowerCase().replace(/\s+/g, "_")}`,
    activeSchemes: index % 4 === 0 ? 2 : 1,
    nextDue: `${String(3 + ((index * 3) % 25)).padStart(2, "0")} Oct 2026`,
    nextDueAmount: [3000, 5000, 4000, 10000, 2500][index % 5],
    overdueAmount: index % 3 === 1 ? [2000, 5000, 1000][index % 3] : 0,
    lastPayment: `${String(3 + ((index * 3) % 25)).padStart(2, "0")} Sep 2026`,
    lastPaymentAmount: [3000, 5000, 4000, 10000, 2500][index % 5],
    kyc: index % 4 === 3 ? "PENDING" : "VERIFIED",
    status: index === 10 ? "BLOCKED" : "ACTIVE",
    joined: `${String(10 + index).padStart(2, "0")} May 2026`,
    address: `${18 + index}, Panampilly Nagar, ${branch}, Kerala 6820${30 + index}`,
    version: 1 + index,
    nominee:
      index % 2 === 0
        ? ["Suresh Nair", "Spouse", "+91 98460 20010"].join(" · ")
        : undefined,
    nomineeDetail:
      index % 2 === 0
        ? {
            name: "Suresh Nair",
            relationship: "SPOUSE",
            relationshipLabel: "Spouse",
            mobile: "+91 98460 20010",
            notes: "Primary emergency contact",
            updatedAt: "12 Aug 2026",
            updatedBy: "Priya S",
          }
        : undefined,
    kycDetail:
      index % 4 === 3
        ? {
            type: "AADHAAR",
            status: "SUBMITTED",
            submittedAt: "10 Sep 2026",
            documents: [
              { side: "FRONT", label: "Aadhaar — front" },
              { side: "BACK", label: "Aadhaar — back" },
            ],
          }
        : {
            type: index % 5 === 0 ? "PAN" : "AADHAAR",
            status: "VERIFIED",
            number: index % 5 === 0 ? "ABCDE1234F" : undefined,
            verifiedAt: "02 Apr 2026",
            verifiedBy: "Priya S",
            documents:
              index % 5 === 0
                ? [{ side: "SINGLE", label: "PAN card" }]
                : [
                    { side: "FRONT", label: "Aadhaar — front" },
                    { side: "BACK", label: "Aadhaar — back" },
                  ],
          },
  }),
);

const rawEnrollments: Enrollment[] = customers.flatMap((customer, index) => {
  const base: Enrollment = {
    id: `sch_${String(index + 1).padStart(2, "0")}`,
    enrollmentNo: `ENR-${24091 - index * 17}`,
    customerId: customer.id,
    customer: customer.name,
    plan:
      index % 3 === 0
        ? "Suvarna 24 Month"
        : index % 3 === 1
          ? "Sampoorna Flexible"
          : "Akshaya 12 Month",
    branch: customer.branch,
    progress: 3 + (index % 9),
    tenure: index % 3 === 0 ? 24 : 12,
    paid: (3 + (index % 9)) * customer.nextDueAmount,
    installment: customer.nextDueAmount,
    nextDue: customer.nextDue,
    maturity: index % 3 === 0 ? "12 Mar 2028" : "14 Jan 2027",
    status:
      index === 3
        ? "PENDING_ACTIVATION"
        : index === 4
          ? "REDEMPTION_PENDING"
          : index === 6
            ? "TERM_ENDED"
            : index === 8
              ? "MATURED"
              : "ACTIVE",
    valueBasis: index % 3 === 0 ? "GOLD_WEIGHT" : "CASH",
    accumulatedGold: index % 3 === 0 ? 18.72 + index : undefined,
  };
  return [base];
});

function monthLabel(offset: number) {
  const date = new Date(2026, 4 + offset, 1);
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function moneyPlain(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function enrichEnrollment(
  row: Enrollment,
  scenario:
    | "FIXED_ACTIVE"
    | "FIXED_GOLD"
    | "FLEXIBLE_FREE"
    | "FLEXIBLE_CAPPED"
    | "MATURED"
    | "REDEMPTION_PENDING"
    | "PENDING_ACTIVATION"
    | "TERM_ENDED"
    | "DEFAULT",
): Enrollment {
  const matured = scenario === "MATURED" || row.status === "MATURED";
  const redemptionPending =
    scenario === "REDEMPTION_PENDING" || row.status === "REDEMPTION_PENDING";
  const closedToPayments = matured || redemptionPending;
  const displayMode: Enrollment["displayMode"] =
    scenario === "FLEXIBLE_CAPPED"
      ? "FLEXIBLE_LOCK_WINDOW"
      : scenario === "FLEXIBLE_FREE"
        ? "FLEXIBLE_FREE_WINDOW"
        : "FIXED";
  const paymentPattern = displayMode === "FIXED" ? "FIXED" : "FLEXIBLE";
  const tenure = row.tenure;
  const paidCycles = closedToPayments ? tenure : Math.min(row.progress, tenure);
  const installment = row.installment;

  if (displayMode === "FIXED") {
    const remainingInstallments = Math.max(tenure - paidCycles, 0);
    const maxAdvance = Math.min(
      installment * 3,
      installment * remainingInstallments,
    );
    const schedule = Array.from({ length: tenure }, (_, cycle) => ({
      id: `${row.id}_c${cycle + 1}`,
      cycle: cycle + 1,
      label: `Installment ${cycle + 1}`,
      due: `${String(10).padStart(2, "0")} ${monthLabel(cycle)}`,
      amount: installment,
      paid: cycle < paidCycles ? installment : 0,
      remaining: cycle < paidCycles ? 0 : installment,
      status: matured
        ? ("PAID" as const)
        : redemptionPending
          ? ("PAID" as const)
          : cycle < paidCycles
            ? ("PAID" as const)
            : cycle === paidCycles
              ? ("DUE" as const)
              : ("UPCOMING" as const),
      receipt: cycle < paidCycles ? `RCP-26-${1208 + cycle}` : undefined,
      paymentId:
        cycle < paidCycles
          ? `pay_${String(cycle + 1).padStart(2, "0")}`
          : undefined,
      note: cycle === 0 ? "Collected at enrolment" : undefined,
    }));
    return {
      ...row,
      status: matured ? "MATURED" : row.status,
      paymentPattern,
      displayMode,
      phase: matured ? "MATURED" : redemptionPending ? "MATURED" : undefined,
      canRecordPayment: !closedToPayments && row.status === "ACTIVE",
      canRedeem: matured || redemptionPending,
      helperText: redemptionPending
        ? "Redemption is pending approval. No further collections are allowed."
        : matured
          ? "This scheme has matured. Payments can no longer be recorded."
          : `Pay ${moneyPlain(installment)} for this month, or up to ${moneyPlain(maxAdvance)} to cover future months.`,
      payableMin: installment,
      payableMax: Math.max(maxAdvance, installment),
      payableSuggested: installment,
      nextDue: closedToPayments ? "—" : row.nextDue,
      schedule,
    };
  }

  if (displayMode === "FLEXIBLE_FREE_WINDOW") {
    const breakdown = [
      {
        month: "May 2026",
        paid: 5000,
        paymentCount: 1,
        status: "PAID" as const,
      },
      {
        month: "Jun 2026",
        paid: 8000,
        paymentCount: 2,
        status: "PAID" as const,
      },
      {
        month: "Jul 2026",
        paid: 6000,
        paymentCount: 2,
        status: "PAID" as const,
      },
      {
        month: "Aug 2026",
        paid: 5000,
        paymentCount: 2,
        status: "PAID" as const,
      },
      { month: "Sep 2026", paid: 0, paymentCount: 0, status: "DUE" as const },
      {
        month: "Oct 2026",
        paid: 0,
        paymentCount: 0,
        status: "UPCOMING" as const,
      },
    ];
    const schedule: Enrollment["schedule"] = breakdown.map((item, cycle) => ({
      id: `${row.id}_m${cycle + 1}`,
      cycle: cycle + 1,
      label: item.month,
      due: item.month,
      amount: item.paid,
      paid: item.paid,
      paymentCount: item.paymentCount,
      status: item.status,
      note: "Pay any amount in the free window",
    }));
    return {
      ...row,
      plan: "Sampoorna Flexible",
      progress: 4,
      tenure: 11,
      paid: 24000,
      installment: 0,
      nextDue: "No due date — pay any amount",
      maturity: "31 Mar 2027",
      paymentPattern,
      displayMode,
      phase: "FREE_WINDOW",
      canRecordPayment: true,
      canRedeem: false,
      helperText:
        "Pay any amount between ₹500 and ₹1,00,000 this month, in multiples of ₹100.",
      payableMin: 500,
      payableMax: 100000,
      payableSuggested: null,
      lockDate: "01 Nov 2026",
      daysToLock: 48,
      projectedMonthly: 4000,
      formulaLabel: "Total paid ÷ 6 months, rounded up to the nearest ₹100",
      explainerText:
        "This is an estimate. The monthly cap is fixed when the free window closes on 1 Nov 2026.",
      monthlyBreakdown: breakdown,
      schedule,
    };
  }

  const remaining = 600;
  const cap = 2500;
  const confirmed = 1900;
  const schedule: Enrollment["schedule"] = [
    ...Array.from({ length: 6 }, (_, cycle) => ({
      id: `${row.id}_flex${cycle + 1}`,
      cycle: cycle + 1,
      label: monthLabel(cycle),
      due: monthLabel(cycle),
      amount: 2500,
      paid: 2500,
      status: "PAID" as const,
      note: "Flexible window",
    })),
    {
      id: `${row.id}_cap7`,
      cycle: 7,
      label: "Aug 2026",
      due: "31 Aug 2026",
      amount: cap,
      paid: cap,
      remaining: 0,
      status: "PAID" as const,
    },
    {
      id: `${row.id}_cap8`,
      cycle: 8,
      label: "Sep 2026",
      due: "30 Sep 2026",
      amount: cap,
      paid: confirmed,
      remaining,
      paymentCount: 3,
      status: "PARTIALLY_PAID" as const,
    },
    ...Array.from({ length: 3 }, (_, cycle) => ({
      id: `${row.id}_cap${cycle + 9}`,
      cycle: cycle + 9,
      label: monthLabel(cycle + 5),
      due: monthLabel(cycle + 5),
      amount: cap,
      paid: 0,
      remaining: cap,
      status: "UPCOMING" as const,
    })),
  ];
  return {
    ...row,
    plan: "Golden Average 11",
    status: "LOCKED",
    progress: 2,
    tenure: 5,
    paid: 15000 + 2500 + 2500 + confirmed,
    installment: remaining,
    nextDue: "30 Sep 2026",
    maturity: "31 Mar 2027",
    paymentPattern,
    displayMode,
    phase: "CAPPED",
    canRecordPayment: true,
    canRedeem: false,
    helperText: "₹600 remains in this month's ₹2,500 allowance.",
    payableMin: 1000,
    payableMax: 600,
    payableSuggested: 600,
    positionVersion: 7,
    targetCycle: "2026-09",
    cycleLabel: "September 2026",
    formulaLabel: "₹15,000 ÷ 6 = ₹2,500 per cycle",
    explainerText:
      "Free window closed on 1 Nov 2025. Each capped month is limited to the average from the first 6 flexible months.",
    currentCycleCap: cap,
    confirmedThisCycle: confirmed,
    remainingThisCycle: remaining,
    cyclePayments: [
      {
        receiptNo: "RCP-26-1271",
        paidAt: "02 Sep 2026, 10:10",
        mode: "UPI",
        amount: 700,
      },
      {
        receiptNo: "RCP-26-1278",
        paidAt: "08 Sep 2026, 16:30",
        mode: "CASH",
        amount: 800,
      },
      {
        receiptNo: "RCP-26-1281",
        paidAt: "12 Sep 2026, 11:45",
        mode: "CARD",
        amount: 400,
      },
    ],
    schedule,
  };
}

function baseFromCustomer(
  customer: Customer,
  index: number,
  overrides: Partial<Enrollment> = {},
): Enrollment {
  return {
    id: `sch_${String(index + 1).padStart(2, "0")}`,
    enrollmentNo: `ENR-${24091 - index * 17}`,
    customerId: customer.id,
    customer: customer.name,
    plan: "Akshaya 12 Month",
    branch: customer.branch,
    progress: 4,
    tenure: 12,
    paid: 4 * customer.nextDueAmount,
    installment: customer.nextDueAmount,
    nextDue: customer.nextDue,
    maturity: "14 Jan 2027",
    status: "ACTIVE",
    valueBasis: "CASH",
    ...overrides,
  };
}

const showcaseEnrollments: Enrollment[] = [
  enrichEnrollment(
    baseFromCustomer(customers[0], 0, {
      id: "sch_demo_fixed",
      enrollmentNo: "ENR-DEMO-FIXED",
      plan: "Akshaya 12 Month",
      progress: 4,
      paid: 12000,
      installment: 3000,
    }),
    "FIXED_ACTIVE",
  ),
  enrichEnrollment(
    baseFromCustomer(customers[0], 0, {
      id: "sch_demo_gold",
      enrollmentNo: "ENR-DEMO-GOLD",
      plan: "Suvarna 24 Month",
      tenure: 24,
      progress: 6,
      paid: 30000,
      installment: 5000,
      valueBasis: "GOLD_WEIGHT",
      accumulatedGold: 24.5,
      maturity: "12 Mar 2028",
    }),
    "FIXED_GOLD",
  ),
  enrichEnrollment(
    baseFromCustomer(customers[0], 0, {
      id: "sch_demo_flex_free",
      enrollmentNo: "ENR-DEMO-FLEX-FREE",
      plan: "Sampoorna Flexible",
      progress: 4,
      paid: 24000,
      installment: 0,
    }),
    "FLEXIBLE_FREE",
  ),
  enrichEnrollment(
    baseFromCustomer(customers[5], 5, {
      id: "sch_demo_flex_capped",
      enrollmentNo: "ENR-DEMO-FLEX-CAP",
      plan: "Golden Average 11",
      customer: customers[5].name,
      customerId: customers[5].id,
      branch: customers[5].branch,
      progress: 2,
      tenure: 5,
      paid: 20000,
      installment: 600,
      status: "LOCKED",
    }),
    "FLEXIBLE_CAPPED",
  ),
  enrichEnrollment(
    baseFromCustomer(customers[8], 8, {
      id: "sch_demo_matured",
      enrollmentNo: "ENR-DEMO-MATURED",
      plan: "Akshaya 12 Month",
      progress: 12,
      tenure: 12,
      paid: 36000,
      installment: 3000,
      status: "MATURED",
      maturity: "10 Aug 2026",
    }),
    "MATURED",
  ),
  enrichEnrollment(
    baseFromCustomer(customers[4], 4, {
      id: "sch_demo_redemption",
      enrollmentNo: "ENR-DEMO-REDEEM",
      plan: "Akshaya 12 Month",
      customer: customers[4].name,
      customerId: customers[4].id,
      branch: customers[4].branch,
      progress: 12,
      tenure: 12,
      paid: 36000,
      installment: 3000,
      status: "REDEMPTION_PENDING",
      maturity: "05 Sep 2026",
    }),
    "REDEMPTION_PENDING",
  ),
  enrichEnrollment(
    baseFromCustomer(customers[3], 3, {
      id: "sch_demo_pending",
      enrollmentNo: "ENR-DEMO-PENDING",
      plan: "Akshaya 12 Month",
      customer: customers[3].name,
      customerId: customers[3].id,
      branch: customers[3].branch,
      progress: 0,
      paid: 0,
      status: "PENDING_ACTIVATION",
      nextDue: "10 Oct 2026",
    }),
    "PENDING_ACTIVATION",
  ),
  enrichEnrollment(
    baseFromCustomer(customers[6], 6, {
      id: "sch_demo_term_ended",
      enrollmentNo: "ENR-DEMO-TERM",
      plan: "Akshaya 12 Month",
      customer: customers[6].name,
      customerId: customers[6].id,
      branch: customers[6].branch,
      progress: 9,
      paid: 27000,
      status: "TERM_ENDED",
    }),
    "TERM_ENDED",
  ),
];

const showcaseCustomerIds = new Set(
  showcaseEnrollments.map((enrollment) => enrollment.customerId),
);

export const enrollments: Enrollment[] = [
  ...showcaseEnrollments,
  ...rawEnrollments
    .slice(1)
    .filter((row) => !showcaseCustomerIds.has(row.customerId))
    .map((row) =>
      enrichEnrollment(
        row,
        row.status === "MATURED"
          ? "MATURED"
          : row.status === "REDEMPTION_PENDING"
            ? "REDEMPTION_PENDING"
            : row.status === "PENDING_ACTIVATION"
              ? "PENDING_ACTIVATION"
              : row.status === "TERM_ENDED"
                ? "TERM_ENDED"
                : row.plan.includes("Flexible")
                  ? "FLEXIBLE_FREE"
                  : "FIXED_ACTIVE",
      ),
    ),
];

const modes: Payment["mode"][] = [
  "CASH",
  "ONLINE_GATEWAY",
  "UPI",
  "BANK_TRANSFER",
  "CARD",
];
export const payments: Payment[] = Array.from({ length: 18 }, (_, index) => {
  const customer = customers[index % customers.length];
  const enrollment = enrollments.find(
    (item) => item.customerId === customer.id,
  )!;
  return {
    id: `pay_${String(index + 1).padStart(2, "0")}`,
    receiptNo: `RCP-26-${1208 + index}`,
    date: `${String(14 - (index % 10)).padStart(2, "0")} Sep 2026, ${10 + (index % 8)}:${index % 2 ? "35" : "10"}`,
    customer: customer.name,
    customerId: customer.id,
    enrollmentNo: enrollment.enrollmentNo,
    amount: [3000, 5000, 4000, 10000, 2500, 7500][index % 6],
    mode: modes[index % modes.length],
    staff: ["Arun Raj", "Anu TP", "Reshma VP"][index % 3],
    branch: customer.branch,
    status:
      index === 7
        ? "PENDING"
        : index === 11
          ? "FAILED"
          : index === 15
            ? "REVERSED"
            : "SUCCESS",
    source:
      index % 3 === 0 ? "PAYMENT_LINK" : index % 2 === 0 ? "STAFF" : "ADMIN",
    ...(index === 3 ? { isLateSuccess: true } : {}),
  };
});

export const dues: DueItem[] = customers
  .slice(0, 10)
  .map((customer, index) => {
    const enrollment = enrollments.find(
      (item) => item.customerId === customer.id,
    )!;
    return {
    id: `due_${index + 1}`,
    customer: customer.name,
    customerId: customer.id,
    phone: customer.phone,
    enrollmentNo: enrollment.enrollmentNo,
    schemeId: enrollment.id,
    plan: enrollment.plan,
    branch: customer.branch,
    dueDate: `${String(14 - Math.min(index, 9)).padStart(2, "0")} Sep 2026`,
    amount: customer.nextDueAmount,
    overdueDays: index < 2 ? 0 : index * 4,
    status:
      index < 2
        ? "DUE"
        : index < 5
          ? "GRACE"
          : index < 9
            ? "OVERDUE"
            : "DEFAULTED",
  };
  });

export const goldRates: GoldRate[] = Array.from({ length: 14 }, (_, index) => ({
  id: `rate_${index + 1}`,
  effectiveAt: `${String(14 - index).padStart(2, "0")} Sep 2026, 09:00`,
  ratePerGram: 7200 + index * 12 - (index % 3) * 38,
  enteredBy: index % 2 ? "Arun Raj" : "Reshma VP",
  branch: "All branches",
}));

export const staff: Staff[] = [
  {
    id: "usr_01",
    name: "Arun Raj",
    initials: "AR",
    role: "Tenant admin",
    branch: "All branches",
    today: 15500,
    sessions: 2,
    lastSeen: "Now",
    status: "ACTIVE",
  },
  {
    id: "usr_02",
    name: "Anu TP",
    initials: "AT",
    role: "Staff",
    branch: "Thrissur",
    today: 32500,
    sessions: 1,
    lastSeen: "2 min ago",
    status: "ACTIVE",
  },
  {
    id: "usr_03",
    name: "Reshma VP",
    initials: "RV",
    role: "Branch manager",
    branch: "Kochi Main",
    today: 8000,
    sessions: 1,
    lastSeen: "11 min ago",
    status: "ACTIVE",
  },
  {
    id: "usr_04",
    name: "Shameer K",
    initials: "SK",
    role: "Staff",
    branch: "Kozhikode",
    today: 11200,
    sessions: 0,
    lastSeen: "Yesterday",
    status: "SUSPENDED",
  },
];

export const branches: Branch[] = [
  {
    id: "brn_01",
    name: "Kochi Main",
    code: "KCH",
    city: "Kochi",
    staff: 4,
    customers: 342,
    status: "ACTIVE",
  },
  {
    id: "brn_02",
    name: "Thrissur",
    code: "TSR",
    city: "Thrissur",
    staff: 2,
    customers: 198,
    status: "ACTIVE",
  },
  {
    id: "brn_03",
    name: "Kozhikode",
    code: "CLT",
    city: "Kozhikode",
    staff: 1,
    customers: 174,
    status: "ACTIVE",
  },
  {
    id: "brn_04",
    name: "Trivandrum",
    code: "TVM",
    city: "Trivandrum",
    staff: 1,
    customers: 132,
    status: "ACTIVE",
  },
];

export const plans: SchemePlan[] = [
  {
    id: "pln_01",
    code: "AKS12",
    name: "Akshaya 12 Month",
    valueBasis: "CASH",
    paymentPattern: "FIXED_DATE",
    amountMode: "CUSTOMER_CHOSEN",
    tenure: 12,
    amount: 3000,
    activeEnrollments: 428,
    status: "ACTIVE",
    editLocked: true,
  },
  {
    id: "pln_02",
    code: "SUV24",
    name: "Suvarna 24 Month",
    valueBasis: "GOLD_WEIGHT",
    paymentPattern: "FIXED_DATE",
    amountMode: "CUSTOMER_CHOSEN",
    tenure: 24,
    amount: 5000,
    activeEnrollments: 206,
    status: "ACTIVE",
  },
  {
    id: "pln_03",
    code: "SAM12",
    name: "Sampoorna Flexible",
    valueBasis: "CASH",
    paymentPattern: "FLEXIBLE_AVERAGE",
    amountMode: "CUSTOMER_CHOSEN",
    tenure: 12,
    amount: 2500,
    activeEnrollments: 112,
    status: "ACTIVE",
  },
  {
    id: "pln_05",
    code: "GAV11",
    name: "Golden Average 11",
    valueBasis: "CASH",
    paymentPattern: "FLEXIBLE_AVERAGE",
    amountMode: "CUSTOMER_CHOSEN",
    tenure: 11,
    amount: 2500,
    activeEnrollments: 38,
    status: "ACTIVE",
  },
  {
    id: "pln_04",
    code: "FES10",
    name: "Festival Gold 10",
    valueBasis: "GOLD_WEIGHT",
    paymentPattern: "FIXED_DATE",
    amountMode: "JEWELLER_SLABS",
    tenure: 10,
    amount: 10000,
    activeEnrollments: 0,
    status: "DRAFT",
  },
];

export const handovers: CashHandover[] = [
  {
    id: "hnd_01",
    handoverNo: "HND-260914-08",
    staff: "Anu TP",
    branch: "Thrissur",
    amount: 32500,
    declared: 32500,
    payments: 8,
    submittedAt: "Today, 17:20",
    status: "PENDING",
    initiatedBy: "STAFF",
    remarks: "End of day collection",
  },
  {
    id: "hnd_02",
    handoverNo: "HND-260914-07",
    staff: "Reshma VP",
    branch: "Kochi Main",
    amount: 28000,
    declared: 27500,
    payments: 6,
    submittedAt: "Today, 16:40",
    status: "DISCREPANCY",
    initiatedBy: "STAFF",
    acceptedBy: "Arun Raj",
  },
  {
    id: "hnd_03",
    handoverNo: "HND-260913-05",
    staff: "Shameer K",
    branch: "Kozhikode",
    amount: 19100,
    declared: 19100,
    payments: 5,
    submittedAt: "Yesterday, 18:05",
    status: "ACCEPTED",
    initiatedBy: "ADMIN",
    acceptedBy: "Arun Raj",
    remarks: "Cash counted and received at counter",
  },
];

export const messages: MessageLog[] = customers
  .slice(0, 9)
  .map((customer, index) => ({
    id: `msg_${index + 1}`,
    date: `${14 - (index % 3)} Sep, ${9 + index}:20`,
    customer: customer.name,
    type: [
      "PAYMENT_DUE",
      "PAYMENT_RECEIPT",
      "OVERDUE_REMINDER",
      "PAYMENT_LINK",
    ][index % 4],
    channel: "WHATSAPP",
    status:
      index === 3 || index === 7 ? "FAILED" : index % 2 ? "READ" : "DELIVERED",
    cost: 0.78,
    failure: index === 3 || index === 7 ? "Recipient unreachable" : undefined,
  }));

export const grievances: Grievance[] = [
  {
    id: "grv_01",
    ticketNo: "SG-1048",
    customer: "Anjali Nair",
    subject: "Payment updated but receipt missing",
    category: "PAYMENT",
    priority: "HIGH",
    status: "OPEN",
    assignee: "Reshma VP",
    createdAt: "Today, 09:12",
    sla: "1h 42m left",
  },
  {
    id: "grv_02",
    ticketNo: "SG-1047",
    customer: "Muhammed G",
    subject: "KYC document verification",
    category: "KYC",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    assignee: "Arun Raj",
    createdAt: "Yesterday",
    sla: "5h left",
  },
  {
    id: "grv_03",
    ticketNo: "SG-1046",
    customer: "Priya Pillai",
    subject: "Clarification about maturity amount",
    category: "REDEMPTION",
    priority: "LOW",
    status: "WAITING_CUSTOMER",
    assignee: "Anu TP",
    createdAt: "12 Sep",
    sla: "Paused",
  },
];

const auditTemplates: Pick<
  AuditEvent,
  "action" | "entityType" | "entity"
>[] = [
  { action: "PAYMENT_RECORDED", entityType: "PAYMENT", entity: "RCP-26-1212" },
  { action: "PAYMENT_REVERSED", entityType: "PAYMENT", entity: "RCP-26-1188" },
  { action: "REDEMPTION_COMPLETED", entityType: "REDEMPTION", entity: "RED-260915-02" },
  { action: "REDEMPTION_APPROVED", entityType: "REDEMPTION", entity: "RED-260914-11" },
  { action: "SCHEME_ENROLLED", entityType: "SCHEME", entity: "ENR-26-4410" },
  { action: "SCHEME_REDEEMED", entityType: "SCHEME", entity: "ENR-26-2201" },
  { action: "CUSTOMER_UPDATED", entityType: "CUSTOMER", entity: "CUS-10482" },
  { action: "CUSTOMER_KYC_REVIEWED", entityType: "CUSTOMER", entity: "CUS-10201" },
  { action: "GOLD_RATE_SET", entityType: "GOLD_RATE", entity: "₹7,200/g" },
  { action: "CASH_HANDOVER_CREATED", entityType: "CASH_HANDOVER", entity: "HND-260914-08" },
  { action: "CASH_HANDOVER_ACCEPTED", entityType: "CASH_HANDOVER", entity: "HND-260915-03" },
  { action: "MESSAGE_QUEUED", entityType: "MESSAGE", entity: "MSG-8812" },
  { action: "GRIEVANCE_CREATED", entityType: "GRIEVANCE", entity: "SG-2026-000412" },
  { action: "STAFF_CREATED", entityType: "STAFF", entity: "Sanjay M" },
  { action: "PLAN_UPDATED", entityType: "PLAN", entity: "Flexi Gold 11+1" },
  { action: "BRANCH_CREATED", entityType: "BRANCH", entity: "Kairali — Thrissur" },
];

export const auditEvents: AuditEvent[] = Array.from(
  { length: 36 },
  (_, index) => {
    const template = auditTemplates[index % auditTemplates.length];
    const day = 15 - Math.floor(index / 6);
    return {
      id: `aud_${index + 1}`,
      at: `${day} Sep 2026, ${String(9 + (index % 10)).padStart(2, "0")}:${index % 2 ? "42" : "18"} am`,
      actor: staff[index % staff.length].name,
      action: template.action,
      entityType: template.entityType,
      entity: template.entity,
      branch: branches[index % branches.length].name,
      ip: `10.20.0.${18 + (index % 40)}`,
      summary: `${template.action} · ${template.entity}`,
      changes:
        index % 3 === 0
          ? [{ field: "status", from: "PENDING", to: "COMPLETED" }]
          : [],
    };
  },
);

export const mockDb = {
  customers,
  enrollments,
  payments,
  dues,
  goldRates,
  staff,
  branches,
  plans,
  handovers,
  messages,
  grievances,
  auditEvents,
};
