import {
  auditLogs,
  chartData,
  dashboardSummary,
  errorLogs,
  platformDemoInstances,
  platformDemoTemplates,
  platformDemoTemplateVersions,
  platformInvoices,
  platformPlans,
  platformTenants,
  webhookFailures,
} from "./platform-data";

export type PlatformMockRequest = { mockKey: string; params?: Record<string, unknown>; body?: Record<string, any> };
const wait = () => new Promise((resolve) => setTimeout(resolve, 360));
const byTenant = (id: unknown) => platformTenants.find((tenant) => tenant.id === String(id));
const byDemoTemplate = (id: unknown) => platformDemoTemplates.find((row) => row.id === String(id));
const byDemoInstance = (id: unknown) => platformDemoInstances.find((row) => row.id === String(id));

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
      return { tenant: { id, businessName: body.businessName, tenantCode: code, status: "PENDING_SETUP", subscription: { tier: "GROWTH", status: "TRIAL", trialEndsAt: "2026-09-30T00:00:00Z" } }, ownerUser: { id: `${id}_owner`, name: body.ownerName, mobile: body.ownerMobile, role: "TENANT_OWNER", temporaryPassword: "Gd7#kP2wQx", mustChangePassword: true }, defaultBranch: { id: `${id}_br1`, name: body.defaultBranchName || "Main Showroom", code: "MAIN" }, nextSteps: ["PAYMENT_GATEWAY", "GO_LIVE"].map((key) => ({ key, done: false })), welcomeMessageQueued: Boolean(body.sendWelcomeMessage) };
    }
    case "updateTenant": { if (!tenant) throw new Error("Tenant not found"); Object.assign(tenant, body); tenant.audit.version += 1; return tenant; }
    case "suspendTenant": { if (!tenant) throw new Error("Tenant not found"); tenant.status = "SUSPENDED"; tenant.subscription.status = "SUSPENDED"; return { id: tenant.id, status: tenant.status, suspendedAt: new Date().toISOString(), effects: { tenantWritesBlocked: true, readsAllowed: true, reminderJobsStopped: true, tenantApiErrorCode: "SUBSCRIPTION_INACTIVE" } }; }
    case "reactivateTenant": { if (!tenant) throw new Error("Tenant not found"); tenant.status = "ACTIVE"; tenant.subscription.status = "ACTIVE"; return { id: tenant.id, status: tenant.status, reactivatedAt: new Date().toISOString(), effects: { tenantWritesBlocked: false, reminderJobsStopped: false } }; }
    case "goLive": { if (!tenant) throw new Error("Tenant not found"); if (!tenant.provisioning.readyToGoLive) throw new Error("Complete payment gateway setup before go-live."); tenant.status = "ACTIVE"; tenant.goLiveAt = new Date().toISOString(); return { ok: true, checklist: ["PAYMENT_GATEWAY", "GO_LIVE"].map((key) => ({ key, done: true })), tenant: { id: tenant.id, status: tenant.status, goLiveAt: tenant.goLiveAt } }; }
    case "ownerCredentials": return { ownerId: tenant?.owner.id, temporaryPassword: "Rj8#pQ2wLm", mustSetPassword: true, mustChangePassword: true };
    case "usage": return tenant?.usageDetail;
    case "flags": return { flags: tenant?.flags ?? {}, effectiveFlags: tenant?.effectiveFlags ?? {} };
    case "saveFlags": { if (!tenant) throw new Error("Tenant not found"); tenant.flags = { ...tenant.flags, ...body.flags }; tenant.effectiveFlags = { ...tenant.effectiveFlags, ...body.flags }; return { flags: tenant.flags, effectiveFlags: tenant.effectiveFlags, version: ++tenant.audit.version }; }
    case "digitalMetalsStatus":
      return {
        tenantId: params.tenantId,
        operations: {
          digitalMetalsEnabled: false,
          digitalMetalsPaused: false,
          digitalMetalsPlatformPaused: false,
          digitalMetalsTermsVersion: "",
        },
        entitlement: { planEntitled: false, featureKey: "digitalMetals" },
        capability: {
          canViewHoldings: false,
          canPlaceNewBuy: false,
          blockers: [{ code: "PLAN_NOT_ENTITLED", message: "Not entitled" }],
        },
      };
    case "digitalMetalsTaxApprove":
      return { tenantId: params.tenantId, approved: Boolean(body.approve) };
    case "digitalMetalsTermsPublish":
      return { tenantId: params.tenantId, termsVersion: body.termsVersion };
    case "pauseDigitalMetals": {
      if (!tenant) throw new Error("Tenant not found");
      return {
        digitalMetalsPlatformPaused: Boolean(body.pause),
        digitalMetalsPlatformPauseReason: body.pause ? String(body.reason ?? "Paused by platform") : "",
      };
    }
    case "playStoreReviewOtp": {
      if (!tenant) throw new Error("Tenant not found");
      const enabled = Boolean(body.enabled);
      tenant.settings = { ...(tenant.settings ?? {}), playStoreReviewOtpEnabled: enabled };
      return {
        playStoreReviewOtpEnabled: enabled,
        reviewOtpCode: enabled ? "123456" : null,
        version: 1,
      };
    }
    case "productModules": {
      if (!tenant) throw new Error("Tenant not found");
      const settings = { ...(tenant.settings ?? {}) };
      if (body.enableAll === true) {
        settings.ecommerceEnabled = true;
        settings.ecommercePaymentsRolloutEnabled = true;
        settings.digitalMetalsEnabled = true;
      } else {
        if (body.ecommerce !== undefined) settings.ecommerceEnabled = body.ecommerce === true;
        if (body.ecommercePayments !== undefined) {
          settings.ecommercePaymentsRolloutEnabled = body.ecommercePayments === true;
        }
        if (body.digitalMetals !== undefined) settings.digitalMetalsEnabled = body.digitalMetals === true;
      }
      tenant.settings = settings;
      return { tenantId: params.tenantId, version: ++tenant.audit.version };
    }
    case "saveGateway": { if (!tenant) throw new Error("Tenant not found"); tenant.integrations.paymentGateway = { configured: true, clientCredentialsConfigured: Boolean(body.clientId && body.clientSecret), provider: "PHONEPE", clientIdMasked: body.clientId ? `${String(body.clientId).slice(0, 4)}••••SDK` : null, environment: body.environment || "SANDBOX", verificationStatus: "PENDING", lastVerifiedAt: null }; tenant.provisioning.paymentGatewayConfigured = true; tenant.provisioning.readyToGoLive = true; return tenant.integrations.paymentGateway; }
    case "verifyGateway": { if (!tenant) throw new Error("Tenant not found"); tenant.integrations.paymentGateway.verificationStatus = "VERIFIED"; tenant.provisioning.paymentGatewayConfigured = true; return { verified: true, verificationStatus: "VERIFIED", verifiedAt: new Date().toISOString() }; }
    case "saveMessageCentral": {
      if (!tenant) throw new Error("Tenant not found");
      tenant.integrations.messageCentral = {
        configured: true,
        provider: "MESSAGE_CENTRAL",
        customerIdMasked: body.customerId ? `${String(body.customerId).slice(0, 3)}••••` : null,
        email: body.email ?? null,
        countryCode: body.countryCode ?? "91",
        flowType: body.flowType ?? "SMS",
        otpLength: body.otpLength ?? 6,
        verificationStatus: "NOT_VERIFIED",
        lastVerifiedAt: null,
      };
      return tenant.integrations.messageCentral;
    }
    case "verifyMessageCentral": {
      if (!tenant) throw new Error("Tenant not found");
      if (!tenant.integrations.messageCentral) {
        tenant.integrations.messageCentral = {
          configured: true,
          provider: "MESSAGE_CENTRAL",
          verificationStatus: "VERIFIED",
          lastVerifiedAt: new Date().toISOString(),
        };
      } else {
        tenant.integrations.messageCentral.verificationStatus = "VERIFIED";
        tenant.integrations.messageCentral.lastVerifiedAt = new Date().toISOString();
      }
      return {
        verified: true,
        verificationStatus: "VERIFIED",
        verifiedAt: new Date().toISOString(),
        ...(body.testMobile ? { testMobile: body.testMobile, deliveryStatus: "SENT" } : {}),
      };
    }
    case "changePlan": { if (!tenant) throw new Error("Tenant not found"); const plan = platformPlans.find((row) => row.id === body.subscriptionPlanId); if (plan) tenant.subscription.tier = plan.tier; tenant.subscription.billingCycle = body.billingCycle ?? tenant.subscription.billingCycle; return tenant.subscription; }
    case "updateLimits": { if (!tenant) throw new Error("Tenant not found"); return { tier: tenant.subscription.tier, limitOverrides: body.limitOverrides ?? {}, featureOverrides: body.featureOverrides ?? {}, version: ++tenant.audit.version }; }
    case "extendSubscription": { if (!tenant) throw new Error("Tenant not found"); return { status: body.extensionType === "GRACE" ? "GRACE" : "ACTIVE", currentPeriodEnd: "2026-10-15", graceEndsAt: body.extensionType === "GRACE" ? "2026-10-15T00:00:00Z" : null, extendedDays: body.days }; }
    case "cancelSubscription": { if (!tenant) throw new Error("Tenant not found"); tenant.subscription.status = "CANCELLED"; return { status: "CANCELLED", cancelledAt: new Date().toISOString(), currentPeriodEnd: tenant.subscription.currentPeriodEnd }; }
    case "invoices": return platformInvoices[String(params.tenantId)] ?? [];
    case "createInvoice": { const amount = Number(body.amountPaise ?? body.lineItems?.reduce((sum: number, item: any) => sum + Number(item.amountPaise), 0) ?? 0); const tax = Math.round(amount * Number(body.taxPercent ?? 18) / 100); const row: any = { id: `inv_${Date.now()}`, invoiceNumber: `PLT/2026/${300 + Date.now() % 100}`, subtotal: { amountPaise: amount, amountDisplay: `₹${(amount / 100).toLocaleString("en-IN")}` }, tax: { amountPaise: tax, amountDisplay: `₹${(tax / 100).toLocaleString("en-IN")}` }, total: { amountPaise: amount + tax, amountDisplay: `₹${((amount + tax) / 100).toLocaleString("en-IN")}` }, status: "UNPAID", dueDate: body.dueDate, paidAt: null }; (platformInvoices[String(params.tenantId)] ??= []).unshift(row); return row; }
    case "markInvoicePaid": { for (const list of Object.values(platformInvoices)) { const invoice = list.find((row) => row.id === String(params.invoiceId)); if (invoice) { invoice.status = "PAID"; invoice.paidAt = new Date().toISOString(); return invoice; } } throw new Error("Invoice not found"); }
    case "auditLogs": return auditLogs.filter((row) => !params.tenantId || row.tenant?.id === params.tenantId);
    case "webhookFailures": return webhookFailures.filter((row) => !params.provider || params.provider === "ALL" || row.provider === params.provider);
    case "retryWebhook": { const row = webhookFailures.find((item) => item.id === String(params.id)); if (row) { row.attempts += 1; row.status = "FAILED"; } return { id: params.id, queued: true }; }
    case "errorLogs": return errorLogs.filter((row) => !params.tenantId || row.tenantId === params.tenantId);

    // --- Demo Builder ---
    case "registerDemoTemplate": {
      const source = byTenant(body.approvedSourceTenantId);
      if (!source) throw new Error("Source tenant not found");
      if (!source.id) throw new Error("Source tenant not found");
      const id = `dtpl_${Date.now()}`;
      const created = {
        id,
        name: String(body.name ?? "Untitled template"),
        approvedSourceTenantId: String(body.approvedSourceTenantId),
        currentPublishedVersionId: null,
        status: "DRAFT" as const,
        createdBy: "pusr_ops",
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      platformDemoTemplates.unshift(created);
      platformDemoTemplateVersions[id] = [];
      return { template: created, sourceTenant: { id: source.id, code: source.tenantCode, name: source.businessName } };
    }
    case "demoTemplates": return platformDemoTemplates;
    case "demoTemplate": {
      const row = byDemoTemplate(params.templateId);
      if (!row) throw new Error("Demo template not found");
      return row;
    }
    case "demoTemplateVersions": return platformDemoTemplateVersions[String(params.templateId)] ?? [];
    case "publishDemoTemplateVersion": {
      const template = byDemoTemplate(params.templateId);
      if (!template) throw new Error("Demo template not found");
      const versions = (platformDemoTemplateVersions[template.id] ??= []);
      const nextVersion = (versions[0]?.version ?? 0) + 1;
      const created = {
        id: `dtplv_${template.id}_${nextVersion}`,
        templateId: template.id,
        version: nextVersion,
        schemaVersion: "demo-slice-1",
        status: "PUBLISHED" as const,
        checksum: `sha256-mock-${nextVersion}`,
        manifest: { counts: { Branch: 2, Customer: 45, SchemePlan: 6, Scheme: 58, Payment: 300, LedgerEntry: 300 } },
        dateAnchor: new Date().toISOString(),
        publishedBy: "pusr_ops",
        publishedAt: new Date().toISOString(),
        failureReason: null,
        createdAt: new Date().toISOString(),
      };
      versions.unshift(created);
      template.currentPublishedVersionId = created.id;
      template.status = "ACTIVE";
      template.updatedAt = new Date().toISOString();
      return created;
    }
    case "createDemoInstance": {
      const template = byDemoTemplate(body.templateId);
      if (!template) throw new Error("Demo template not found");
      if (!template.currentPublishedVersionId) throw new Error("This template has no published version yet.");
      const id = `dins_${Date.now()}`;
      const created = {
        id,
        publicId: `pub_${Math.random().toString(36).slice(2, 12)}`,
        prospectName: String(body.prospectName ?? "Demo prospect"),
        prospectContactMobile: body.prospectContactMobile ?? null,
        branding: body.branding ?? {},
        templateVersionId: template.currentPublishedVersionId,
        activeTenantId: `tnt_demo_${id}`,
        activeGenerationId: "dgen_1",
        status: "READY" as const,
        expiresAt: new Date(Date.now() + (Number(body.expiryDays) || 30) * 86400000).toISOString(),
        createdBy: "pusr_ops",
        linkVersion: 1,
        disabledAt: null,
        lastOpenedAt: null,
        version: 1,
        createdAt: new Date().toISOString(),
      };
      platformDemoInstances.unshift(created);
      return { instance: created, linkSecret: `mock-link-secret-${id}` };
    }
    case "demoInstances": {
      const status = params.status ? String(params.status) : null;
      const rows = platformDemoInstances.filter((row) => !status || row.status === status);
      return { rows, meta: { total: rows.length, limit: rows.length } };
    }
    case "demoInstance": {
      const row = byDemoInstance(params.instanceId);
      if (!row) throw new Error("Demo instance not found");
      return row;
    }
    case "updateDemoInstance": {
      const row = byDemoInstance(params.instanceId);
      if (!row) throw new Error("Demo instance not found");
      const { prospectName, prospectContactMobile, branding } = body;
      if (prospectName !== undefined) row.prospectName = prospectName;
      if (prospectContactMobile !== undefined) row.prospectContactMobile = prospectContactMobile;
      if (branding) {
        row.branding = { ...row.branding, ...branding, revision: (row.branding.revision ?? 1) + 1 };
      }
      row.version += 1;
      return row;
    }
    case "rotateDemoLink": {
      const row = byDemoInstance(params.instanceId);
      if (!row) throw new Error("Demo instance not found");
      row.linkVersion += 1;
      return { instance: row, linkSecret: `mock-link-secret-rotated-${row.id}-${row.linkVersion}` };
    }
    case "copyDemoLink": {
      const row = byDemoInstance(params.instanceId);
      if (!row) throw new Error("Demo instance not found");
      return { publicId: row.publicId, linkSecret: `mock-link-secret-${row.id}` };
    }
    case "disableDemoInstance": {
      const row = byDemoInstance(params.instanceId);
      if (!row) throw new Error("Demo instance not found");
      row.status = "DISABLED";
      row.disabledAt = new Date().toISOString();
      return row;
    }
    case "reactivateDemoInstance": {
      const row = byDemoInstance(params.instanceId);
      if (!row) throw new Error("Demo instance not found");
      if (row.status !== "DISABLED") throw new Error("Only a disabled demo instance can be reactivated.");
      row.status = "READY";
      row.disabledAt = null;
      return row;
    }
    case "presignDemoLogoUpload": {
      const uploadId = `upl_demo_${Date.now()}`;
      return {
        uploadId,
        uploadUrl: `http://localhost:4050/api/v1/platform/demo/uploads/${uploadId}/content`,
        method: "PUT",
        headers: { "Content-Type": String(body.contentType ?? "image/png") },
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        completeUrl: `/platform/demo/uploads/${uploadId}/complete`,
      };
    }
    case "completeDemoLogoUpload": {
      const uploadId = String(params.uploadId ?? `upl_demo_${Date.now()}`);
      return { uploadId, status: "UPLOADED", viewUrl: `/uploads/${uploadId}` };
    }
    case "landingDemoRequests": return { rows: [], meta: { total: 0, limit: Number(params.limit) || 20, offset: Number(params.offset) || 0 } };
    case "landingDemoRequest":
    case "patchLandingDemoRequest":
    case "landingDemoShareLink":
    case "retryLandingDemoProvision":
      throw new Error("Landing demo requests are not available in mock mode.");
    default: throw new Error(`Unknown platform mock request: ${mockKey}`);
  }
}
