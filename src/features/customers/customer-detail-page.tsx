"use client";

import { useState } from "react";
import {
  Coins,
  Download,
  Gift,
  IndianRupee,
  Pencil,
  Plus,
  Scale,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toastApiError } from "@/src/lib/api-error";
import { validatePaymentLinkAmount } from "@/src/lib/payment-form-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import {
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { PermissionGate } from "@/src/components/common/permission-gate";
import { ACTION } from "@/src/lib/action-permissions";
import { PaymentDialog } from "@/src/features/payments/payment-dialog";
import { CreateEnrollmentDialog } from "@/src/features/customers/create-enrollment-dialog";
import { CustomerStatusDialog } from "@/src/features/customers/customer-status-dialog";
import { EditCustomerDialog } from "@/src/features/customers/edit-customer-dialog";
import { EntityAuditTab } from "@/src/features/audit/entity-audit-tab";
import { ManageNomineeDialog } from "@/src/features/customers/manage-nominee-dialog";
import { ReviewKycDialog } from "@/src/features/customers/review-kyc-dialog";
import {
  EnrollmentLink,
  ReceiptLink,
} from "@/src/components/common/portal-entity-links";
import { PortalBackLink } from "@/src/components/common/portal-back-link";
import { downloadBlobUrl, downloadText } from "@/src/lib/download";
import { goldLedgerColumns } from "@/src/components/common/gold-payment-columns";
import { idempotencyKey, money } from "@/src/lib/format";
import {
  canViewEcommerceHistoricalWorkspace,
  resolveEcommerceServerAccess,
} from "@/src/lib/ecommerce-entitlement";
import { hasPermission } from "@/src/lib/permissions";
import { useAppSelector } from "@/src/store/hooks";
import { CustomerEcommerceOrdersTab } from "@/src/features/customers/customer-ecommerce-orders-tab";
import { CustomerDigitalMetalsTab } from "@/src/features/customers/customer-digital-metals-tab";
import {
  DigiGoldPortfolioCard,
  DigiGoldSummaryPanel,
  StorePortfolioCard,
  StoreSummaryPanel,
} from "@/src/features/customers/customer-commerce-overview";
import { CounterBuyMetalDialog } from "@/src/features/customers/counter/counter-buy-metal-dialog";
import { CounterSellMetalDialog } from "@/src/features/customers/counter/counter-sell-metal-dialog";
import { CounterStoreOrderDialog } from "@/src/features/customers/counter/counter-store-order-dialog";
import { SellCashPayoutButton } from "@/src/features/customers/counter/sell-cash-payout-button";
import {
  canViewDigitalMetalsWorkspace,
  resolveDigitalMetalsServerAccess,
} from "@/src/lib/digital-metals-entitlement";
import { paymentHasGoldAccrual } from "@/src/lib/gold-payment-display";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import {
  useCreatePaymentLinkMutation,
  useGetCustomerMessagesQuery,
  useGetCustomerPaymentsQuery,
  useGetCustomerQuery,
  useGetCustomerEcommerceOrdersMetaQuery,
  useGetCustomerEcommerceSummaryQuery,
  useGetDigitalMetalsCustomerSummaryQuery,
  useGetCustomerSchemesQuery,
  useGetSubscriptionQuery,
  useGetSettingsOperationsQuery,
  useGetDigitalMetalsCapabilityQuery,
  useLazyGetCustomerStatementQuery,
  useLazyGetPaymentReceiptQuery,
  useSetCustomerPasswordMutation,
} from "@/src/store/api/admin-api";

