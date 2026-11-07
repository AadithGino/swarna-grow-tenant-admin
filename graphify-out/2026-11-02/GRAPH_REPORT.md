# Graph Report - SwarnaGrow-Tenant-Admin  (2026-11-02)

## Corpus Check
- 701 files · ~522,817 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .css 2, .example 1)

## Summary
- 5763 nodes · 21859 edges · 197 communities (184 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 161 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c55de04`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- QueryError
- Button
- cn
- customer-tenant.ts
- customer-scheme-detail-page.tsx
- toastApiError
- platform-tenant-detail-page.tsx
- Textarea
- Surface
- PageHeader
- create-customer-dialog.tsx
- api-error.ts
- money
- customer-digital-metals-redeem-pages.tsx
- customer-shop-page.tsx
- digital-metals-redemption-pages.tsx
- contract-adapters.ts
- customer-api.ts
- agent-session-slice.ts
- FormFieldError
- Button
- agent-api.ts
- domain.ts
- mock-server.ts
- useCustomerTenant
- input.tsx
- redemption-detail-sheet.tsx
- portal-router.tsx
- StatusBadge
- platform-tenant-create-page.tsx
- admin-api.ts
- platform-tenant-subscription-usage-section.tsx
- utils.ts
- platform-tenant-subscription-form-validation.ts
- ecommerce-courier-cod-workspace-page.tsx
- providers.tsx
- tour-provider.tsx
- commerce-demo-mocks.ts
- digital-metals-config-page.tsx
- customer-router.tsx
- customer-scheme-detail-views.tsx
- ecommerce-orders-list-page.tsx
- env.ts
- plan-detail-page.tsx
- manage-nominee-dialog.tsx
- customer-commerce-mocks.ts
- package.json
- customer-make-payment-sheet.tsx
- customer-shop-order-page.tsx
- customer-activity-pages.tsx
- customer-ui.tsx
- global-search-dialog.tsx
- ecommerce-banners-page.tsx
- customer-payment-adapter.ts
- dependencies
- Customer Digital Gold & Silver UI overhaul (2026-10-21)
- platform-tenant-template-form-validation.ts
- plan-builder-wizard.tsx
- sidebar.tsx
- platform-api.ts
- SwarnaGrow Customer API Guide for Flutter
- grievance-detail-sheet.tsx
- settlement-dialogs.tsx
- session-slice.ts
- reverse-payment-dialog.tsx
- plan-builder-form.ts
- settings-page.tsx
- auth-refresh-api.ts
- auth-logout.ts
- platform-api.ts
- platform-phonepe-integration-form-validation.ts
- Confirmed findings and required fixes
- customer-support-pages.tsx
- DataTable
- AssistantMessage.tsx
- StatusBadge
- useAssistantChat.ts
- EcommerceProductDialogBody
- registry.ts
- customer-plan-detail-page.tsx
- customer-plan-detail-page.tsx
- page-parts.tsx
- platform-subscription-plan-form-validation.ts
- compilerOptions
- pnpm-workspace.yaml
- 14 — Dashboard & Reports
- settings-operations-panel.tsx
- digital-metals-config-page.tsx
- components.json
- package-source-export.mjs
- customer-payments-page.tsx
- admin-shell.tsx
- tour-overlay.tsx
- counter-trade-mocks.ts
- vite.config.ts
- pnpm-install.mjs
- ecommerce-fulfilment-page.tsx
- cash-settlement-basis.ts
- carousel.tsx
- ecommerce-order-return-journey.tsx
- plain-language-labels.ts
- customer-import.ts
- form.tsx
- sites-env.sh
- mark-cash-submitted-dialog.tsx
- types.ts
- context-menu.tsx
- dom.ts
- plan-builder-validation.ts
- pagination.tsx
- chart.tsx
- ecommerce-cancellation.ts
- customer-shop-order-progress.tsx
- scripts
- platform-login-page.tsx
- 06 — Enrolment & Scheme Accounts
- 02 — Auth & Jeweller Onboarding
- 16 — Customer Grievances & Support Requests
- 07 — Payments, Links, Webhooks, Receipts
- digital-metals-procurement-page.tsx
- 05 — Scheme Plans (templates)
- platform-plans-page.tsx
- customer-profile-nominee-page.tsx
- commerce-demo-images.ts
- gold-payment-display.ts
- install-pnpm.sh
- assistant-panel-geometry.ts
- permission-catalog.ts
- admin-report-mocks.ts
- ecommerce-payment-blockers.ts
- EcommerceOrderDetailPage
- 9. Error codes
- eslint.config.mjs
- 04 — Customers
- install-ci.sh
- plan-usage-card.tsx
- ecommerce-order-presenters.ts
- drawer.tsx
- ref_node_path
- cloudflare-env.d.ts
- ecommerce-order-ui.tsx
- 12 — Customer Mobile App
- 11. Shared objects
- postcss.config.mjs
- build-verified.sh
- post-settlement-refund-case-dialog.tsx
- {
  useResolveTenantQuery, useRequestCustomerOtpMutation, useVerifyCustomerOtpMutation, useLoginCustomerPasswordMutation,
  useGetCustomerHomeQuery, useGetCustomerProfileQuery, useUpdateCustomerProfileMutation,
  useCompleteCustomerProfileMutation, usePresignCustomerUploadMutation, useCompleteCustomerUploadMutation, useGetCustomerUploadDownloadQuery, useLazyGetCustomerUploadDownloadQuery, useGetPublicCustomerUploadDownloadQuery, useSubmitCustomerKycMutation,
  useUpdateCustomerNomineeMutation, useRemoveCustomerNomineeMutation,
  useGetCustomerPlansQuery, useGetCustomerPlanQuery, useGetCustomerSchemesQuery, useGetCustomerPastSchemesQuery, useGetCustomerSchemeQuery, useGetCustomerPassbookQuery, useGetCustomerPayableRangeQuery, useLazyGetCustomerPayableRangeQuery, useGetCustomerSettlementPreviewQuery,
  useEnrolCustomerSchemeMutation, useInitiateCustomerPaymentMutation, useInitiatePublicPaymentLinkMutation,
  useLazyPollCustomerPaymentIntentQuery, useLazyPollPublicPaymentLinkQuery,
  useGetCustomerPaymentsQuery, useGetCustomerPaymentQuery,
  useGetCustomerNotificationsQuery, useMarkCustomerNotificationReadMutation, useMarkAllCustomerNotificationsReadMutation,
  useGetCustomerGrievancesQuery, useGetCustomerGrievanceQuery, useCreateCustomerGrievanceMutation,
  useReplyCustomerGrievanceMutation, useGetCustomerDevicesQuery, useRevokeCustomerDeviceMutation,
  useCustomerLogoutMutation,
  useGetCustomerDigitalMetalsCapabilityQuery,
  useGetCustomerDigitalMetalsPortfolioQuery,
  useGetCustomerDigitalMetalsPassbookQuery,
  useGetCustomerDigitalMetalsStatementQuery,
  useGetCustomerDigitalMetalsDocumentQuery,
  useFindCustomerDigitalMetalsDocumentBySubjectQuery,
  useRequestCustomerDigitalMetalsDocumentMutation,
  useRetryCustomerDigitalMetalsDocumentMutation,
  useGetCustomerDigitalMetalsDocumentDownloadUrlMutation,
  useCreateDigitalMetalsBuyQuoteMutation,
  useCreateDigitalMetalsBuyOrderMutation,
  useGetCustomerDigitalMetalsBuyOrderQuery,
  useGetCustomerDigitalMetalsBuyOrdersQuery,
  useGetCustomerDigitalMetalsSellOrdersQuery,
  useGetCustomerDigitalMetalsRedemptionOrdersQuery,
  useGetCustomerDigitalMetalsOpenOrdersSummaryQuery,
  useCreateDigitalMetalsBuyPaymentIntentMutation,
  useLazyPollDigitalMetalsBuyPaymentIntentQuery,
  useCompleteDigitalMetalsTestHarnessPaymentMutation,
  useCreateCustomerDigitalMetalsSellQuoteMutation,
  useCreateCustomerDigitalMetalsSellOrderMutation,
  useConfirmCustomerDigitalMetalsSellOrderMutation,
  useCancelCustomerDigitalMetalsSellOrderMutation,
  useGetCustomerDigitalMetalsSellOrderQuery,
  useGetCustomerDigitalMetalsSellOrderPayoutStatusQuery,
  useGetCustomerDigitalMetalsBankDestinationsQuery,
  useCreateCustomerDigitalMetalsBankDestinationMutation,
  usePatchCustomerDigitalMetalsBankDestinationMutation,
  useGetCustomerDigitalMetalsRedemptionCatalogueQuery,
  useGetCustomerDigitalMetalsDeliveryAddressesQuery,
  useCreateCustomerDigitalMetalsDeliveryAddressMutation,
  useCreateCustomerDigitalMetalsRedemptionQuoteMutation,
  useCreateCustomerDigitalMetalsRedemptionOrderMutation,
  useGetCustomerDigitalMetalsRedemptionOrderQuery,
  useGetCustomerDigitalMetalsRedemptionFulfilmentQuery,
  useGetCustomerDigitalMetalsRedemptionPickupInstructionsQuery,
  useCreateCustomerDigitalMetalsRedemptionPaymentIntentMutation,
  useLazyPollDigitalMetalsRedemptionPaymentIntentQuery,
  useCompleteCustomerDigitalMetalsRedemptionTestHarnessPaymentMutation,
  useCancelCustomerDigitalMetalsRedemptionOrderMutation,
  useGetShopCategoriesQuery,
  useGetCustomerGoldRateQuery, useGetCustomerGoldHistoryQuery, useGetCustomerBranchesQuery,
  useRequestCustomerRedemptionMutation,
  useRegisterCustomerFcmTokenMutation,
  useGetHomeBannersQuery,
  useGetShopBannersQuery,
  useGetShopAvailabilityQuery,
  useGetShopStorePoliciesQuery,
  useGetShopProductsQuery,
  useLazyGetShopProductsQuery,
  useGetShopProductQuery,
  useGetShopCartQuery,
  usePutShopCartMutation,
  useGetShopFulfilmentOptionsQuery,
  useGetShopAddressesQuery,
  useCreateShopAddressMutation,
  useCreateShopQuoteMutation,
  useGetShopQuoteQuery,
  useCancelShopQuoteMutation,
  useCreateShopOrderMutation,
  useListShopOrdersQuery,
  useGetShopOrderQuery,
  useCreateShopOrderPaymentIntentMutation,
  useLazyPollShopOrderPaymentIntentQuery,
  useCompleteShopTestHarnessPaymentMutation,
  useCancelShopOrderMutation,
  useCreateShopCancellationRequestMutation,
  useGetShopOrderReturnQuery,
  useCreateShopReturnRequestMutation,
}
- { usePlatformLoginMutation, usePlatformLogoutMutation, useGetPlatformDashboardQuery, useGetPlatformChartQuery, useGetPlatformPlansQuery, useGetPlatformPlanQuery, useSavePlatformPlanMutation, useDeprecatePlatformPlanMutation, useGetPlatformTenantsQuery, useGetPlatformTenantQuery, useCreatePlatformTenantMutation, useUpdatePlatformTenantMutation, useSuspendPlatformTenantMutation, useReactivatePlatformTenantMutation, useGoLivePlatformTenantMutation, useResetOwnerCredentialsMutation, useGetPlatformUsageQuery, useGetPlatformFlagsQuery, useSavePlatformFlagsMutation, usePausePlatformDigitalMetalsMutation, useGetPlatformDigitalMetalsStatusQuery, useApprovePlatformDigitalMetalsTaxMutation, usePublishPlatformDigitalMetalsTermsMutation, useSavePaymentIntegrationMutation, useVerifyPaymentIntegrationMutation, useSaveMessageCentralIntegrationMutation, useVerifyMessageCentralIntegrationMutation, useChangeTenantPlanMutation, useUpdateTenantLimitsMutation, useExtendTenantSubscriptionMutation, useCancelTenantSubscriptionMutation, useGetTenantInvoicesQuery, useCreateTenantInvoiceMutation, useMarkPlatformInvoicePaidMutation, useGetPlatformAuditLogsQuery, useGetWebhookFailuresQuery, useLazyGetWebhookFailuresQuery, useRetryWebhookFailureMutation, useGetPlatformErrorLogsQuery, useGetPlatformLivenessHealthQuery, useGetPlatformReadinessHealthQuery }
- verify-source-export-manifest.mjs
- 00 — Conventions
- sla-chip.tsx
- 09 — Maturity, Redemption & Closure
- 11 — Cash Handover (staff → branch)
- 15 — UI Flows (designer's working document)
- ui-amount-conversion.ts
- SwarnaGrow demo credentials
- ecommerce-order.ts
- 2. Settlement preview
- 7. Money and weight
- 01 — Platform Admin (Super Admin)
- Types of jewellery savings schemes (market overview)
- customer-payable-summary.tsx
- 3. Amount rules — min and max, per mode
- Guided tours (on-screen walkthroughs)
- 13 — Staff Mobile App
- SwarnaGrow Portals
- customer-tenant-branding.ts
- 10 — Reminders & WhatsApp
- Ritu Gold and Diamonds — client demo (Palakkad)
- 6. Benefit block
- 2. Authentication
- Gold Scheme Platform — API Contract (v1)
- 3. Standard headers
- 08 — Dues, Overdues, Maturity, Lock-due
- 17 — Immutable Audit Timeline
- API integration map
- SwarnaGrow Tenant Admin (portals) — dev handoff (ecommerce branch snapshot)
- Customer portal implementation
- {
  useAgentLoginMutation,
  useAgentLogoutMutation,
  useGetAgentMeQuery,
  useGetAgentProfileQuery,
  useChangeAgentPasswordMutation,
  useGetAgentCashSummaryQuery,
  useGetAgentCollectionSummaryQuery,
  useGetAgentGoldRateQuery,
  useSearchAgentCustomersQuery,
  useGetAgentCustomerQuery,
  useLazyCheckAgentCustomerMobileQuery,
  useCreateAgentCustomerMutation,
  useGetAgentPlansQuery,
  useValidateAgentEnrolmentMutation,
  useEnrolAgentCustomerMutation,
  useGetAgentSchemeQuery,
  useGetAgentPayableRangeQuery,
  useGetAgentPassbookQuery,
  useRecordAgentPaymentMutation,
  useCreateAgentPaymentLinkMutation,
  useGetAgentNotificationsQuery,
  useGetAgentPaymentsQuery,
  useGetAgentPaymentQuery,
  useGetAgentPaymentsPageQuery,
  useGetAgentHandoversQuery,
  useGetAgentHandoverQuery,
  useCreateAgentHandoverMutation,
  useCancelAgentHandoverMutation,
  useGetAgentReportQuery,
}
- 03 — Tenant Configuration, Branches, Staff, Gold Rate
- vitest
- Customer and Collection Agent backend alignment
- Platform super-admin UI handoff
- plan-detail-mock.ts
- SwarnaGrow Collection Agent Portal
- Tenant Admin alignment — backend 8e014b7
- vercel.json
- check-guides.cjs
- alert.tsx
- overrides
- SelectContent
- DIGITAL_METALS_UI_GAP_CHECKLIST.md
- PRELAUNCH_FIXES_CURSOR_PROMPT.md
- SIDEKICK_FRONTEND_HANDOFF.md
- agent-collect-pages.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 727 edges
2. `Button()` - 406 edges
3. `react` - 254 edges
4. `Input()` - 221 edges
5. `lucide-react` - 217 edges
6. `toastApiError()` - 204 edges
7. `QueryError()` - 195 edges
8. `Surface()` - 183 edges
9. `PageSkeleton()` - 181 edges
10. `StatusBadge()` - 179 edges

## Surprising Connections (you probably didn't know these)
- `When KYC is on` --references--> `CustomerRegistrationGuard()`  [INFERRED]
  docs/CUSTOMER_PORTAL.md → src/components/customer/customer-registration-guard.tsx
- `UI patch included` --references--> `useAssistantChat()`  [INFERRED]
  docs/PRELAUNCH_REVIEW_2026-10-22.md → src/hooks/useAssistantChat.ts
- `Conversion rule (authoritative)` --references--> `ratePerGramPaise()`  [INFERRED]
  swarna-grow-api-contract-v1.2/00-conventions.md → src/lib/digital-metals-quote-preview.tsx
- `5. Gold-weight plan` --references--> `ratePerGramPaise()`  [INFERRED]
  swarna-grow-api-contract-v1.2/05-scheme-plans.md → src/lib/digital-metals-quote-preview.tsx
- `Mode-specific `modeDetails`` --references--> `ratePerGramPaise()`  [INFERRED]
  swarna-grow-api-contract-v1.2/09-redemption-closure.md → src/lib/digital-metals-quote-preview.tsx

## Import Cycles
- 3-file cycle: `src/lib/auth-base-query-refresh.ts -> src/lib/auth-logout.ts -> src/store/api/admin-api.ts -> src/lib/auth-base-query-refresh.ts`
- 3-file cycle: `src/lib/auth-base-query-refresh.ts -> src/lib/auth-logout.ts -> src/store/api/agent-api.ts -> src/lib/auth-base-query-refresh.ts`
- 3-file cycle: `src/lib/auth-base-query-refresh.ts -> src/lib/auth-logout.ts -> src/store/api/customer-api.ts -> src/lib/auth-base-query-refresh.ts`
- 3-file cycle: `src/lib/auth-base-query-refresh.ts -> src/lib/auth-logout.ts -> src/store/api/platform-api.ts -> src/lib/auth-base-query-refresh.ts`

## Communities (197 total, 13 thin omitted)

### Community 0 - "QueryError"
Cohesion: 0.06
Nodes (90): PortalLoading(), nextConfig, next, heroButtonClass, heroPrimaryButtonClass, HeroStat(), SectionHero(), DonutChart() (+82 more)

### Community 1 - "Button"
Cohesion: 0.07
Nodes (50): Dialog(), DialogBody(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogPortal() (+42 more)

### Community 2 - "cn"
Cohesion: 0.02
Nodes (113): AccordionContent(), AccordionItem(), AccordionTrigger(), Attachment(), AttachmentAction(), AttachmentActions(), AttachmentContent(), AttachmentDescription() (+105 more)

### Community 3 - "customer-tenant.ts"
Cohesion: 0.05
Nodes (65): customerTenantSlugFromPath(), isCustomerAuthSurface(), isCustomerPortalPath(), PortalLayout(), AgentShell(), CustomerFcmRegistrar(), resolveDeviceId(), KycStatusHero() (+57 more)

### Community 4 - "customer-scheme-detail-page.tsx"
Cohesion: 0.22
Nodes (9): CustomerPaymentLinkPage(), CustomerSchemeDetailPage(), FreeWindowBlocks(), LockedCycleBlock(), NextInstalmentCard(), normalizeSchemeMode(), PaymentScheduleBlock(), SchemeDetailModeBody() (+1 more)

### Community 5 - "toastApiError"
Cohesion: 0.04
Nodes (54): handlePollStatus(), handleReconcile(), submitUpload(), onReconfirm(), onCreate(), onHarnessComplete(), onContinue(), dmReviewPath() (+46 more)

### Community 6 - "platform-tenant-detail-page.tsx"
Cohesion: 0.10
Nodes (26): boolLabel(), CheckRow(), EditTenantDialog(), formatWhen(), Info(), MessageCentralCard(), phonePeFormFromTenant(), profileFormUnchanged() (+18 more)

### Community 7 - "Textarea"
Cohesion: 0.08
Nodes (47): dialogScrollShellClass, AMOUNT_CHIPS, CounterBuyMetalDialog(), close(), confirm(), requestQuote(), reset(), GRAM_CHIPS (+39 more)

### Community 8 - "Surface"
Cohesion: 0.05
Nodes (93): Surface(), PageTabs(), PageTabsBar(), PageTabsPanel(), PermissionGate(), formatLastLogin(), formatRoleLabel(), initialsFromName() (+85 more)

### Community 9 - "PageHeader"
Cohesion: 0.08
Nodes (53): AdminColumn, AdminTable(), alignClass(), ListPanel(), LoadMoreFooter(), SortState, ActiveFilter, FilterBar() (+45 more)

### Community 10 - "create-customer-dialog.tsx"
Cohesion: 0.13
Nodes (30): CustomerAddressInput(), CustomerAddressInputProps, CustomerEmailInput(), CustomerEmailInputProps, CustomerNameInput(), CustomerNameInputProps, CustomerPhoneInput(), CustomerPhoneInputProps (+22 more)

### Community 11 - "api-error.ts"
Cohesion: 0.14
Nodes (23): DialogTrigger(), ActionDialog(), ApiErrorCallout(), ApiErrorCalloutProps, AdminDigitalMetalsDirectPdfPanel(), onDownload(), EcommerceOrderFinancialReviewDialog(), apiErrorDetailLines() (+15 more)

### Community 12 - "money"
Cohesion: 0.09
Nodes (40): recharts, axisTickFormat(), barValueMax(), buildPercentStackRows(), ChartSeriesView(), chartSurfaceBodyClass(), chartTypeKey(), chartUsesFlexibleHeight() (+32 more)

### Community 13 - "customer-digital-metals-redeem-pages.tsx"
Cohesion: 0.08
Nodes (16): CustomerDigitalMetalsDirectPdfPanel(), onDownload(), CustomerDigitalMetalsRedeemReviewPage(), confirm(), formatCatalogueCharge(), fulfilmentTimelineSteps(), readRedemptionQuote(), REDEMPTION_PROGRESS_STATUSES (+8 more)

### Community 14 - "customer-shop-page.tsx"
Cohesion: 0.04
Nodes (80): CustomerPromoBanner, CustomerPromoBannerPlacement, CustomerPromoBanners(), PromoRailCard(), SHOP_PROMO_GRID_INSERT_AFTER, shouldShowShopPromoRail(), CartLineRow(), CustomerShopCartPage() (+72 more)

### Community 15 - "digital-metals-redemption-pages.tsx"
Cohesion: 0.05
Nodes (66): IdChip(), DetailLayout(), Fact(), FactGrid(), InfoList(), InfoRow(), Notice(), Timeline() (+58 more)

### Community 16 - "contract-adapters.ts"
Cohesion: 0.06
Nodes (62): initials(), adaptCustomer(), adaptCustomerList(), adaptDashboard(), adaptDashboardAttentionRows(), adaptDashboardChart(), adaptEnrollmentList(), adaptEnrollments() (+54 more)

### Community 17 - "customer-api.ts"
Cohesion: 0.07
Nodes (45): buildCustomerEnrolMockResponse(), CustomerEnrolMockResponse, resolveCustomerEnrolFirstInstallmentMode(), adaptCustomerGrievance(), adaptCustomerGrievanceList(), adaptMessage(), normalizeStatus(), STATUS_LABELS (+37 more)

### Community 18 - "agent-session-slice.ts"
Cohesion: 0.18
Nodes (11): agentAuthHeaders(), agentReceiptUrl(), downloadAgentPaymentReceipt(), clearAgentTokens(), StoredTokens, AGENT_ACCESS_KEY, AGENT_REFRESH_KEY, AGENT_SESSION_KEY (+3 more)

### Community 19 - "FormFieldError"
Cohesion: 0.04
Nodes (87): DateRangeFilter(), FormFieldError(), ListSearchInput(), SearchToolbar(), AttentionCard(), DashboardWidgetGrid(), formatWidgetDisplay(), iconFor (+79 more)

### Community 20 - "Button"
Cohesion: 0.06
Nodes (55): GlobalError(), Button(), buttonVariants, Calendar(), CalendarDayButton(), Input(), Label(), react (+47 more)

### Community 21 - "agent-api.ts"
Cohesion: 0.06
Nodes (70): EnrolValidationPreview, NONE, agentCashSummary, agentCollectionSummary, agentCustomers, agentGoldRate, agentHandovers, agentPayments (+62 more)

### Community 22 - "domain.ts"
Cohesion: 0.04
Nodes (64): BRANCH_PROFILES, defaultStaffProfile(), findBranchForStaff(), paiseDisplay(), STAFF_PROFILES, synthesizeBranchDetail(), synthesizeStaffDetail(), auditEvents (+56 more)

### Community 23 - "mock-server.ts"
Cohesion: 0.05
Nodes (60): decodeListCursor(), encodeListCursor(), listLimit(), paginateSlice(), DEMO_RANGE_FROM, DEMO_RANGE_TO, DEMO_TODAY, demoDayFromText() (+52 more)

### Community 24 - "useCustomerTenant"
Cohesion: 0.05
Nodes (83): Screen checklist (routed components), useCustomerTenant(), CustomerDigitalMetalsBankEditPage(), CustomerDigitalMetalsBankPage(), CustomerDigitalMetalsBuyOrderPage(), onPay(), CustomerDigitalMetalsBuyPage(), CustomerDigitalMetalsBuyReviewPage() (+75 more)

### Community 25 - "input.tsx"
Cohesion: 0.12
Nodes (27): CustomerKycSubmitForm(), Props, KycDocumentPreview(), mergeMessage(), ReviewKycDialog(), handleUpload(), uploadIdFromPath(), onImagePick() (+19 more)

### Community 26 - "redemption-detail-sheet.tsx"
Cohesion: 0.12
Nodes (21): buildTimelineSteps(), connectorTone(), DetailBlock(), EntityLinkCard(), RedemptionAuditTrail(), RedemptionDetailBody(), RedemptionDetailSheet(), RequestTimeline() (+13 more)

### Community 27 - "portal-router.tsx"
Cohesion: 0.05
Nodes (71): PortalPage(), AlertsPage, AuditPage, BranchDetailPage, CashControlPage, CollectionsPage, CustomerDetailPage, CustomersPage (+63 more)

### Community 28 - "StatusBadge"
Cohesion: 0.05
Nodes (74): Progress(), EnrolValidationPanel(), goldLedgerColumns(), PageSubTabsList(), ReceiptLink(), ACRONYMS, formatStatusLabel(), StatusBadge() (+66 more)

### Community 29 - "platform-tenant-create-page.tsx"
Cohesion: 0.13
Nodes (38): initialForm(), mergeFieldMessage(), PlatformTenantCreatePage(), Review(), steps, sanitizeIndianPhoneDigits(), validatePlatformLoginEmail(), livePlatformTenantFieldErrors() (+30 more)

### Community 30 - "admin-api.ts"
Cohesion: 0.09
Nodes (76): CounterOrderOptions, CustomerEcommerceSummary, DigitalMetalsDashboardSummary, mergePageMeta(), adminApi, ApiArgs, ApiRootState, appBaseQuery (+68 more)

### Community 31 - "platform-tenant-subscription-usage-section.tsx"
Cohesion: 0.10
Nodes (15): boolLabel(), defaultLimitOverrides(), Info(), TenantUsage(), fieldLabel(), PLATFORM_FLAG_LABELS, USAGE_AND_LIMIT_LABELS, flagsRecordUnchanged() (+7 more)

### Community 32 - "utils.ts"
Cohesion: 0.04
Nodes (52): Bubble(), BubbleContent(), BubbleGroup(), BubbleReactions(), bubbleReactionsVariants, bubbleVariants, ButtonGroup(), ButtonGroupSeparator() (+44 more)

### Community 33 - "platform-tenant-subscription-form-validation.ts"
Cohesion: 0.11
Nodes (23): CreatePlatformInvoiceDialog(), BILLING_CYCLES, ChangePlanForm, createPlatformInvoiceBodyForApi(), CreatePlatformInvoiceForm, defaultPlatformInvoiceDueDate(), emptyCreatePlatformInvoiceForm(), ExtendSubscriptionForm (+15 more)

### Community 34 - "ecommerce-courier-cod-workspace-page.tsx"
Cohesion: 0.13
Nodes (15): useEcommerceAdminAccess(), useEcommerceCatalogWrite(), useEcommerceEntitlement(), useEcommerceServerEntitlement(), courierEvidenceLabel(), CourierQueue, EcommerceCourierCodWorkspacePage(), formatAge() (+7 more)

### Community 35 - "providers.tsx"
Cohesion: 0.08
Nodes (20): inter, metadata, RootLayout(), Toaster(), next-themes@^0.4.6, react-redux@^9.3.0, next-themes, react-redux (+12 more)

### Community 36 - "tour-provider.tsx"
Cohesion: 0.14
Nodes (24): isActionStep(), isNavStep(), resolveIndex(), Run, TourContext, TourContextValue, TourProvider(), TourStartSource (+16 more)

### Community 37 - "commerce-demo-mocks.ts"
Cohesion: 0.07
Nodes (45): banks, BuySeed, buySeeds, commerceDemoMock(), contract(), daysAgo(), DEMO_GOLD_RATES_PAISE, demoBankQueue (+37 more)

### Community 38 - "digital-metals-config-page.tsx"
Cohesion: 0.14
Nodes (20): SectionTabs(), TrendChart(), TrendPoint, useWidth(), DigitalMetalsConfigPage(), RateRow, TABS, baseProps() (+12 more)

### Community 39 - "customer-router.tsx"
Cohesion: 0.07
Nodes (49): CustomerBranchesPage, CustomerDigitalMetalsBankEditPage, CustomerDigitalMetalsBankPage, CustomerDigitalMetalsBuyOrderPage, CustomerDigitalMetalsBuyPage, CustomerDigitalMetalsBuyReviewPage, CustomerDigitalMetalsDocumentPage, CustomerDigitalMetalsOrdersPage (+41 more)

### Community 40 - "customer-scheme-detail-views.tsx"
Cohesion: 0.14
Nodes (27): AuthoritativePassbookList(), BenefitTab(), displaySchemeNumber(), FixedHero(), FixedSchemeSummaryDock(), FixedSchemeTotalsCard(), FlexibleFreeHero(), FlexibleLockedHero() (+19 more)

### Community 41 - "ecommerce-orders-list-page.tsx"
Cohesion: 0.09
Nodes (32): CellStack(), InitialsAvatar(), FilterDateRange(), customerListLabel(), customerListSub(), orderLinePreview(), EcommerceOrdersPage(), PERIOD_OPTIONS (+24 more)

### Community 42 - "env.ts"
Cohesion: 0.08
Nodes (35): AuthProactiveRefresh(), REALMS, scheduleRealmRefresh(), env, onDownloadInvoice(), AssistantStreamError, AssistantStreamUnsupported, authHeaders() (+27 more)

### Community 43 - "plan-detail-page.tsx"
Cohesion: 0.12
Nodes (34): Badge(), badgeVariants, hasChartSeriesData(), amountRulesFields(), benefitFields(), FieldEntry, flexibleRulesFields(), goldRulesFields() (+26 more)

### Community 44 - "manage-nominee-dialog.tsx"
Cohesion: 0.19
Nodes (24): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogFooter(), AlertDialogHeader(), CustomerNomineeDialog(), profileToNomineeDetail(), RELATIONSHIPS (+16 more)

### Community 45 - "customer-commerce-mocks.ts"
Cohesion: 0.09
Nodes (43): demoCategories, demoDmCapability, demoOrderDetail(), demoRedemptionCatalogue, demoShop, addresses, ago(), availabilityOf() (+35 more)

### Community 46 - "package.json"
Cohesion: 0.06
Nodes (44): devDependencies, @cloudflare/vite-plugin@1.37.1, @cloudflare/workers-types@4.20260515.1, happy-dom@^20.0.11, nitro@3.0.260903-beta, react-server-dom-webpack@19.2.6, tailwindcss@4.2.1, @tailwindcss/postcss@4.2.1 (+36 more)

### Community 47 - "customer-make-payment-sheet.tsx"
Cohesion: 0.10
Nodes (26): CustomerMakePaymentSheet(), formatCycleLabel(), PhonePeMark(), SchemeGoldIcon(), CustomerPaymentStatusPage(), DetailRow(), formatPaidAt(), PhonePeMarkSmall() (+18 more)

### Community 48 - "customer-shop-order-page.tsx"
Cohesion: 0.19
Nodes (10): CustomerShopOrderPage(), onPay(), formatInr(), paymentUiState(), ShopOrderStatusHero(), readShopPaymentAttemptId(), readShopPaymentIdempotencyKey(), saveShopPaymentAttemptId() (+2 more)

### Community 49 - "customer-activity-pages.tsx"
Cohesion: 0.25
Nodes (10): CustomerNotificationsPage(), NotificationRow(), notificationTone(), NotificationTypeIcon(), formatNotificationTime(), groupCustomerNotificationsByDay(), NotificationDayGroup, resolveCustomerNotificationHref() (+2 more)

### Community 50 - "customer-ui.tsx"
Cohesion: 0.11
Nodes (29): CustomerHomeSchemeCard(), CustomerSchemeCard(), CustomerSchemesActiveCard(), CustomerSchemesPastCard(), displaySchemeNumber(), dueDateFromScheme(), findGoldBalance(), FlexiblePhaseBar() (+21 more)

### Community 51 - "global-search-dialog.tsx"
Cohesion: 0.25
Nodes (15): Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator() (+7 more)

### Community 52 - "ecommerce-banners-page.tsx"
Cohesion: 0.05
Nodes (52): BannerEditorRow, BannerPickerUiState, publishBlockers(), BannerRow, EcommerceBannersPage(), loadMoreBanners(), resetForm(), runStatus() (+44 more)

### Community 53 - "customer-payment-adapter.ts"
Cohesion: 0.18
Nodes (18): adaptCustomerPayment(), adaptCustomerPaymentList(), adaptCustomerSchemeDetail(), adaptCustomerSettlementPreview(), channelLabel(), CustomerPaymentsSummary, formatInr(), isValidMoneyRef() (+10 more)

### Community 54 - "dependencies"
Cohesion: 0.06
Nodes (36): dependencies, @base-ui/react@^1.7.0, clsx@2.1.1, cmdk@^1.1.1, date-fns@^4.4.0, @hookform/resolvers@^5.7.1, input-otp@^1.4.2, lucide-react@^1.31.0 (+28 more)

### Community 55 - "Customer Digital Gold & Silver UI overhaul (2026-10-21)"
Cohesion: 0.40
Nodes (4): Customer Digital Gold & Silver UI overhaul (2026-10-21), Remaining gaps, Tests (2026-10-21), Visual verification

### Community 56 - "platform-tenant-template-form-validation.ts"
Cohesion: 0.11
Nodes (23): defaultTemplateName(), livePlatformTenantTemplateFieldErrors(), META_TEMPLATE_ID_MAX, META_TEMPLATE_ID_MIN, META_TEMPLATE_NAME_MAX, META_TEMPLATE_NAME_MIN, normalizeApprovalStatus(), PlatformTenantTemplateForm (+15 more)

### Community 57 - "plan-builder-wizard.tsx"
Cohesion: 0.14
Nodes (29): allowedBenefitTypes(), amountSummaryLabel(), benefitSummaryLabel(), isPlanPreviewReady(), penaltyModeLabel(), PlanBuilderFormState, planPreviewInputKey(), valueBasisLabel() (+21 more)

### Community 58 - "sidebar.tsx"
Cohesion: 0.08
Nodes (32): SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupAction(), SidebarGroupContent(), SidebarGroupLabel() (+24 more)

### Community 59 - "platform-api.ts"
Cohesion: 0.07
Nodes (45): auditLogs, chartData, dashboardSummary, errorLogs, money(), platformInvoices, platformPlans, platformTenants (+37 more)

### Community 60 - "SwarnaGrow Customer API Guide for Flutter"
Cohesion: 0.05
Nodes (40): 10. Maturity, premature closure and redemption, 11. Notifications and FCM, 12. Branches and gold rate, 13. Grievances/support, 14. Read-only, maintenance and capability behavior, 15. Scenario handling checklist, 16. Complete customer endpoint index, 17. Flutter implementation rules (+32 more)

### Community 61 - "grievance-detail-sheet.tsx"
Cohesion: 0.13
Nodes (14): formatMessageTime(), GrievanceDetailBody(), GrievanceDetailSheet(), MessageBubble(), SlaChip(), GRIEVANCE_DESCRIPTION_MAX, GRIEVANCE_DESCRIPTION_MIN, GRIEVANCE_MESSAGE_MAX (+6 more)

### Community 62 - "settlement-dialogs.tsx"
Cohesion: 0.17
Nodes (19): CLOSURE_REASONS, hasGoldRateBlocker(), pickDefaultMode(), PrematureClosureDialog(), PrematureClosureDialogBody(), RedeemEnrollmentDialog(), REDEMPTION_MODE_OPTIONS, redemptionModeLabel() (+11 more)

### Community 63 - "session-slice.ts"
Cohesion: 0.13
Nodes (18): MOCK_OWNER_SESSION, MOCK_STARTER_SESSION, completeLogin(), clearAuthTokens(), DEFAULT_CAPABILITIES, portalSessionFromLogin(), storeAuthTokens(), clearTenantTokens() (+10 more)

### Community 64 - "reverse-payment-dialog.tsx"
Cohesion: 0.27
Nodes (12): AlertDialogContent(), AlertDialogDescription(), AlertDialogMedia(), AlertDialogOverlay(), AlertDialogPortal(), AlertDialogTitle(), ReversePaymentDialog(), livePaymentReversalReasonError() (+4 more)

### Community 65 - "plan-builder-form.ts"
Cohesion: 0.14
Nodes (23): amountRules(), availabilitySliceFromPlan(), benefitBlock(), BenefitTreatment, BenefitType, BonusBasis, buildPlanCreatePayload(), buildPlanPatchPayload() (+15 more)

### Community 66 - "settings-page.tsx"
Cohesion: 0.06
Nodes (45): FeaturePill(), formatBillingCycle(), SettingsPage(), USAGE_BAR, UsageCard(), UsageMeter, APP_DISPLAY_NAME_MAX, GOLD_PURITY_MAX (+37 more)

### Community 67 - "auth-refresh-api.ts"
Cohesion: 0.11
Nodes (27): apiUrl(), PERSIST, postRefreshOnce(), REFRESH_PATH, refreshErrorCode(), refreshRealmOnce(), coordinateTokenRefresh(), inFlight (+19 more)

### Community 68 - "auth-logout.ts"
Cohesion: 0.18
Nodes (16): AuthTokenSyncBridge(), handleCrossTabLogout(), isAgentAppPath(), isCustomerAppPath(), isPlatformAppPath(), isTenantAppPath(), realmForStorageKey(), clearPlatformAuthStorage() (+8 more)

### Community 69 - "platform-api.ts"
Cohesion: 0.11
Nodes (33): @reduxjs/toolkit, authRefreshGuard(), AuthRetryExtra, refreshAfterUnauthorized(), RefreshGuard, retryAuthorizedRequest(), shouldAttemptAuthRefresh(), shouldForceAuthLogout() (+25 more)

### Community 70 - "platform-phonepe-integration-form-validation.ts"
Cohesion: 0.15
Nodes (20): livePlatformPhonePeIntegrationFieldErrors(), PHONEPE_CLIENT_ID_MAX, PHONEPE_CLIENT_SECRET_MIN, PHONEPE_CLIENT_VERSION_MAX, PHONEPE_CLIENT_VERSION_MIN, PHONEPE_WEBHOOK_PASSWORD_MIN, PHONEPE_WEBHOOK_USERNAME_MAX, phonePeIntegrationBodyForApi() (+12 more)

### Community 71 - "Confirmed findings and required fixes"
Cohesion: 0.10
Nodes (20): Confirmed findings and required fixes, Ecommerce review boundary, F10 — P2: Payout/payable operational lists truncate without a cursor, F11 — P2: Checkout policy still defaults non-production to demo, F1 — P1: Assistant query filters override the authenticated branch, F2 — P1: Digital Metals idempotency replay is not customer-bound, F3 — P1: Query refinement changes the question being answered, F4 — P1: Uploaded source fails release checks (+12 more)

### Community 72 - "customer-support-pages.tsx"
Cohesion: 0.22
Nodes (11): CustomerGrievanceDetailPage(), formatMessageTime(), formatSlaBanner(), formatUpdatedAt(), isOpenTicket(), statusBadgeClass(), statusBadgeLabel(), SupportLotusMark() (+3 more)

### Community 73 - "DataTable"
Cohesion: 0.19
Nodes (20): Table(), TableBody(), TableCaption(), TableCell(), TableFooter(), TableHead(), TableHeader(), TableRow() (+12 more)

### Community 74 - "AssistantMessage.tsx"
Cohesion: 0.07
Nodes (56): CellValue, formatAssistantCell(), renderAssistantCell(), AssistantExportControl(), defaultSelectedFields(), exportFieldForTableKey(), exportFields(), ExportFormat (+48 more)

### Community 75 - "StatusBadge"
Cohesion: 0.07
Nodes (43): lucide-react, HeroStatusPill(), SellCashPayoutButton(), DigiGoldPortfolioCard(), DigiGoldSummaryPanel(), MiniFact(), PortfolioShell(), StorePortfolioCard() (+35 more)

### Community 76 - "useAssistantChat.ts"
Cohesion: 0.08
Nodes (34): AssistantConversationDrawer(), formatWhen(), AssistantFloatingWindow(), HeaderButton(), HOW_TO_EXAMPLES, LANGUAGE_EXAMPLES, SUGGESTED, AssistantPanel() (+26 more)

### Community 77 - "EcommerceProductDialogBody"
Cohesion: 0.12
Nodes (19): @testing-library/user-event, EcommerceProductDialog(), EcommerceProductDialogBody(), describePromotion(), persistProduct(), refreshPreview(), reloadProductAfterConflict(), ProductRow (+11 more)

### Community 78 - "registry.ts"
Cohesion: 0.13
Nodes (16): buildGuideCatalog(), BY_ID, searchTours(), SETUP_TASK_TOURS, TOUR_CATEGORY_LABEL, TOUR_CATEGORY_ORDER, TOURS, words() (+8 more)

### Community 79 - "customer-plan-detail-page.tsx"
Cohesion: 0.19
Nodes (15): contributionStat(), CustomerPlanDetailPage(), DetailLinkRow(), ExpandSection, FirstInstalmentTiles(), nextCyclePayDateLabel(), payoutLabel(), PlanDetailTopBar() (+7 more)

### Community 80 - "customer-plan-detail-page.tsx"
Cohesion: 0.21
Nodes (15): 7. Scheme details and payable range, Lists, Payable range, adaptCustomerSchemePlan(), adaptCustomerSchemePlanList(), amountBounds(), AmountSummaryObj, ApiPlan (+7 more)

### Community 81 - "page-parts.tsx"
Cohesion: 0.07
Nodes (36): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), Attestation rule, Completed surfaces, Screenshots (+28 more)

### Community 82 - "platform-subscription-plan-form-validation.ts"
Cohesion: 0.18
Nodes (18): DEFAULT_PLAN_FEATURES, DEFAULT_PLAN_LIMIT_KEYS, DEFAULT_PLAN_LIMITS, limitFieldKey(), livePlatformSubscriptionPlanFieldErrors(), PLAN_LIMIT_KEY_SET, PLAN_PRICE_PAISE_MAX, PLAN_SORT_ORDER_MAX (+10 more)

### Community 83 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 84 - "pnpm-workspace.yaml"
Cohesion: 0.11
Nodes (18): allowBuilds, esbuild, fsevents, sharp, unrs-resolver, workerd, cacheDir, enableGlobalVirtualStore (+10 more)

### Community 85 - "14 — Dashboard & Reports"
Cohesion: 0.13
Nodes (15): period(), 14 — Dashboard & Reports, 1. Endpoints, 2. Dashboard summary, 3. Dashboard charts, 4.1 Payment-mode alignment across all analytics, 4.3 Do not duplicate existing analytics, 4. Reports (+7 more)

### Community 86 - "settings-operations-panel.tsx"
Cohesion: 0.09
Nodes (20): SectionTab, CHECKOUT_BLOCKER_FIELD, CHECKOUT_BLOCKER_TAX_LINK, CheckoutBlocker, extractCheckoutBlockers(), EcommerceQuickLinks(), QUICK_LINKS, SettingsToggleRow (+12 more)

### Community 87 - "digital-metals-config-page.tsx"
Cohesion: 0.13
Nodes (20): currentMatchesSettingsAsset(), defaultFee(), DigitalMetalsSettingsEditor(), onSave(), FeeForm, feeFromApi(), feeToApi(), settingsIdentity() (+12 more)

### Community 88 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, registries, rsc (+9 more)

### Community 89 - "package-source-export.mjs"
Cohesion: 0.22
Nodes (10): allowedRelative(), collectFiles(), __dirname, files, gitLines(), listFile, outArg, repoRoot (+2 more)

### Community 90 - "customer-payments-page.tsx"
Cohesion: 0.17
Nodes (20): channelDisplayName(), ChannelMark(), CustomerPaymentDetailPage(), CustomerPaymentsPage(), DetailRow(), displaySchemeNumber(), displayTransactionId(), downloadReceipt() (+12 more)

### Community 91 - "admin-shell.tsx"
Cohesion: 0.07
Nodes (51): DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut() (+43 more)

### Community 92 - "tour-overlay.tsx"
Cohesion: 0.17
Nodes (15): CardPos, ExampleChip(), placeCard(), Rect, Size, TourOverlay(), TourPhase, useStage() (+7 more)

### Community 93 - "counter-trade-mocks.ts"
Cohesion: 0.24
Nodes (17): DEMO_DM_RATES, demoCommerceCustomerId(), demoOrders, AnyRow, contract(), counterQuotes, counterTradeMock(), customerHoldings() (+9 more)

### Community 94 - "vite.config.ts"
Cohesion: 0.15
Nodes (6): vinext@1.0.0-beta.5, vite@8.0.13, vinext, vite, localBindingConfig, rootDir

### Community 95 - "pnpm-install.mjs"
Cohesion: 0.18
Nodes (10): CACHE_SEEDS, holdInstallLocks(), InstallProgress, main(), openLock(), openReport(), OPERATIONAL_FAILURE_CODES, showLine() (+2 more)

### Community 96 - "ecommerce-fulfilment-page.tsx"
Cohesion: 0.17
Nodes (21): Checkbox(), PickupHandoverFixture(), rupeesToPaise(), checkoutTaxConfigPayload(), deliveryConfigIssues(), isDeliveryConfigured(), parseServiceablePincodes(), EcommerceFulfilmentPage() (+13 more)

### Community 97 - "cash-settlement-basis.ts"
Cohesion: 0.23
Nodes (13): SettlementCashBasisPanel(), CASH_SETTLEMENT_BASIS_OPTIONS, CashSettlementBasis, cashSettlementBasisLabel(), DEFAULT_CASH_SETTLEMENT_BASIS, DEFAULT_PAID_AMOUNT_BENEFIT_TREATMENT, PaidAmountBenefitTreatment, paidAmountCashFormulaNote() (+5 more)

### Community 98 - "carousel.tsx"
Cohesion: 0.16
Nodes (15): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+7 more)

### Community 99 - "ecommerce-order-return-journey.tsx"
Cohesion: 0.10
Nodes (27): InputGroupInput(), InputGroupTextarea(), Textarea(), ActiveCancellationBlock(), EcommerceOrderCancellationJourney(), refundConsequence(), stockConsequence(), EcommerceOrderReturnJourney() (+19 more)

### Community 100 - "plain-language-labels.ts"
Cohesion: 0.24
Nodes (9): orderFulfilmentPresentation, ECOMMERCE_ORDER_STATUS, formatFallbackStatus(), GENERAL_STATUS_LABELS, PLAIN_LANGUAGE_GLOSSARY, plainLanguageStatusLabel(), SELL_ORDER_STATUS, SELL_PAYMENT_DISPLAY (+1 more)

### Community 101 - "customer-import.ts"
Cohesion: 0.24
Nodes (9): CustomerFormFields, phoneToIndianFormDigits(), CustomerImportParseResult, CustomerImportRawRow, CustomerImportRow, CustomerImportValidateOptions, formErrorsToMessages(), splitCsvLine() (+1 more)

### Community 103 - "form.tsx"
Cohesion: 0.19
Nodes (12): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue, FormLabel() (+4 more)

### Community 104 - "sites-env.sh"
Cohesion: 0.14
Nodes (13): HOME, MINIFLARE_REGISTRY_PATH, npm_config_audit, npm_config_cache, npm_config_fund, npm_config_update_notifier, sites-env.sh script, SITES_ENV_READY (+5 more)

### Community 105 - "mark-cash-submitted-dialog.tsx"
Cohesion: 0.19
Nodes (18): AcceptHandoverDialog(), CashStaffRow, handoverAmountDefaults(), MarkCashSubmittedDialogInner(), moneyFromPaiseField(), staffMaxSubmit(), HANDOVER_REJECT_REASON_MIN, HANDOVER_REMARKS_MAX (+10 more)

### Community 106 - "types.ts"
Cohesion: 0.23
Nodes (16): Files, pickCustomer, field(), nav(), opener(), pickRow(), section(), submit() (+8 more)

### Community 107 - "context-menu.tsx"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 108 - "dom.ts"
Cohesion: 0.44
Nodes (13): cssEscape(), findByText(), findField(), findSection(), findTourElement(), firstVisible(), isForeign(), isVisible() (+5 more)

### Community 109 - "plan-builder-validation.ts"
Cohesion: 0.35
Nodes (13): parseSlabAmounts(), PLAN_CODE_PATTERN, validatePlanAmountRules(), validatePlanAvailability(), validatePlanBasics(), validatePlanBenefit(), validatePlanBuilderFull(), validatePlanBuilderStep() (+5 more)

### Community 110 - "pagination.tsx"
Cohesion: 0.28
Nodes (7): Pagination(), PaginationContent(), PaginationEllipsis(), PaginationLink(), PaginationLinkProps, PaginationNext(), PaginationPrevious()

### Community 111 - "chart.tsx"
Cohesion: 0.22
Nodes (12): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartStyle(), ChartTooltipContent(), getPayloadConfigFromPayload() (+4 more)

### Community 112 - "ecommerce-cancellation.ts"
Cohesion: 0.29
Nodes (6): EcommerceCancellationRequestStatus, EcommerceCancellationStockDisposition, EcommerceOrderCancellationCapabilities, EcommerceOrderCancellationRequest, EcommerceOrderCancellationView, ShopOrderCancellationAttachment

### Community 113 - "customer-shop-order-progress.tsx"
Cohesion: 0.22
Nodes (13): buildShopOrderTimeline(), customerPickupAcknowledged(), isCod(), isDelivery(), markAllStepsComplete(), OrderTimeline, pickupHandoverComplete(), ShopOrderProgressStepper() (+5 more)

### Community 114 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, build:vercel, dev, frozen-install, guides:check, guides:export, install:ci (+8 more)

### Community 115 - "platform-login-page.tsx"
Cohesion: 0.29
Nodes (12): mergeFieldMessage(), PlatformLoginPage(), hasPlatformSession(), persistPlatformTokens(), writePlatformTokenStorage(), livePasswordPinError(), validatePasswordPin(), livePlatformLoginEmailError() (+4 more)

### Community 116 - "06 — Enrolment & Scheme Accounts"
Cohesion: 0.07
Nodes (27): 06 — Enrolment & Scheme Accounts, 10. Scheme list, 11. Status transitions, 12. Customer app enrolment, 1. Endpoints, 2. Pre-enrolment validation, 3. The first-installment decision, 4. Enrol (+19 more)

### Community 117 - "02 — Auth & Jeweller Onboarding"
Cohesion: 0.08
Nodes (24): 02 — Auth & Jeweller Onboarding, 1. Jeweller self-signup, 2. Set password (first login), 3. Tenant user login (portal + staff app), 4. Customer OTP login (customer app), 5. Session & device management, 6. Logout, 7. Permission catalogue (+16 more)

### Community 118 - "16 — Customer Grievances & Support Requests"
Cohesion: 0.08
Nodes (23): 10. Cross-module surfaces, 11. Background jobs, 12. Acceptance criteria, 16 — Customer Grievances & Support Requests, 1. Endpoint map, 2. Enums, 3. Fixed SLA rules (not configurable), 4. Create a request (+15 more)

### Community 119 - "07 — Payments, Links, Webhooks, Receipts"
Cohesion: 0.09
Nodes (21): 07 — Payments, Links, Webhooks, Receipts, 10. Payment list, 11. Customer app payment, 1. Endpoints, 2.1 Storage and migration, 2.2 Payment intents (flexible-average online payments), 2. Record a payment, 4. Public payment landing (+13 more)

### Community 120 - "digital-metals-procurement-page.tsx"
Cohesion: 0.12
Nodes (15): useDigitalMetalsServerEntitlement(), ENTRY_TYPES, TYPE_LABELS, typeLabel(), AttentionItem, DOMAIN_LABEL, formatInr(), PaymentsNeedingAttentionPage() (+7 more)

### Community 121 - "05 — Scheme Plans (templates)"
Cohesion: 0.15
Nodes (12): 05 — Scheme Plans (templates), 10. List & detail, 1. Endpoints, 2. The plan object, 4. Flexible plan rules, 5. Gold-weight plan, 7. Redemption rules block, 8. Plan editing rules (+4 more)

### Community 122 - "platform-plans-page.tsx"
Cohesion: 0.16
Nodes (20): formatLimitLabel(), PlanCard(), PlanDialog(), PlanField(), PlatformPlansPage(), emptyPlatformSubscriptionPlanForm(), isKnownPlanLimitKey(), parsePlanLimitInput() (+12 more)

### Community 123 - "customer-profile-nominee-page.tsx"
Cohesion: 0.26
Nodes (11): buildNomineeNotes(), CustomerProfileNomineePage(), dobDisplayToIso(), isoToDobDisplay(), NomineeFieldCard(), NomineePlainInput(), NomineeValueTrack(), parseNomineeNotes() (+3 more)

### Community 124 - "commerce-demo-images.ts"
Cohesion: 0.28
Nodes (7): ART, bannerSvg(), cache, demoArtDataUri(), DemoArtKind, demoUploadUrl(), TONES

### Community 125 - "gold-payment-display.ts"
Cohesion: 0.26
Nodes (9): GoldBookedDateCell(), GoldRateCell(), GoldWeightCell(), formatGoldPurchaseDate(), formatRatePerGram(), formatWeight(), goldAccrualFromAdminPayment(), readGoldAccrual() (+1 more)

### Community 126 - "install-pnpm.sh"
Cohesion: 0.39
Nodes (7): acquire_shared_lock(), can_write_directory(), release_shared_lock(), report_store(), install-pnpm.sh script, XDG_CACHE_HOME, XDG_DATA_HOME

### Community 127 - "assistant-panel-geometry.ts"
Cohesion: 0.36
Nodes (6): ASSISTANT_PANEL_DEFAULT, ASSISTANT_PANEL_MIN, AssistantPanelGeometry, clampAssistantGeometry(), defaultAssistantGeometry(), readAssistantGeometry()

### Community 128 - "permission-catalog.ts"
Cohesion: 0.26
Nodes (11): ALL_PERMISSION_KEYS, groupStaffPermissions(), isFullAccess(), KNOWN_PERMISSION_KEYS, normalizeStaffPermissions(), PERMISSION_GROUP_LABELS, PERMISSION_GROUP_ORDER, PERMISSION_LABELS (+3 more)

### Community 129 - "admin-report-mocks.ts"
Cohesion: 0.24
Nodes (9): amt(), branchCollectionRows(), BUILDERS, paise(), ReportPayload, scope, wt(), mockDb (+1 more)

### Community 130 - "ecommerce-payment-blockers.ts"
Cohesion: 0.39
Nodes (6): CapabilityBlocker, ECOMMERCE_PAYMENT_GATE_CODES, ECOMMERCE_TAX_BLOCKER_CODES, formatPaymentBlockedReason(), paymentGateBlockers(), taxBlockers()

### Community 131 - "EcommerceOrderDetailPage"
Cohesion: 0.20
Nodes (9): EcommerceOrderDetailPage(), onDownloadInvoice(), onFulfilment(), onInitiateRefund(), onRecordManual(), onRetryReconcile(), OrderAmountsGrid(), OrderLineItemsTable() (+1 more)

### Community 132 - "9. Error codes"
Cohesion: 0.25
Nodes (8): 9. Error codes, Domain, Flexible-average position, Generic, Grievances, Nominee, Payment channel, Subscription & limits

### Community 133 - "eslint.config.mjs"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@9.39.4, eslint-config-next@16.3.4, eslint, eslint-config-next

### Community 134 - "04 — Customers"
Cohesion: 0.11
Nodes (18): number(), 04 — Customers, 10. Customer statement (PDF), 1. Endpoints, 2. Create customer, 3. List customers, 4. Customer detail (the 360 view), 5. Customer's schemes — active and past (+10 more)

### Community 135 - "install-ci.sh"
Cohesion: 0.40
Nodes (4): NPM_CONFIG_FETCH_RETRIES, NPM_CONFIG_FETCH_TIMEOUT, NPM_CONFIG_MAXSOCKETS, install-ci.sh script

### Community 136 - "plan-usage-card.tsx"
Cohesion: 0.43
Nodes (5): barTone(), formatRenewLabel(), PlanUsageCard(), UsageMeter, UsageRow()

### Community 137 - "ecommerce-order-presenters.ts"
Cohesion: 0.48
Nodes (5): FULFILMENT_LABEL, nextFulfilmentTargets(), orderListItemNeedsAttention(), orderListPrimaryAction, orderPaymentPresentation

### Community 138 - "drawer.tsx"
Cohesion: 0.22
Nodes (7): DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerPortal(), DrawerTitle()

### Community 139 - "ref_node_path"
Cohesion: 0.13
Nodes (10): outDir, routes, widths, readExecutionProfile(), out, root, installed, cli (+2 more)

### Community 141 - "ecommerce-order-ui.tsx"
Cohesion: 0.20
Nodes (13): formatAddressSnapshot(), formatOrderWhen(), OrderEventTimeline(), orderLineCount(), OrderProgress(), OrderSideCards(), PROGRESS_LABELS, PROGRESS_STEPS_DELIVERY (+5 more)

### Community 142 - "12 — Customer Mobile App"
Cohesion: 0.11
Nodes (17): 10. Branches & support, 11. Force update & maintenance, 12. Branding application, 12 — Customer Mobile App, 1. Endpoint map, 2. Home, 3. Scheme detail — three display modes, 4. Past schemes (+9 more)

### Community 143 - "11. Shared objects"
Cohesion: 0.29
Nodes (7): 11. Shared objects, `AuditStamp`, `BranchRef`, `CustomerRef`, `MoneyRef`, `SchemeRef`, `StaffRef`

### Community 146 - "post-settlement-refund-case-dialog.tsx"
Cohesion: 0.24
Nodes (15): PostSettlementRefundCaseDialog(), handleConfirmedResolve(), handleOpenChange(), resetForm(), SnapshotRow(), buildPostSettlementResolveBody(), formatIstDateTime(), isPostSettlementVersionConflict() (+7 more)

### Community 149 - "verify-source-export-manifest.mjs"
Cohesion: 0.40
Nodes (5): denied, entries, isDenied(), normalize(), raw

### Community 150 - "00 — Conventions"
Cohesion: 0.14
Nodes (13): 00 — Conventions, 10. Rate limits, 12.1 Audit events on mutations, 12. Enums (authoritative list), 13. Webhook security, 14. File uploads, 15. Health & meta, 1. Response envelope (+5 more)

### Community 151 - "sla-chip.tsx"
Cohesion: 0.53
Nodes (3): getNowMs(), subscribeNow(), useNowMs()

### Community 152 - "09 — Maturity, Redemption & Closure"
Cohesion: 0.20
Nodes (9): 09 — Maturity, Redemption & Closure, 1. Endpoints, 3. Initiate redemption, 4. Premature closure, 5. Approve / reject / complete, 6. Customer-initiated redemption request, 7. Redemption list, 8. Maturity auto-marking (+1 more)

### Community 153 - "11 — Cash Handover (staff → branch)"
Cohesion: 0.12
Nodes (15): 10. Handover list, 11 — Cash Handover (staff → branch), 11. Cash report, 12. Interaction with payment reversal, 1. Cash-in-hand definition, 2. Endpoints, 3. Staff — cash summary, 4. Staff — collections behind the balance (+7 more)

### Community 154 - "15 — UI Flows (designer's working document)"
Cohesion: 0.06
Nodes (35): 15 — UI Flows (designer's working document), A1. Create tenant (super admin), A2. Provision a tenant, A3. Jeweller self-signup (public), A. Platform — jeweller onboarding, B. Tenant portal — first-run setup, C. Plan builder, D1. Portal / staff app enrolment (+27 more)

### Community 155 - "ui-amount-conversion.ts"
Cohesion: 0.47
Nodes (4): formatGramsFromUg(), formatRupeesFromPaise(), paiseToRupeesNumber(), ugToGramsNumber()

### Community 156 - "SwarnaGrow demo credentials"
Cohesion: 0.14
Nodes (13): API base, Collection agent (field portal), Customer portal, Digital gold & silver (KAIRALI), EVO LUXE (cash scheme + ecommerce + digital metals), Example customers (after `seed:demo`), Noble Jewellery (fixed gold schemes demo), Notes (+5 more)

### Community 157 - "ecommerce-order.ts"
Cohesion: 0.15
Nodes (12): EcommerceCodRemittanceBatch, EcommerceCourierCodBlock, EcommerceCourierCodWorkspaceSummary, EcommerceCustomerDisplay, EcommerceFulfilmentHandoverBlock, EcommerceMoneyRef, EcommerceOrderLine, EcommerceOrderPaymentExceptionRefund (+4 more)

### Community 158 - "2. Settlement preview"
Cohesion: 0.33
Nodes (6): 2. Settlement preview, Gold-weight scheme — cash settlement basis (plan rule), Gold-weight scheme (GOLD_VALUE cash example), Maturity redemption, cash scheme, Premature closure preview, Text-only benefit

### Community 159 - "7. Money and weight"
Cohesion: 0.40
Nodes (5): 7. Money and weight, Conversion rule (authoritative), Gold weight, Money, Rates

### Community 160 - "01 — Platform Admin (Super Admin)"
Cohesion: 0.14
Nodes (13): 01 — Platform Admin (Super Admin), 1. Platform auth, 2. Subscription plan catalogue, 3. Tenant directory, 4. Tenant provisioning (integration credentials), 5. WhatsApp template registry (platform-managed), 6. Subscription management for a tenant, 7. Feature flags (+5 more)

### Community 161 - "Types of jewellery savings schemes (market overview)"
Cohesion: 0.15
Nodes (12): 1. Fixed by jeweller (one amount for everyone), 2. Fixed by customer (choose amount within your limits), 3. Slabs (pick a tier), Cash scheme vs gold scheme (simple), One-page summary, Part A — Fixed schemes (monthly installment plans), Part B — Flexible scheme (free months, then capped months), Quick comparison — what runs in the market (+4 more)

### Community 162 - "customer-payable-summary.tsx"
Cohesion: 0.47
Nodes (8): CustomerPayableSummary(), customerPayableAmountIsEditable(), customerPayableDetailLines(), customerPayableHeadline(), customerPayablePhaseLabel(), PayableQuoteBounds, CustomerDisplayMode, PayableRange

### Community 163 - "3. Amount rules — min and max, per mode"
Cohesion: 0.40
Nodes (5): 3. Amount rules — min and max, per mode, `amountMode: CUSTOMER_CHOSEN`, `amountMode: JEWELLER_FIXED`, `amountMode: JEWELLER_SLABS`, `paymentRules.minPaymentPaise` / `maxPaymentPerTransactionPaise`

### Community 164 - "Guided tours (on-screen walkthroughs)"
Cohesion: 0.50
Nodes (3): Adding or changing a guide, Guided tours (on-screen walkthroughs), Pointing a step at something

### Community 165 - "13 — Staff Mobile App"
Cohesion: 0.15
Nodes (12): 10. What the staff app deliberately cannot do, 13 — Staff Mobile App, 1. Endpoint map, 2. Home, 3. Customer search, 4. Collect payment, 5. Enrol a customer, 6. Own collection summary (+4 more)

### Community 166 - "SwarnaGrow Portals"
Cohesion: 0.17
Nodes (11): Architecture, Brand asset replacement, Collection agent portal, Customer portal, Included product areas, Platform super-admin console, Run locally, Stack (+3 more)

### Community 168 - "10 — Reminders & WhatsApp"
Cohesion: 0.17
Nodes (11): 10 — Reminders & WhatsApp, 1. Message types, 2. Template configuration (tenant view — read-only), 3. Reminder schedule configuration, 4. Message log (Reminder Centre), 5. Resend, 6. Delivery status webhook, 7. Opt-out (+3 more)

### Community 169 - "Ritu Gold and Diamonds — client demo (Palakkad)"
Cohesion: 0.18
Nodes (10): 1. `RITU18FIX` — 18-month fixed, 2. `RITU18FLEX` — flexible 18 months + closure, Branch, Client visit, Customer app, Login, Ritu Gold and Diamonds — client demo (Palakkad), Schemes (both gold weight, 22K daily rate) (+2 more)

### Community 170 - "6. Benefit block"
Cohesion: 0.50
Nodes (4): 6. Benefit block, `FIXED_BONUS_AMOUNT`, `ONE_FREE_INSTALLMENT`, `TEXT_ONLY`

### Community 171 - "2. Authentication"
Cohesion: 0.67
Nodes (3): 2. Authentication, Access token claims, Token model

### Community 172 - "Gold Scheme Platform — API Contract (v1)"
Cohesion: 0.18
Nodes (10): page(), Base URL & audience namespaces, Build phases, Change log — v1.1 (14 Sep 2026), Change log — v1.2 implementation hardening (14 Sep 2026), Document set, Gold Scheme Platform — API Contract (v1), Non-negotiable engineering rules (+2 more)

### Community 173 - "3. Standard headers"
Cohesion: 0.67
Nodes (3): 3. Standard headers, Request, Response

### Community 174 - "08 — Dues, Overdues, Maturity, Lock-due"
Cohesion: 0.18
Nodes (10): 08 — Dues, Overdues, Maturity, Lock-due, 1. Shared query contract, 2. Due list, 3. Overdue list, 4. Defaulters, 5. Maturity calendar & list, 6. Flexible lock-due list, 7. Collection summary (+2 more)

### Community 175 - "17 — Immutable Audit Timeline"
Cohesion: 0.18
Nodes (10): 17 — Immutable Audit Timeline, 1. Endpoint map, 2. Global search, 3. Entity timeline, 4. Audited actions, 5. Storage, 6. Writing events, 7. UI surface (+2 more)

### Community 176 - "API integration map"
Cohesion: 0.20
Nodes (8): API integration map, Final backend handoff checklist, Mock/live rule, Request behavior, Canonical specification, Digital Gold & Silver — portals integration, Implementation phases, Phase 0 routing decisions (this app)

### Community 177 - "SwarnaGrow Tenant Admin (portals) — dev handoff (ecommerce branch snapshot)"
Cohesion: 0.22
Nodes (8): Connect to backend, Ecommerce UI in this snapshot, Environment (included), Git, Prerequisites, Quick start, SwarnaGrow Tenant Admin (portals) — dev handoff (ecommerce branch snapshot), Verify

### Community 178 - "Customer portal implementation"
Cohesion: 0.22
Nodes (8): API switching, Customer portal implementation, Locked flexible rules represented by the UI, Payment behavior, Registration flow, Screens, When KYC is off (default), When KYC is on

### Community 180 - "03 — Tenant Configuration, Branches, Staff, Gold Rate"
Cohesion: 0.22
Nodes (8): 03 — Tenant Configuration, Branches, Staff, Gold Rate, 1. Business profile & branding, 2. Operational settings, 3. Branches, 4. Staff, 5. Gold rate, 6. Subscription & usage (tenant view), 7. Alert centre

### Community 184 - "vitest"
Cohesion: 0.09
Nodes (13): @testing-library/react@^16.3.0, @testing-library/react, vitest, defaultStatementDateRange(), istYmd(), onDialogOpenChange(), onDialogOpenChangeWithReset(), capabilityEnvelope (+5 more)

### Community 185 - "Customer and Collection Agent backend alignment"
Cohesion: 0.33
Nodes (5): Backend response gaps that the frontend cannot safely invent, Collection Agent portal changes, Customer and Collection Agent backend alignment, Customer portal changes, Verification

### Community 187 - "Platform super-admin UI handoff"
Cohesion: 0.33
Nodes (5): Architecture, Backend switch, Contract coverage, Entry point, Platform super-admin UI handoff

### Community 188 - "plan-detail-mock.ts"
Cohesion: 0.17
Nodes (14): defaultPlanBuilderForm(), normalizePreviewData(), PlanSchedulePreviewPanel(), MoneyDisplay, PlanSchedulePreviewData, PlanSchedulePreviewRow, PlanSchedulePreviewSummary, buildAmountSummaryLabel() (+6 more)

### Community 189 - "SwarnaGrow Collection Agent Portal"
Cohesion: 0.40
Nodes (4): Included screens, Locked behavior, Login and tenant selection, SwarnaGrow Collection Agent Portal

### Community 192 - "Tenant Admin alignment — backend 8e014b7"
Cohesion: 0.40
Nodes (4): Explicit scope, Included in this phase, Tenant Admin alignment — backend 8e014b7, Verification

### Community 193 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, framework, installCommand, $schema

### Community 195 - "alert.tsx"
Cohesion: 0.50
Nodes (4): Alert(), AlertDescription(), AlertTitle(), alertVariants

### Community 196 - "overrides"
Cohesion: 0.67
Nodes (3): sharp, overrides, miniflare

### Community 201 - "SelectContent"
Cohesion: 0.06
Nodes (77): Select(), SelectContent(), SelectGroup(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton(), SelectTrigger() (+69 more)

### Community 210 - "agent-collect-pages.tsx"
Cohesion: 0.05
Nodes (73): Spinner(), Account, AgentRouter(), Collect, CollectionDetail, Customer, Dashboard, Enrol (+65 more)

## Knowledge Gaps
- **20 isolated node(s):** `NPM_CONFIG_MAXSOCKETS`, `NPM_CONFIG_FETCH_RETRIES`, `NPM_CONFIG_FETCH_TIMEOUT`, `XDG_CACHE_HOME`, `XDG_DATA_HOME` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1746 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `QueryError`, `Button`, `customer-tenant.ts`, `customer-scheme-detail-page.tsx`, `platform-tenant-detail-page.tsx`, `Textarea`, `Surface`, `PageHeader`, `drawer.tsx`, `api-error.ts`, `money`, `plan-usage-card.tsx`, `create-customer-dialog.tsx`, `digital-metals-redemption-pages.tsx`, `customer-shop-page.tsx`, `ecommerce-order-ui.tsx`, `post-settlement-refund-case-dialog.tsx`, `FormFieldError`, `Button`, `useCustomerTenant`, `input.tsx`, `redemption-detail-sheet.tsx`, `StatusBadge`, `platform-tenant-create-page.tsx`, `platform-tenant-subscription-usage-section.tsx`, `utils.ts`, `platform-tenant-subscription-form-validation.ts`, `customer-payable-summary.tsx`, `digital-metals-config-page.tsx`, `customer-scheme-detail-views.tsx`, `ecommerce-orders-list-page.tsx`, `plan-detail-page.tsx`, `manage-nominee-dialog.tsx`, `customer-make-payment-sheet.tsx`, `customer-shop-order-page.tsx`, `customer-ui.tsx`, `global-search-dialog.tsx`, `ecommerce-banners-page.tsx`, `plan-builder-wizard.tsx`, `sidebar.tsx`, `grievance-detail-sheet.tsx`, `settlement-dialogs.tsx`, `reverse-payment-dialog.tsx`, `settings-page.tsx`, `alert.tsx`, `customer-support-pages.tsx`, `SelectContent`, `DataTable`, `StatusBadge`, `useAssistantChat.ts`, `AssistantMessage.tsx`, `customer-plan-detail-page.tsx`, `page-parts.tsx`, `agent-collect-pages.tsx`, `settings-operations-panel.tsx`, `customer-payments-page.tsx`, `admin-shell.tsx`, `tour-overlay.tsx`, `ecommerce-fulfilment-page.tsx`, `carousel.tsx`, `ecommerce-order-return-journey.tsx`, `form.tsx`, `mark-cash-submitted-dialog.tsx`, `context-menu.tsx`, `pagination.tsx`, `chart.tsx`, `customer-shop-order-progress.tsx`, `platform-login-page.tsx`, `digital-metals-procurement-page.tsx`, `platform-plans-page.tsx`, `customer-profile-nominee-page.tsx`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **What connects `NPM_CONFIG_MAXSOCKETS`, `NPM_CONFIG_FETCH_RETRIES`, `NPM_CONFIG_FETCH_TIMEOUT` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `QueryError` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Button` to `QueryError`, `Button`, `cn`, `customer-tenant.ts`, `customer-scheme-detail-page.tsx`, `toastApiError`, `platform-tenant-detail-page.tsx`, `Textarea`, `Surface`, `PageHeader`, `create-customer-dialog.tsx`, `api-error.ts`, `customer-digital-metals-redeem-pages.tsx`, `customer-shop-page.tsx`, `digital-metals-redemption-pages.tsx`, `FormFieldError`, `useCustomerTenant`, `input.tsx`, `redemption-detail-sheet.tsx`, `portal-router.tsx`, `StatusBadge`, `platform-tenant-create-page.tsx`, `platform-tenant-subscription-usage-section.tsx`, `utils.ts`, `ecommerce-courier-cod-workspace-page.tsx`, `providers.tsx`, `tour-provider.tsx`, `digital-metals-config-page.tsx`, `customer-router.tsx`, `customer-scheme-detail-views.tsx`, `ecommerce-orders-list-page.tsx`, `env.ts`, `plan-detail-page.tsx`, `manage-nominee-dialog.tsx`, `package.json`, `customer-make-payment-sheet.tsx`, `customer-shop-order-page.tsx`, `customer-ui.tsx`, `global-search-dialog.tsx`, `ecommerce-banners-page.tsx`, `dependencies`, `plan-builder-wizard.tsx`, `sidebar.tsx`, `grievance-detail-sheet.tsx`, `settlement-dialogs.tsx`, `reverse-payment-dialog.tsx`, `settings-page.tsx`, `auth-logout.ts`, `customer-support-pages.tsx`, `DataTable`, `AssistantMessage.tsx`, `StatusBadge`, `useAssistantChat.ts`, `EcommerceProductDialogBody`, `customer-plan-detail-page.tsx`, `page-parts.tsx`, `settings-operations-panel.tsx`, `digital-metals-config-page.tsx`, `customer-payments-page.tsx`, `admin-shell.tsx`, `tour-overlay.tsx`, `ecommerce-fulfilment-page.tsx`, `carousel.tsx`, `ecommerce-order-return-journey.tsx`, `ecommerce-order-detail-page.tsx`, `form.tsx`, `mark-cash-submitted-dialog.tsx`, `context-menu.tsx`, `pagination.tsx`, `chart.tsx`, `platform-login-page.tsx`, `digital-metals-procurement-page.tsx`, `platform-plans-page.tsx`, `customer-profile-nominee-page.tsx`, `drawer.tsx`, `post-settlement-refund-case-dialog.tsx`, `sla-chip.tsx`, `alert.tsx`, `SelectContent`, `agent-collect-pages.tsx`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.07286288009179576 - nodes in this community are weakly interconnected._
- **Why does `Button()` connect `Button` to `QueryError`, `Button`, `cn`, `customer-tenant.ts`, `customer-scheme-detail-page.tsx`, `toastApiError`, `EcommerceOrderDetailPage`, `Textarea`, `Surface`, `PageHeader`, `create-customer-dialog.tsx`, `api-error.ts`, `money`, `customer-digital-metals-redeem-pages.tsx`, `customer-shop-page.tsx`, `digital-metals-redemption-pages.tsx`, `post-settlement-refund-case-dialog.tsx`, `FormFieldError`, `useCustomerTenant`, `input.tsx`, `redemption-detail-sheet.tsx`, `portal-router.tsx`, `StatusBadge`, `platform-tenant-create-page.tsx`, `platform-tenant-detail-page.tsx`, `platform-tenant-subscription-usage-section.tsx`, `platform-tenant-subscription-form-validation.ts`, `ecommerce-courier-cod-workspace-page.tsx`, `digital-metals-config-page.tsx`, `customer-router.tsx`, `customer-scheme-detail-views.tsx`, `plan-detail-page.tsx`, `manage-nominee-dialog.tsx`, `customer-make-payment-sheet.tsx`, `customer-shop-order-page.tsx`, `customer-activity-pages.tsx`, `customer-ui.tsx`, `global-search-dialog.tsx`, `ecommerce-banners-page.tsx`, `plan-builder-wizard.tsx`, `sidebar.tsx`, `grievance-detail-sheet.tsx`, `settlement-dialogs.tsx`, `reverse-payment-dialog.tsx`, `settings-page.tsx`, `customer-support-pages.tsx`, `SelectContent`, `DataTable`, `StatusBadge`, `useAssistantChat.ts`, `EcommerceProductDialogBody`, `customer-plan-detail-page.tsx`, `page-parts.tsx`, `agent-collect-pages.tsx`, `settings-operations-panel.tsx`, `digital-metals-config-page.tsx`, `admin-shell.tsx`, `ecommerce-fulfilment-page.tsx`, `carousel.tsx`, `ecommerce-order-return-journey.tsx`, `ecommerce-order-detail-page.tsx`, `mark-cash-submitted-dialog.tsx`, `pagination.tsx`, `platform-login-page.tsx`, `digital-metals-procurement-page.tsx`, `platform-plans-page.tsx`, `customer-profile-nominee-page.tsx`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.024475524475524476 - nodes in this community are weakly interconnected._