import type { Grievance, GrievanceDetail, GrievanceMessage } from "@/src/types/domain";
import { mockDb } from "@/src/mocks/mock-db";

const extraMessages = new Map<string, GrievanceMessage[]>();
const versionOverrides = new Map<string, number>();
const statusOverrides = new Map<string, Grievance["status"]>();
const assigneeOverrides = new Map<string, string>();

export function appendGrievanceMessage(
  id: string,
  message: GrievanceMessage,
) {
  const list = extraMessages.get(id) ?? [];
  list.push(message);
  extraMessages.set(id, list);
  versionOverrides.set(id, (versionOverrides.get(id) ?? 3) + 1);
}

export function bumpGrievanceVersion(id: string) {
  versionOverrides.set(id, (versionOverrides.get(id) ?? 3) + 1);
}

export function setGrievanceStatus(id: string, status: Grievance["status"]) {
  statusOverrides.set(id, status);
  bumpGrievanceVersion(id);
}

export function setGrievanceAssignee(id: string, name: string) {
  assigneeOverrides.set(id, name);
  bumpGrievanceVersion(id);
}

function findGrievanceRow(id: string): Grievance | undefined {
  if (mockDb.grievances.some((g) => g.id === id)) {
    return mockDb.grievances.find((g) => g.id === id);
  }
  const i = Number.parseInt(id.replace(/\D/g, ""), 10);
  const base = mockDb.grievances[i % mockDb.grievances.length];
  if (!base) return undefined;
  return { ...base, id };
}

export function buildGrievanceDetail(id: string): GrievanceDetail {
  const row = findGrievanceRow(id) ?? mockDb.grievances[0];
  const status = statusOverrides.get(id) ?? row.status;
  const assignee = assigneeOverrides.get(id) ?? row.assignee;
  const version = versionOverrides.get(id) ?? row.version ?? 3;
  const baseMessages: GrievanceMessage[] = [
    {
      id: `gmsg_${id}_1`,
      messageType: "CUSTOMER_MESSAGE",
      body:
        row.subject.includes("receipt") || row.category === "PAYMENT"
          ? "I completed the payment, but I cannot find the receipt in WhatsApp or my account."
          : "I need help with this request as soon as possible.",
      authorName: row.customer,
      authorType: "CUSTOMER",
      createdAt: "2026-09-14T09:12:00+05:30",
    },
    {
      id: `gmsg_${id}_2`,
      messageType: "INTERNAL_NOTE",
      body: "Checked provider logs — delivery failed; payment is posted on ledger.",
      authorName: "Reshma VP",
      authorType: "USER",
      createdAt: "2026-09-14T10:05:00+05:30",
    },
    {
      id: `gmsg_${id}_3`,
      messageType: "SYSTEM_EVENT",
      body: "Status changed to In progress",
      authorName: "System",
      authorType: "SYSTEM",
      createdAt: "2026-09-14T10:06:00+05:30",
    },
  ];
  const messages = [...baseMessages, ...(extraMessages.get(id) ?? [])];
  return {
    ...row,
    id,
    status,
    assignee,
    version,
    description:
      row.category === "PAYMENT"
        ? "I paid ₹2,500 through UPI on 13 September but it is not visible in my passbook."
        : "Customer raised this through the mobile app.",
    customerMobile: "9847XXXX33",
    branchName: "MG Road",
    relatedEntityLabel:
      row.category === "PAYMENT" ? "Receipt SG/MGR/2026/001271" : undefined,
    relatedEntityPath:
      row.category === "PAYMENT" ? "/payments/pay_demo" : undefined,
    slaDueAt: "2026-09-14T15:10:00+05:30",
    slaFirstRespondedAt:
      status === "OPEN" ? undefined : "2026-09-14T12:05:00+05:30",
    slaOverdue: row.sla.includes("Overdue") || row.sla.includes("left") === false,
    messages,
  };
}