export function CustomerDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [nomineeOpen, setNomineeOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [buyMetalOpen, setBuyMetalOpen] = useState(false);
  const [sellMetalOpen, setSellMetalOpen] = useState(false);
  const [storeOrderOpen, setStoreOrderOpen] = useState(false);
  const [tab, setTab] = useState("summary");
  const [statusMode, setStatusMode] = useState<
    "deactivate" | "block" | "restore"
  >("deactivate");
  const [createPaymentLink, createLinkState] = useCreatePaymentLinkMutation();
  const [setCustomerPassword] = useSetCustomerPasswordMutation();
  const [fetchStatement, statementState] = useLazyGetCustomerStatementQuery();
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();
  const sessionUser = useAppSelector((s) => s.session.session?.user);
  const subscriptionQuery = useGetSubscriptionQuery();
  const operationsQuery = useGetSettingsOperationsQuery();
  const ecommerceAccess = resolveEcommerceServerAccess(
    subscriptionQuery.data,
    operationsQuery.data,
  );
  const canEcommerceRead = hasPermission(sessionUser, "ecommerce.read");
  const customerQuery = useGetCustomerQuery(id);
  const ecommerceOrdersMetaQuery = useGetCustomerEcommerceOrdersMetaQuery(
    { customerId: id },
    { skip: !canEcommerceRead },
  );
  const showEcommerceOrdersTab =
    canEcommerceRead
    && (canViewEcommerceHistoricalWorkspace(ecommerceAccess)
      || ecommerceOrdersMetaQuery.data?.hasOrderHistory === true);
  const dmCapability = useGetDigitalMetalsCapabilityQuery(undefined, {
    skip: !hasPermission(sessionUser, "digital-metals.read"),
  });
  const dmAccess =
    (dmCapability.data as import("@/src/lib/digital-metals-entitlement").DigitalMetalsServerAccessState | undefined)
    ?? resolveDigitalMetalsServerAccess(subscriptionQuery.data, operationsQuery.data);
  const showDigitalMetalsTab =
    hasPermission(sessionUser, "digital-metals.read")
    && canViewDigitalMetalsWorkspace(dmAccess);
  const dmSummaryQuery = useGetDigitalMetalsCustomerSummaryQuery(id, {
    skip: !showDigitalMetalsTab,
  });
  const storeSummaryQuery = useGetCustomerEcommerceSummaryQuery(id, {
    skip: !showEcommerceOrdersTab,
  });
  const canDmTrade =
    showDigitalMetalsTab
    && hasPermission(sessionUser, "digital-metals.assisted.trade")
    && dmAccess?.active !== false
    && dmAccess?.paused !== true;
  const canDmApprove = hasPermission(sessionUser, "digital-metals.sell.approve");
  const canStoreOrder =
    showEcommerceOrdersTab
    && hasPermission(sessionUser, "ecommerce.assisted.order")
    && ecommerceAccess?.active !== false;
  const schemesOverviewQuery = useGetCustomerSchemesQuery({
    customerId: id,
    limit: 100,
  });
  const schemePager = useCursorPagination(8, `${id}|schemes`);
  const paymentPager = useCursorPagination(8, `${id}|payments`);
  const messagePager = useCursorPagination(8, `${id}|messages`);
  const schemesQuery = useGetCustomerSchemesQuery({
    customerId: id,
    ...schemePager.queryParams,
  });
  const paymentsQuery = useGetCustomerPaymentsQuery({
    customerId: id,
    ...paymentPager.queryParams,
  });
  const messagesQuery = useGetCustomerMessagesQuery({
    customerId: id,
    ...messagePager.queryParams,
  });
  if (customerQuery.isLoading || schemesOverviewQuery.isLoading)
    return <PageSkeleton cards={5} />;
  if (customerQuery.isError || !customerQuery.data)
    return (
      <QueryError
        onRetry={customerQuery.refetch}
        title="Customer record is unavailable"
        error={customerQuery.error}
      />
    );
  const customer = customerQuery.data;
  const schemesOverview = schemesOverviewQuery.data?.items ?? [];
  const schemes = schemesQuery.data?.items ?? [];
  const payments = paymentsQuery.data?.items ?? [];
  const showGoldLedger = payments.some((p) => paymentHasGoldAccrual(p));
  const messages = messagesQuery.data?.items ?? [];
  const schemePage = schemesQuery.data?.page ?? emptyPageMeta();
  const paymentPage = paymentsQuery.data?.page ?? emptyPageMeta();
  const messagePage = messagesQuery.data?.page ?? emptyPageMeta();
  const lifetime =
    customer.lifetimePaid ??
    schemesOverview.reduce((sum, s) => sum + Number(s.paid ?? 0), 0);
  const isLiveEnrollment = (status: string) =>
    ["ACTIVE", "LOCKED", "DEFAULTED"].includes(status);
  const liveOverview = schemesOverview.filter((x) => isLiveEnrollment(x.status));
  // Only live enrollments count; redeemed/closed schemes owe nothing.
  const remainingOnPlans = liveOverview.reduce(
    (sum, s) => sum + Number(s.outstanding ?? 0),
    0,
  );
  const dueNow = liveOverview.reduce(
    (sum, s) => sum + Number((s as { dueNow?: number }).dueNow ?? 0),
    0,
  );
  const payableEnrollments = schemesOverview.filter(
    (x) =>
      isLiveEnrollment(x.status) &&
      x.canRecordPayment !== false,
  );
  const activeSchemes = schemesOverview.filter((x) =>
    isLiveEnrollment(x.status),
  );
  const overdueSchemes = activeSchemes.filter(
    (s) => Number((s as { dueNow?: number }).dueNow ?? 0) > 0,
  );
  const nextDueScheme =
    activeSchemes.find((s) => s.nextDue && s.nextDue !== "—") ??
    activeSchemes[0] ??
    schemesOverview[0];
  const paymentLinkScheme =
    (nextDueScheme?.id
      ? payableEnrollments.find((s) => s.id === nextDueScheme.id)
      : undefined) ??
    payableEnrollments.find((s) => Number(s.outstanding ?? 0) > 0) ??
    payableEnrollments[0];

  async function handleSendPaymentLink() {
    if (!paymentLinkScheme?.id) {
      toast.error("No payable enrollment to attach a payment link to");
      return;
    }
    try {
      const amountPaise = Math.round(
        Number(
          paymentLinkScheme.nextDueAmount ??
            paymentLinkScheme.installment ??
            0,
        ) * 100,
      );
      if (!amountPaise) {
        toast.error("No payable installment amount on the selected enrollment");
        return;
      }
      const linkAmountErr = validatePaymentLinkAmount(amountPaise / 100);
      if (linkAmountErr) {
        toast.error(linkAmountErr);
        return;
      }
      const link = await createPaymentLink({
        schemeId: paymentLinkScheme.id,
        amountPaise,
        idempotencyKey: idempotencyKey(),
      }).unwrap();
      toast.success(`Payment link sent · expires ${link.expiresAt}`);
    } catch (err) {
      toastApiError(err, "Could not create payment link");
    }
  }

  async function handleDownloadStatement() {
    try {
      const result = await fetchStatement(id).unwrap();
      downloadBlobUrl(
        `${customer.customerNo}-statement.pdf`,
        result.blobUrl,
      );
    } catch {
      toast.error("Could not download statement");
    }
  }

  async function handleDownloadReceipt(paymentId: string, receiptNo: string) {
    try {
      const result = await fetchReceipt(paymentId).unwrap();
      if (result.kind === "blob") {
        const ext = result.contentType.includes("pdf") ? "pdf" : "bin";
        downloadBlobUrl(`${receiptNo}.${ext}`, result.blobUrl);
      } else {
        downloadText(
          `${receiptNo}.json`,
          JSON.stringify(result.payload, null, 2),
          "application/json;charset=utf-8",
        );
      }
    } catch {
      toast.error("Could not download receipt");
    }
  }

  return (
    <>
      <EditCustomerDialog
        customer={customer}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <CreateEnrollmentDialog
        customer={customer}
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
      />
      <ReviewKycDialog
        customer={customer}
        open={kycOpen}
        onOpenChange={setKycOpen}
      />
      <ManageNomineeDialog
        customer={customer}
        open={nomineeOpen}
        onOpenChange={setNomineeOpen}
      />
      <CustomerStatusDialog
        customer={customer}
        liveActiveSchemes={activeSchemes.length}
        open={statusOpen}
        onOpenChange={setStatusOpen}
        mode={statusMode}
      />
      {canDmTrade ? (
        <>
          <CounterBuyMetalDialog
            open={buyMetalOpen}
            onOpenChange={setBuyMetalOpen}
            customerId={id}
            customerName={customer.name}
            rates={dmSummaryQuery.data?.rates ?? []}
          />
          <CounterSellMetalDialog
            open={sellMetalOpen}
            onOpenChange={setSellMetalOpen}
            customerId={id}
            customerName={customer.name}
            rates={dmSummaryQuery.data?.rates ?? []}
            holdings={dmSummaryQuery.data?.holdings ?? []}
            canApprove={canDmApprove}
          />
        </>
      ) : null}
      {canStoreOrder ? (
        <CounterStoreOrderDialog
          open={storeOrderOpen}
          onOpenChange={setStoreOrderOpen}
          customerId={id}
          customerName={customer.name}
        />
      ) : null}
      <PortalBackLink fallbackHref="/customers">← Back</PortalBackLink>
      <PageHeader
        eyebrow="Customer record"
        title={customer.name}
        description={`${customer.customerNo} · ${customer.phone} · ${customer.branch}`}
        actions={
          <>
            <PermissionGate permission={ACTION.customerWrite}>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil />
                Edit profile
              </Button>
            </PermissionGate>
            <PaymentDialog
              customerId={id}
              customer={customer.name}
              disabled={payableEnrollments.length === 0}
            />
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={Gift}
          label="Active schemes"
          value={activeSchemes.length}
          detail={
            overdueSchemes.length
              ? `${overdueSchemes.length} with an amount due now`
              : "Nothing due right now"
          }
        />
        <StatCard
          icon={IndianRupee}
          label="Lifetime paid"
          value={money(lifetime)}
          detail={`Across ${schemesOverview.length} enrollment${schemesOverview.length === 1 ? "" : "s"} (all time)`}
          tone="wine"
        />
        <StatCard
          icon={IndianRupee}
          label="Due now"
          value={money(dueNow)}
          detail={`${money(remainingOnPlans)} still to pay over the plan${liveOverview.length === 1 ? "" : "s"}`}
          tone={dueNow > 0 ? "red" : "green"}
        />
        <StatCard
          icon={Gift}
          label="Next due"
          value={
            nextDueScheme?.nextDue && nextDueScheme.nextDue !== "—"
              ? nextDueScheme.nextDue
              : customer.nextDue !== "—"
                ? customer.nextDue
                : "—"
          }
          detail={`${nextDueScheme?.plan ?? "Scheme"} · ${money(
            nextDueScheme?.nextDueAmount ??
              nextDueScheme?.installment ??
              customer.nextDueAmount ??
              0,
          )}`}
          tone="gold"
        />
        <StatCard
          icon={ShieldCheck}
          label="KYC"
          value={customer.kyc === "VERIFIED" ? "Verified" : customer.kyc === "REJECTED" ? "Rejected" : "Pending"}
          detail={customer.kyc === "VERIFIED" ? "Identity verified" : customer.kyc === "REJECTED" ? "Ask the customer to resubmit" : "Not verified yet"}
          tone={customer.kyc === "VERIFIED" ? "green" : "gold"}
        />
      </div>
      {showDigitalMetalsTab || showEcommerceOrdersTab ? (
        <div className={showDigitalMetalsTab && showEcommerceOrdersTab ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
          {showDigitalMetalsTab ? (
            <DigiGoldPortfolioCard
              summary={dmSummaryQuery.data}
              loading={dmSummaryQuery.isLoading}
              canTrade={canDmTrade}
              onBuy={() => setBuyMetalOpen(true)}
              onSell={() => setSellMetalOpen(true)}
            />
          ) : null}
          {showEcommerceOrdersTab ? (
            <StorePortfolioCard
              summary={storeSummaryQuery.data}
              loading={storeSummaryQuery.isLoading}
              canOrder={canStoreOrder}
              onNewOrder={() => setStoreOrderOpen(true)}
            />
          ) : null}
        </div>
      ) : null}
      <Surface>
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="font-bold text-[#1a1014]">Customer tools</h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              Joined {customer.joined} · {customer.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
              <PermissionGate permission={ACTION.schemeEnrol}>
                <Button
                  size="sm"
                  className="shrink-0"
                  data-tour="customer-enrol"
                  onClick={() => setEnrollOpen(true)}
                >
                  <Plus />
                  Create enrollment
                </Button>
              </PermissionGate>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 bg-[#f3eef0] text-foreground hover:bg-[#ebe3e6]"
                disabled={createLinkState.isLoading || !paymentLinkScheme?.id}
                onClick={() => void handleSendPaymentLink()}
              >
                <Send />
                Send payment link
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 bg-[#f3eef0] text-foreground hover:bg-[#ebe3e6]"
                disabled={statementState.isFetching}
                onClick={() => void handleDownloadStatement()}
              >
                <Download />
                Download passbook
              </Button>
              <PermissionGate permission={ACTION.customerPasswordWrite}>
                <ActionDialog
                  trigger={
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0 bg-[#f3eef0] text-foreground hover:bg-[#ebe3e6]"
                    >
                      Set customer password
                    </Button>
                  }
                  title="Set customer password"
                  description="Set a numeric password for this customer (minimum 4 digits)."
                  actionLabel="Save password"
                  submitDisabled={!/^\d{4,128}$/.test(password.trim())}
                  onSubmit={async () => {
                    await setCustomerPassword({
                      id: customer.id,
                      password: password.trim(),
                    }).unwrap();
                    setPassword("");
                    toast.success("Customer password updated");
                  }}
                  onOpenChange={(open) => {
                    if (!open) setPassword("");
                  }}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New password</label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value.replace(/\D/g, "").slice(0, 128))
                      }
                      placeholder="Min. 4 digits"
                    />
                  </div>
                </ActionDialog>
              </PermissionGate>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => {
                  if (
                    customer.status === "BLOCKED" ||
                    customer.status === "INACTIVE"
                  ) {
                    setStatusMode("restore");
                  } else {
                    setStatusMode("deactivate");
                  }
                  setStatusOpen(true);
                }}
              >
                {customer.status === "BLOCKED"
                  ? "Unblock"
                  : customer.status === "INACTIVE"
                    ? "Reactivate"
                    : "Deactivate"}
              </Button>
              {customer.status === "ACTIVE" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={() => {
                    setStatusMode("block");
                    setStatusOpen(true);
                  }}
                >
                  Block customer
                </Button>
              ) : null}
          </div>
        </div>
      </Surface>
      <PageTabs value={tab} onValueChange={setTab}>
        <PageTabsBar sectionLabel="Customer views">
          <PageTab value="summary">Summary</PageTab>
          <PageTab value="schemes">Schemes</PageTab>
          <PageTab value="payments">Contributions</PageTab>
          {showEcommerceOrdersTab ? (
            <PageTab value="ecommerce-orders">Orders</PageTab>
          ) : null}
          {showDigitalMetalsTab ? (
            <PageTab value="digital-metals">Digital metals</PageTab>
          ) : null}
          <PageTab value="messages">Messages</PageTab>
          <PageTab value="profile">Customer</PageTab>
          <PageTab value="audit">Activity & audit</PageTab>
        </PageTabsBar>
        <PageTabsPanel value="summary">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
            <Surface
              title="Customer overview"
              description="Identity and servicing position"
            >
              <dl className="grid gap-x-8 gap-y-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Customer ID", customer.customerNo],
                  ["Phone", customer.phone],
                  ["Email", customer.email],
                  ["Primary branch", customer.branch],
                  ["Joined", customer.joined],
                  ["KYC", customer.kyc],
                  ["Status", customer.status],
                  ["Address", customer.address],
                  ["Nominee", customer.nominee ?? "Not added"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="mt-1 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </Surface>
            <Surface
              title="Scheme position"
              description="Current enrollment progress"
            >
              <div className="space-y-4 p-5">
                {schemesOverview.map((scheme) => (
                  <button
                    key={scheme.id}
                    onClick={() => router.push(`/enrollments/${scheme.id}`)}
                    className="w-full rounded-xl border p-4 text-left hover:border-[#9f6673]"
                  >
                    <div className="flex items-center justify-between">
                      <strong>{scheme.plan}</strong>
                      <StatusBadge status={scheme.status} />
                    </div>
                    <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                      <span>
                        {scheme.progress} of {scheme.tenure} cycles
                      </span>
                      <span>{money(scheme.paid)}</span>
                    </div>
                    <Progress
                      className="mt-2"
                      value={(scheme.progress / scheme.tenure) * 100}
                    />
                  </button>
                ))}
              </div>
            </Surface>
          </div>
          {(showDigitalMetalsTab && dmSummaryQuery.data) || (showEcommerceOrdersTab && storeSummaryQuery.data) ? (
            <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
              {showDigitalMetalsTab && dmSummaryQuery.data ? (
                <DigiGoldSummaryPanel summary={dmSummaryQuery.data} onOpenTab={() => setTab("digital-metals")} />
              ) : null}
              {showEcommerceOrdersTab && storeSummaryQuery.data ? (
                <StoreSummaryPanel summary={storeSummaryQuery.data} onOpenTab={() => setTab("ecommerce-orders")} />
              ) : null}
            </div>
          ) : null}
        </PageTabsPanel>
        <PageTabsPanel value="schemes">
          <Surface title="Enrollments" description="Active and past schemes">
            <PaginatedDataTable
              rows={schemes}
              page={schemePage}
              pageIndex={schemePager.pageIndex}
              onNext={() => schemePager.goNext(schemePage.nextCursor)}
              onPrevious={schemePager.goPrevious}
              canPrevious={schemePager.canPrevious}
              onRowClick={(r) => router.push(`/enrollments/${r.id}`)}
              columns={[
                {
                  key: "no",
                  header: "Enrollment",
                  render: (r) => (
                    <EnrollmentLink schemeId={r.id}>
                      {r.enrollmentNo}
                    </EnrollmentLink>
                  ),
                },
                {
                  key: "plan",
                  header: "Scheme",
                  render: (r) => <strong>{r.plan}</strong>,
                },
                {
                  key: "progress",
                  header: "Progress",
                  render: (r) => `${r.progress} / ${r.tenure}`,
                },
                { key: "paid", header: "Paid", render: (r) => money(r.paid) },
                { key: "next", header: "Next due", render: (r) => r.nextDue },
                {
                  key: "maturity",
                  header: "Maturity",
                  render: (r) => r.maturity,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => <StatusBadge status={r.status} />,
                },
              ]}
            />
          </Surface>
        </PageTabsPanel>
        {showEcommerceOrdersTab ? (
          <PageTabsPanel value="ecommerce-orders">
            <CustomerEcommerceOrdersTab customerId={id} />
          </PageTabsPanel>
        ) : null}
        {showDigitalMetalsTab ? (
          <PageTabsPanel value="digital-metals">
            <CustomerDigitalMetalsTab
              customerId={id}
              actions={
                canDmTrade ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setBuyMetalOpen(true)}>
                      <Coins />
                      Buy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSellMetalOpen(true)}
                      disabled={!dmSummaryQuery.data?.holdings.some((h) => Number(h.availableUg) > 0)}
                    >
                      <Scale />
                      Sell
                    </Button>
                  </>
                ) : null
              }
              sellAction={canDmTrade ? (row) => <SellCashPayoutButton row={row} /> : undefined}
            />
          </PageTabsPanel>
        ) : null}
        <PageTabsPanel value="payments">
          <Surface
            title="Contribution ledger"
            description="Receipts are generated from immutable payment records"
          >
            <PaginatedDataTable
              rows={payments}
              page={paymentPage}
              pageIndex={paymentPager.pageIndex}
              onNext={() => paymentPager.goNext(paymentPage.nextCursor)}
              onPrevious={paymentPager.goPrevious}
              canPrevious={paymentPager.canPrevious}
              columns={[
                {
                  key: "date",
                  header: "Date",
                  className: "whitespace-nowrap w-[1%] pr-6",
                  render: (r) => r.date,
                },
                {
                  key: "receipt",
                  header: "Receipt",
                  className: "whitespace-nowrap",
                  render: (r) => (
                    <ReceiptLink paymentId={r.id} receiptNo={r.receiptNo}>
                      <strong>{r.receiptNo}</strong>
                    </ReceiptLink>
                  ),
                },
                {
                  key: "enrollment",
                  header: "Enrollment",
                  className: "whitespace-nowrap",
                  render: (r) =>
                    r.enrollmentNo && r.enrollmentNo !== "—" ? (
                      <EnrollmentLink schemeId={r.schemeId}>
                        {r.enrollmentNo}
                      </EnrollmentLink>
                    ) : (
                      "—"
                    ),
                },
                {
                  key: "mode",
                  header: "Mode",
                  className: "whitespace-nowrap",
                  render: (r) => r.mode.replaceAll("_", " "),
                },
                {
                  key: "recordedBy",
                  header: "Recorded by",
                  className: "whitespace-nowrap",
                  render: (r) => r.staff,
                },
                {
                  key: "source",
                  header: "Source",
                  className: "whitespace-nowrap",
                  render: (r) =>
                    r.source === "STAFF"
                      ? "Staff app"
                      : r.source === "ADMIN"
                        ? "Admin panel"
                        : "Customer app",
                },
                {
                  key: "amount",
                  header: "Amount",
                  className: "whitespace-nowrap text-right",
                  render: (r) => money(r.amount),
                },
                ...(showGoldLedger ? goldLedgerColumns<(typeof payments)[number]>() : []),
                {
                  key: "status",
                  header: "Status",
                  className: "whitespace-nowrap",
                  render: (r) => <StatusBadge status={r.status} />,
                },
                {
                  key: "download",
                  header: "",
                  className: "w-[1%] whitespace-nowrap text-right",
                  render: (r) => (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDownloadReceipt(r.id, r.receiptNo);
                      }}
                    >
                      <Download />
                      Receipt
                    </Button>
                  ),
                },
              ]}
            />
          </Surface>
        </PageTabsPanel>
        <PageTabsPanel value="messages">
          <Surface
            title="WhatsApp history"
            description="Delivery, read and failure status"
          >
            <PaginatedDataTable
              rows={messages}
              page={messagePage}
              pageIndex={messagePager.pageIndex}
              onNext={() => messagePager.goNext(messagePage.nextCursor)}
              onPrevious={messagePager.goPrevious}
              canPrevious={messagePager.canPrevious}
              columns={[
                { key: "date", header: "Date", render: (r) => r.date },
                {
                  key: "type",
                  header: "Message",
                  render: (r) => r.type.replaceAll("_", " "),
                },
                { key: "channel", header: "Channel", render: (r) => r.channel },
                { key: "cost", header: "Cost", render: (r) => money(r.cost) },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => <StatusBadge status={r.status} />,
                },
              ]}
            />
          </Surface>
        </PageTabsPanel>
        <PageTabsPanel value="profile">
          <Surface title="Customer, KYC and nominee">
            <div className="grid gap-5 p-6 md:grid-cols-3">
              <div className="rounded-xl border p-5">
                <UserRound className="mb-3 size-6 text-[#730321]" />
                <h3 className="font-bold">Personal details</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {customer.phone}
                  <br />
                  {customer.email}
                  <br />
                  {customer.address}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setEditOpen(true)}
                >
                  Edit details
                </Button>
              </div>
              <div className="rounded-xl border p-5">
                <ShieldCheck className="mb-3 size-6 text-emerald-700" />
                <h3 className="font-bold">KYC</h3>
                <div className="mt-2">
                  <StatusBadge status={customer.kyc} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {customer.kycDetail?.type ?? "Not submitted"}
                  {customer.kycDetail?.submittedAt
                    ? ` · submitted ${customer.kycDetail.submittedAt}`
                    : ""}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setKycOpen(true)}
                >
                  {customer.kyc === "VERIFIED"
                    ? "View KYC"
                    : customer.kycDetail?.status === "SUBMITTED"
                      ? "Review documents"
                      : "Upload & review"}
                </Button>
              </div>
              <div className="rounded-xl border p-5">
                <Gift className="mb-3 size-6 text-[#9a6f2a]" />
                <h3 className="font-bold">Nominee</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {customer.nomineeDetail ? (
                    <>
                      {customer.nomineeDetail.name}
                      <br />
                      {customer.nomineeDetail.relationshipLabel} ·{" "}
                      {customer.nomineeDetail.mobile}
                      {customer.nomineeDetail.notes ? (
                        <>
                          <br />
                          {customer.nomineeDetail.notes}
                        </>
                      ) : null}
                    </>
                  ) : (
                    "No nominee configured"
                  )}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setNomineeOpen(true)}
                >
                  {customer.nomineeDetail ? "Manage nominee" : "Add nominee"}
                </Button>
              </div>
            </div>
          </Surface>
        </PageTabsPanel>
        <PageTabsPanel value="audit">
          <EntityAuditTab entityType="customer" entityId={customer.id} />
        </PageTabsPanel>
      </PageTabs>
    </>
  );
}
