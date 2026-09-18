import { auditLogs, chartData, dashboardSummary, errorLogs, platformInvoices, platformPlans, platformTenants, templateDefinitions, tenantTemplates, webhookFailures } from "./platform-data";

export type PlatformMockRequest = { mockKey: string; params?: Record<string, unknown>; body?: Record<string, any> };
const wait = () => new Promise((resolve) => setTimeout(resolve, 360));
const byTenant = (id: unknown) => platformTenants.find((tenant) => tenant.id === String(id));

export async function platformMockRequest({ mockKey, params = {}, body = {} }: PlatformMockRequest) {
  await wait();
  const tenant = byTenant(params.tenantId);
  switch (mockKey) {
    case "login": return { accessToken: "mock-platform-access", refreshToken: "mock-platform-refresh", expiresIn: 1800, tokenType: "Bearer", user: { id: "pusr_ops", name: "Asha Menon", email: String(body.email || "ops@swarnagrow.in"), role: "SUPER_ADMIN", permissions: ["*"] } };
    case "refresh": return { accessToken: "mock-platform-access-refreshed", refreshToken: "mock-platform-refresh-rotated", expiresIn: 1800, tokenType: "Bearer" };
    case "logout": return { loggedOut: true };
    case "dashboardSummary": return dashboardSummary;
    case "dashboardChart": return chartData[String(params.chartKey)] ?? chartData["tenant-growth"];
    case "plans": return platformPlans;
    case "plan": return platformPlans.find((plan) => plan.id === String(params.planId));
    case "savePlan": {
      const existing = platformPlans.find((plan) => plan.id === String(params.planId));
      if (existing) { Object.assign(existing, body, { version: existing.version + 1 }); return existing; }
      const monthly = Number(body.monthlyPricePaise ?? 0); const yearly = Number(body.yearlyPricePaise ?? 0);
      const created: any = { ...body, id: `splan_${String(body.tier).toLowerCase()}_${Date.now()}`, monthlyPrice: { amountPaise: monthly, amountDisplay: `₹${(monthly / 100).toLocaleString("en-IN")}` }, yearlyPrice: { amountPaise: yearly, amountDisplay: `₹${(yearly / 100).toLocaleString("en-IN")}` }, tenantCount: 0, status: "ACTIVE", version: 1 };
      platformPlans.push(created); return created;
    }
    case "deprecatePlan": { const plan = platformPlans.find((row) => row.id === String(params.planId)); if (plan) plan.status = "DEPRECATED"; return plan; }
    case "tenants": {
      const q = String(params.q ?? "").toLowerCase(); const status = String(params.status ?? "ALL"); const tier = String(params.tier ?? "ALL");
      return platformTenants.filter((row) => (!q || [row.businessName, row.ownerName, row.ownerMobile, row.city, row.tenantCode].some((v) => v.toLowerCase().includes(q))) && (status === "ALL" || row.status === status) && (tier === "ALL" || row.subscription.tier === tier));
    }
    case "tenant": return tenant;
    case "createTenant": {
      const id = `tnt_${Date.now()}`; const code = String(body.businessName ?? "JEWELLER").replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase();
      return { tenant: { id, businessName: body.businessName, tenantCode: code, status: "PENDING_SETUP", subscription: { tier: "GROWTH", status: "TRIAL", trialEndsAt: "2026-09-30T00:00:00Z" } }, ownerUser: { id: `${id}_owner`, name: body.ownerName, mobile: body.ownerMobile, role: "TENANT_OWNER", temporaryPassword: "Gd7#kP2wQx", mustChangePassword: true }, defaultBranch: { id: `${id}_br1`, name: body.defaultBranchName || "Main Showroom", code: "MAIN" }, nextSteps: ["WHATSAPP_CREDENTIALS", "PAYMENT_GATEWAY", "WHATSAPP_TEMPLATES", "GO_LIVE"].map((key) => ({ key, done: false })), welcomeMessageQueued: Boolean(body.sendWelcomeMessage) };
    }
    case "updateTenant": { if (!tenant) throw new Error("Tenant not found"); Object.assign(tenant, body); tenant.audit.version += 1; return tenant; }
    case "suspendTenant": { if (!tenant) throw new Error("Tenant not found"); tenant.status = "SUSPENDED"; tenant.subscription.status = "SUSPENDED"; return { id: tenant.id, status: tenant.status, suspendedAt: new Date().toISOString(), effects: { tenantWritesBlocked: true, readsAllowed: true, reminderJobsStopped: true, tenantApiErrorCode: "SUBSCRIPTION_INACTIVE" } }; }
    case "reactivateTenant": { if (!tenant) throw new Error("Tenant not found"); tenant.status = "ACTIVE"; tenant.subscription.status = "ACTIVE"; return { id: tenant.id, status: tenant.status, reactivatedAt: new Date().toISOString(), effects: { tenantWritesBlocked: false, reminderJobsStopped: false } }; }
    case "goLive": { if (!tenant) throw new Error("Tenant not found"); if (!tenant.provisioning.readyToGoLive) throw new Error("Complete integrations and all eight required templates before go-live."); tenant.status = "ACTIVE"; tenant.goLiveAt = new Date().toISOString(); return { ok: true, checklist: ["WHATSAPP_CREDENTIALS", "PAYMENT_GATEWAY", "WHATSAPP_TEMPLATES", "GO_LIVE"].map((key) => ({ key, done: true })), tenant: { id: tenant.id, status: tenant.status, goLiveAt: tenant.goLiveAt } }; }
    case "ownerCredentials": return { ownerId: tenant?.owner.id, temporaryPassword: "Rj8#pQ2wLm", mustSetPassword: true, mustChangePassword: true };
    case "usage": return tenant?.usageDetail;
    case "flags": return { flags: tenant?.flags ?? {}, effectiveFlags: tenant?.effectiveFlags ?? {} };
    case "saveFlags": { if (!tenant) throw new Error("Tenant not found"); tenant.flags = { ...tenant.flags, ...body.flags }; tenant.effectiveFlags = { ...tenant.effectiveFlags, ...body.flags }; return { flags: tenant.flags, effectiveFlags: tenant.effectiveFlags, version: ++tenant.audit.version }; }
    case "saveWhatsapp": { if (!tenant) throw new Error("Tenant not found"); tenant.integrations.whatsapp = { configured: true, provider: "META_CLOUD", phoneNumberDisplay: "+91 98465 43210", accessTokenMasked: "EAA••••xyz", verificationStatus: "PENDING", version: 4 }; return tenant.integrations.whatsapp; }
    case "verifyWhatsapp": { if (!tenant) throw new Error("Tenant not found"); tenant.integrations.whatsapp.verificationStatus = "VERIFIED"; tenant.provisioning.whatsappConfigured = true; return { verificationStatus: "VERIFIED", messageId: "wamid.test", deliveryStatus: "DELIVERED", verifiedAt: new Date().toISOString(), testMobile: body.testMobile }; }
    case "saveGateway": { if (!tenant) throw new Error("Tenant not found"); tenant.integrations.paymentGateway = { configured: true, clientCredentialsConfigured: Boolean(body.clientId && body.clientSecret), provider: "PHONEPE", clientIdMasked: body.clientId ? `${String(body.clientId).slice(0, 4)}••••SDK` : null, environment: body.environment || "SANDBOX", verificationStatus: "PENDING", lastVerifiedAt: null }; tenant.provisioning.paymentGatewayConfigured = true; return tenant.integrations.paymentGateway; }
    case "verifyGateway": { if (!tenant) throw new Error("Tenant not found"); tenant.integrations.paymentGateway.verificationStatus = "VERIFIED"; tenant.provisioning.paymentGatewayConfigured = true; return { verified: true, verificationStatus: "VERIFIED", verifiedAt: new Date().toISOString() }; }
    case "templateDefinitions": return templateDefinitions;
    case "templates": return tenantTemplates[String(params.tenantId)] ?? [];
    case "saveTemplate": {
      const list = tenantTemplates[String(params.tenantId)] ?? (tenantTemplates[String(params.tenantId)] = []); const current = list.find((row) => row.messageType === String(params.messageType));
      if (current) Object.assign(current, body, { version: current.version + 1, active: true }); else list.push({ id: `tpl_${Date.now()}`, messageType: String(params.messageType), ...body, active: true, version: 1 } as any);
      if (tenant) { tenant.templates.configured = list.filter((row) => row.active && row.messageType !== "PAYMENT_SUCCESS_TEXT_FALLBACK").length; tenant.templates.missing = templateDefinitions.filter((d) => d.required && !list.some((row) => row.messageType === d.messageType)).map((d) => d.messageType); tenant.provisioning.templatesConfigured = tenant.templates.configured; tenant.provisioning.readyToGoLive = tenant.provisioning.whatsappConfigured && tenant.provisioning.paymentGatewayConfigured && tenant.templates.missing.length === 0; }
      return list.find((row) => row.messageType === String(params.messageType));
    }
    case "deleteTemplate": { const list = tenantTemplates[String(params.tenantId)] ?? []; const index = list.findIndex((row) => row.messageType === String(params.messageType)); if (index >= 0) list.splice(index, 1); return { deleted: true }; }
    case "testTemplate": return { queued: true, to: body.testMobile, templateId: "123456789", messageId: "wamid.test" };
    case "changePlan": { if (!tenant) throw new Error("Tenant not found"); const plan = platformPlans.find((row) => row.id === body.subscriptionPlanId); if (plan) tenant.subscription.tier = plan.tier; tenant.subscription.billingCycle = body.billingCycle ?? tenant.subscription.billingCycle; return tenant.subscription; }
    case "updateLimits": { if (!tenant) throw new Error("Tenant not found"); return { tier: tenant.subscription.tier, limitOverrides: body.limitOverrides ?? {}, featureOverrides: body.featureOverrides ?? {}, version: ++tenant.audit.version }; }
    case "extendSubscription": { if (!tenant) throw new Error("Tenant not found"); return { status: body.extensionType === "GRACE" ? "GRACE" : "ACTIVE", currentPeriodEnd: "2026-10-15", graceEndsAt: body.extensionType === "GRACE" ? "2026-10-15T00:00:00Z" : null, extendedDays: body.days }; }
    case "cancelSubscription": { if (!tenant) throw new Error("Tenant not found"); tenant.subscription.status = "CANCELLED"; return { status: "CANCELLED", cancelledAt: new Date().toISOString(), currentPeriodEnd: tenant.subscription.currentPeriodEnd }; }
    case "invoices": return platformInvoices[String(params.tenantId)] ?? [];
    case "createInvoice": { const amount = Number(body.amountPaise ?? body.lineItems?.reduce((sum: number, item: any) => sum + Number(item.amountPaise), 0) ?? 0); const tax = Math.round(amount * Number(body.taxPercent ?? 18) / 100); const row: any = { id: `inv_${Date.now()}`, invoiceNumber: `PLT/2026/${300 + Date.now() % 100}`, subtotal: { amountPaise: amount, amountDisplay: `₹${(amount / 100).toLocaleString("en-IN")}` }, tax: { amountPaise: tax, amountDisplay: `₹${(tax / 100).toLocaleString("en-IN")}` }, total: { amountPaise: amount + tax, amountDisplay: `₹${((amount + tax) / 100).toLocaleString("en-IN")}` }, status: "UNPAID", dueDate: body.dueDate, paidAt: null }; (platformInvoices[String(params.tenantId)] ??= []).unshift(row); return row; }
    case "markInvoicePaid": { for (const list of Object.values(platformInvoices)) { const invoice = list.find((row) => row.id === String(params.invoiceId)); if (invoice) { invoice.status = "PAID"; invoice.paidAt = new Date().toISOString(); return invoice; } } throw new Error("Invoice not found"); }
    case "auditLogs": return auditLogs.filter((row) => !params.tenantId || row.tenant.id === params.tenantId);
    case "webhookFailures": return webhookFailures.filter((row) => !params.provider || params.provider === "ALL" || row.provider === params.provider);
    case "retryWebhook": { const row = webhookFailures.find((item) => item.id === String(params.id)); if (row) { row.attempts += 1; row.status = "FAILED"; } return { id: params.id, queued: true }; }
    case "errorLogs": return errorLogs.filter((row) => !params.tenantId || row.tenantId === params.tenantId);
    default: throw new Error(`Unknown platform mock request: ${mockKey}`);
  }
}
