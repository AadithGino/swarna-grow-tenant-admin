import type { Branch, Staff } from "@/src/types/domain";
import { mockDb } from "./mock-db";

const STAFF_PROFILES: Record<
  string,
  {
    mobile: string;
    role: string;
    scope: "BRANCH" | "TENANT";
    branchId?: string;
    permissions: string[];
    mustChangePassword?: boolean;
    lastLoginAt?: string;
    enrolmentsThisMonth?: number;
  }
> = {
  usr_01: {
    mobile: "9847012345",
    role: "TENANT_ADMIN",
    scope: "TENANT",
    permissions: [
      "customer.read",
      "customer.write",
      "scheme.enrol",
      "payment.record",
      "plan.write",
      "staff.write",
      "branch.write",
      "cash.handover.accept",
      "report.read",
    ],
    lastLoginAt: "2026-09-14T09:12:00+05:30",
    enrolmentsThisMonth: 4,
  },
  usr_02: {
    mobile: "9847023456",
    role: "BRANCH_STAFF",
    scope: "BRANCH",
    branchId: "brn_02",
    permissions: [
      "customer.read",
      "customer.write",
      "scheme.enrol",
      "payment.record",
      "cash.handover.create",
    ],
    mustChangePassword: false,
    lastLoginAt: "2026-09-14T08:45:00+05:30",
    enrolmentsThisMonth: 12,
  },
  usr_03: {
    mobile: "9847034567",
    role: "BRANCH_MANAGER",
    scope: "BRANCH",
    branchId: "brn_01",
    permissions: [
      "customer.read",
      "customer.write",
      "scheme.enrol",
      "payment.record",
      "cash.handover.create",
      "cash.handover.accept",
      "report.read",
    ],
    lastLoginAt: "2026-09-14T07:30:00+05:30",
    enrolmentsThisMonth: 18,
  },
  usr_04: {
    mobile: "9847045678",
    role: "BRANCH_STAFF",
    scope: "BRANCH",
    branchId: "brn_03",
    permissions: ["customer.read", "payment.record"],
    lastLoginAt: "2026-09-13T18:00:00+05:30",
    enrolmentsThisMonth: 0,
  },
};

const BRANCH_PROFILES: Record<
  string,
  {
    line1: string;
    pincode: string;
    contactNumber: string;
    activeSchemes?: number;
  }
> = {
  brn_01: {
    line1: "42 MG Road, Ernakulam",
    pincode: "682011",
    contactNumber: "9846543211",
    activeSchemes: 291,
  },
  brn_02: {
    line1: "7 Ponnurunni Road",
    pincode: "680001",
    contactNumber: "9846543212",
    activeSchemes: 142,
  },
  brn_03: {
    line1: "Palayam Junction",
    pincode: "673001",
    contactNumber: "9846543213",
    activeSchemes: 98,
  },
  brn_04: {
    line1: "Statue Junction",
    pincode: "695001",
    contactNumber: "9846543214",
    activeSchemes: 76,
  },
};

function findBranchForStaff(staff: Staff) {
  if (staff.branch === "All branches") return null;
  return mockDb.branches.find((b) => b.name === staff.branch) ?? mockDb.branches[0];
}

function paiseDisplay(rupees: number) {
  return {
    amountPaise: Math.round(rupees * 100),
    amountDisplay: `₹${rupees.toLocaleString("en-IN")}`,
  };
}

function defaultStaffProfile(staff: Staff, branch: Branch | null) {
  return {
    mobile: "9846000000",
    role: "BRANCH_STAFF",
    scope: "BRANCH" as const,
    branchId: branch?.id,
    permissions: ["customer.read", "payment.record"],
    enrolmentsThisMonth: 6,
    lastLoginAt: "2026-09-14T10:00:00+05:30",
  };
}

export function synthesizeStaffDetail(staff: Staff) {
  const profile = STAFF_PROFILES[staff.id] ?? null;
  const branch =
    (profile?.branchId
      ? mockDb.branches.find((b) => b.id === profile.branchId)
      : findBranchForStaff(staff)) ?? mockDb.branches[0];
  const p = profile ?? defaultStaffProfile(staff, branch);
  const cash = staff.today;

  return {
    id: staff.id,
    name: staff.name,
    mobile: p.mobile,
    role: p.role,
    scope: p.scope,
    branch:
      p.scope === "TENANT" && staff.branch === "All branches"
        ? null
        : {
            id: branch.id,
            name: branch.name,
            code: branch.code,
          },
    status: staff.status === "SUSPENDED" ? "INACTIVE" : staff.status,
    mustChangePassword: p.mustChangePassword ?? false,
    permissions: p.permissions,
    lastLoginAt: p.lastLoginAt ?? null,
    activeSessions: staff.sessions,
    performance: {
      collectionThisMonth: paiseDisplay(staff.today || 184000),
      enrolmentsThisMonth: p.enrolmentsThisMonth ?? 8,
      cashInHand: paiseDisplay(cash),
    },
    audit: {
      createdAt: "2026-03-15T11:05:00+05:30",
      version: 2,
      createdBy: "Arun Raj",
    },
    stats: {
      pendingHandovers: cash > 0 ? 1 : 0,
      customersServedThisMonth: 42,
    },
  };
}

export function synthesizeBranchDetail(branch: Branch) {
  const profile = BRANCH_PROFILES[branch.id] ?? {
    line1: `${branch.name} showroom`,
    pincode: "682000",
    contactNumber: "9846000000",
    activeSchemes: Math.round(branch.customers * 0.85),
  };
  const collection = branch.customers * 2750;
  const pendingCash = branch.staff * 4500 + 3500;

  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: {
      line1:
        (branch as Branch & { line1?: string }).line1 ?? profile.line1,
      city: branch.city,
      pincode:
        (branch as Branch & { pincode?: string }).pincode ?? profile.pincode,
    },
    contactNumber:
      (branch as Branch & { contactNumber?: string }).contactNumber ??
      profile.contactNumber,
    status: branch.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    stats: {
      activeCustomers: branch.customers,
      activeSchemes: profile.activeSchemes ?? Math.round(branch.customers * 0.9),
      staffCount: branch.staff,
      collectionThisMonth: paiseDisplay(collection),
      pendingCashInHand: paiseDisplay(pendingCash),
    },
    audit: {
      createdAt: "2026-03-15T11:05:00+05:30",
      version: 2,
    },
    guards: {
      canDeactivate:
        (profile.activeSchemes ?? 0) === 0
          ? true
          : { activeSchemes: profile.activeSchemes, activeStaff: branch.staff },
    },
  };
}
