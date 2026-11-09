# SwarnaGrow Tenant Admin — folder & file structure

React / vinext frontend (`SwarnaGrow-Tenant-Admin`).

Excluded from this tree: `node_modules/`, `.git/`, build outputs (`dist/`, `netlify-dist/`), caches (`.sites-runtime/`, `.vercel/`, `graphify-out/`), and large lock/zip artifacts.

```
SwarnaGrow-Tenant-Admin/
├── .openai/
│   └── hosting.json
├── app/
│   ├── (portal)/
│   │   ├── [[...slug]]/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── loading.tsx
│   ├── payment-return/
│   │   └── page.tsx
│   ├── error.tsx
│   ├── globals.css
│   └── layout.tsx
├── build/
│   └── sites-vite-plugin.ts
├── components/
│   └── ui/
│       ├── accordion.tsx
│       ├── alert-dialog.tsx
│       ├── alert.tsx
│       ├── aspect-ratio.tsx
│       ├── attachment.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── breadcrumb.tsx
│       ├── bubble.tsx
│       ├── button-group.tsx
│       ├── button.tsx
│       ├── calendar.tsx
│       ├── card.tsx
│       ├── carousel.tsx
│       ├── chart.tsx
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── combobox.tsx
│       ├── command.tsx
│       ├── context-menu.tsx
│       ├── dialog.tsx
│       ├── direction.tsx
│       ├── drawer.tsx
│       ├── dropdown-menu.tsx
│       ├── empty.tsx
│       ├── field.tsx
│       ├── form.tsx
│       ├── hover-card.tsx
│       ├── input-group.tsx
│       ├── input-otp.tsx
│       ├── input.tsx
│       ├── item.tsx
│       ├── kbd.tsx
│       ├── label.tsx
│       ├── marker.tsx
│       ├── menubar.tsx
│       ├── message-scroller.tsx
│       ├── message.tsx
│       ├── native-select.tsx
│       ├── navigation-menu.tsx
│       ├── pagination.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── radio-group.tsx
│       ├── resizable.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── slider.tsx
│       ├── sonner.tsx
│       ├── spinner.tsx
│       ├── switch.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── toggle-group.tsx
│       ├── toggle.tsx
│       └── tooltip.tsx
├── docs/
│   ├── AGENT_PORTAL.md
│   ├── API_INTEGRATION.md
│   ├── CUSTOMER_DIGITAL_METALS_UI.md
│   ├── CUSTOMER_PORTAL.md
│   ├── DEMO_CREDENTIALS.md
│   ├── DIGITAL_METALS.md
│   ├── DIGITAL_METALS_ADMIN_UI.md
│   ├── DIGITAL_METALS_UI_GAP_CHECKLIST.md
│   ├── FLUTTER_CHECKOUT_CHANNEL_INTEGRATION.md
│   ├── FLUTTER_CUSTOMER_API_GUIDE.md
│   ├── FLUTTER_HOSTED_PAYMENT_RETURN.md
│   ├── FLUTTER_PHONEPE_INTEGRATION.md
│   ├── GUIDED_TOURS.md
│   ├── HANDOFF_X_CHECKOUT_CHANNEL_2026-11-06.md
│   ├── PLATFORM_ADMIN_UI.md
│   ├── PRELAUNCH_FIXES_CURSOR_PROMPT.md
│   ├── PRELAUNCH_REVIEW_2026-10-22.md
│   ├── REMEDIATION_CANDIDATE_2026-11-03.md
│   ├── RITU_GOLD_DEMO.md
│   ├── SCHEME_TYPES_CLIENT.md
│   ├── SIDEKICK_FRONTEND_HANDOFF.md
│   └── swarnagrownov7.code-workspace
├── hooks/
│   └── use-mobile.ts
├── lib/
│   └── utils.ts
├── public/
│   ├── .well-known/
│   │   ├── apple-app-site-association
│   │   └── assetlinks.json
│   ├── _redirects
│   ├── favicon.svg
│   ├── file.svg
│   ├── globe.svg
│   └── window.svg
├── scripts/
│   ├── admin-digital-metals-screenshots.spec.js
│   ├── assemble-netlify-dist.mjs
│   ├── build-verified.sh
│   ├── check-guides.cjs
│   ├── execution-profile.mjs
│   ├── export-guides.mjs
│   ├── install-ci.mjs
│   ├── install-ci.sh
│   ├── install-pnpm.sh
│   ├── package-source-export.mjs
│   ├── phase1-customer-identity.browser.cjs
│   ├── pnpm-install.mjs
│   ├── run-framework.mjs
│   ├── sites-env.mjs
│   ├── sites-env.sh
│   ├── validate-production-public-env.mjs
│   ├── validate-production-public-env.test.mjs
│   └── verify-source-export-manifest.mjs
├── src/
│   ├── app/
│   │   ├── agent-router.tsx
│   │   ├── customer-router.tsx
│   │   ├── portal-router.tsx
│   │   ├── providers.tsx
│   │   └── webmcp-bridge.tsx
│   ├── components/
│   │   ├── admin-ui/
│   │   │   ├── admin-table.tsx
│   │   │   ├── detail-parts.tsx
│   │   │   ├── filter-bar.tsx
│   │   │   ├── section-hero.tsx
│   │   │   └── trend-chart.tsx
│   │   ├── agent/
│   │   │   ├── agent-shell.tsx
│   │   │   └── agent-ui.tsx
│   │   ├── assistant/
│   │   │   ├── assistant-format.tsx
│   │   │   ├── assistant-panel-geometry.ts
│   │   │   ├── AssistantConversationDrawer.tsx
│   │   │   ├── AssistantExportControl.tsx
│   │   │   ├── AssistantFloatingWindow.tsx
│   │   │   ├── AssistantMessage.test.tsx
│   │   │   ├── AssistantMessage.tsx
│   │   │   ├── AssistantPanel.tsx
│   │   │   ├── AssistantThinking.tsx
│   │   │   ├── AssistantVirtualMessageList.tsx
│   │   │   ├── sidekick-primitives.tsx
│   │   │   └── SidekickChart.tsx
│   │   ├── brand/
│   │   │   └── brand-mark.tsx
│   │   ├── common/
│   │   │   ├── action-dialog.test.tsx
│   │   │   ├── action-dialog.tsx
│   │   │   ├── api-error-callout.tsx
│   │   │   ├── chart-series-view.tsx
│   │   │   ├── charts.tsx
│   │   │   ├── cursor-pagination.tsx
│   │   │   ├── data-table.tsx
│   │   │   ├── date-range-filter.tsx
│   │   │   ├── enrol-amount-control.tsx
│   │   │   ├── enrol-first-installment-control.tsx
│   │   │   ├── enrol-form-shell.tsx
│   │   │   ├── enrol-validation-panel.tsx
│   │   │   ├── form-field-error.tsx
│   │   │   ├── gold-payment-columns.tsx
│   │   │   ├── limit-upsell-card.tsx
│   │   │   ├── list-search-input.tsx
│   │   │   ├── page-parts.tsx
│   │   │   ├── page-tabs.tsx
│   │   │   ├── paginated-data-table.tsx
│   │   │   ├── payment-success-host.tsx
│   │   │   ├── payment-success-sheet.tsx
│   │   │   ├── permission-gate.tsx
│   │   │   ├── portal-back-link.tsx
│   │   │   ├── portal-entity-links.tsx
│   │   │   ├── position-changed-dialog.tsx
│   │   │   ├── query-state.tsx
│   │   │   ├── report-table.tsx
│   │   │   ├── search-filter-bar.tsx
│   │   │   ├── status-badge.tsx
│   │   │   └── workspace-nav-cards.tsx
│   │   ├── customer/
│   │   │   ├── customer-fcm-registrar.tsx
│   │   │   ├── customer-identity-context.tsx
│   │   │   ├── customer-kyc-submit-form.tsx
│   │   │   ├── customer-kyc-verification-form.tsx
│   │   │   ├── customer-nominee-dialog.tsx
│   │   │   ├── customer-payable-summary.tsx
│   │   │   ├── customer-registration-guard.tsx
│   │   │   ├── customer-self-enrol-guard.tsx
│   │   │   ├── customer-shell.tsx
│   │   │   ├── customer-tenant-context.test.tsx
│   │   │   ├── customer-tenant-context.tsx
│   │   │   └── customer-ui.tsx
│   │   ├── dashboard/
│   │   │   ├── dashboard-widget-grid.tsx
│   │   │   ├── plan-usage-card.tsx
│   │   │   ├── rates-workspace-hub.test.ts
│   │   │   ├── rates-workspace-hub.tsx
│   │   │   ├── redemption-fulfillment-card.tsx
│   │   │   └── setup-checklist.tsx
│   │   ├── enrollments/
│   │   │   └── enrollment-status-breakdown.tsx
│   │   ├── form/
│   │   │   ├── customer-form-inputs.tsx
│   │   │   └── nominee-form-inputs.tsx
│   │   ├── layout/
│   │   │   ├── admin-shell.tsx
│   │   │   ├── global-search-dialog.tsx
│   │   │   ├── help-centre-menu.tsx
│   │   │   ├── platform-global-search-dialog.tsx
│   │   │   └── platform-shell.tsx
│   │   ├── session/
│   │   │   ├── auth-proactive-refresh.tsx
│   │   │   ├── auth-token-sync-bridge.tsx
│   │   │   └── session-hydrator.tsx
│   │   ├── tour/
│   │   │   ├── guides-menu.tsx
│   │   │   ├── tour-overlay.tsx
│   │   │   ├── tour-provider.tsx
│   │   │   └── welcome-tour-prompt.tsx
│   │   └── static-hard-nav.tsx
│   ├── config/
│   │   ├── env.production.test.ts
│   │   ├── env.ts
│   │   └── mock-session.ts
│   ├── features/
│   │   ├── access/
│   │   │   ├── access-detail-parts.tsx
│   │   │   ├── access-detail-visuals.tsx
│   │   │   ├── branch-detail-page.tsx
│   │   │   ├── branch-performance-tab.tsx
│   │   │   ├── branch-staff-tab.tsx
│   │   │   ├── staff-branches-page.tsx
│   │   │   ├── staff-detail-page.tsx
│   │   │   └── staff-performance-tab.tsx
│   │   ├── agent/
│   │   │   ├── agent-account-page.tsx
│   │   │   ├── agent-collect-pages.tsx
│   │   │   ├── agent-dashboard-page.tsx
│   │   │   ├── agent-history-pages.tsx
│   │   │   ├── agent-login-page.tsx
│   │   │   ├── agent-notifications-page.tsx
│   │   │   ├── agent-onboarding-pages.tsx
│   │   │   ├── agent-report-page.tsx
│   │   │   └── use-agent-capabilities.ts
│   │   ├── alerts/
│   │   │   └── alerts-page.tsx
│   │   ├── audit/
│   │   │   ├── audit-page.tsx
│   │   │   └── entity-audit-tab.tsx
│   │   ├── auth/
│   │   │   ├── login-page.tsx
│   │   │   └── security-sessions-dialog.tsx
│   │   ├── cash/
│   │   │   ├── accept-handover-dialog.tsx
│   │   │   ├── cash-control-page.tsx
│   │   │   ├── handover-detail-dialog.tsx
│   │   │   └── mark-cash-submitted-dialog.tsx
│   │   ├── collections/
│   │   │   ├── collections-page.tsx
│   │   │   ├── gateway-settlement-panel.tsx
│   │   │   ├── payment-refund-dialog.tsx
│   │   │   ├── post-settlement-refund-case-dialog.tsx
│   │   │   ├── post-settlement-refunds-panel.tsx
│   │   │   └── reverse-payment-dialog.tsx
│   │   ├── customer/
│   │   │   ├── customer-activity-pages.tsx
│   │   │   ├── customer-activity-row.tsx
│   │   │   ├── customer-auth-page.logic.test.ts
│   │   │   ├── customer-auth-page.tsx
│   │   │   ├── customer-digital-metals-bank-pages.tsx
│   │   │   ├── customer-digital-metals-buy-pages.tsx
│   │   │   ├── customer-digital-metals-direct-pdf-panel.tsx
│   │   │   ├── customer-digital-metals-document-page.tsx
│   │   │   ├── customer-digital-metals-document-panel.tsx
│   │   │   ├── customer-digital-metals-orders-page.tsx
│   │   │   ├── customer-digital-metals-page.tsx
│   │   │   ├── customer-digital-metals-redeem-pages.tsx
│   │   │   ├── customer-digital-metals-sell-pages.tsx
│   │   │   ├── customer-digital-metals-shared.tsx
│   │   │   ├── customer-home-page.tsx
│   │   │   ├── customer-legacy-pay-redirect.tsx
│   │   │   ├── customer-make-payment-sheet.tsx
│   │   │   ├── customer-notifications-page.tsx
│   │   │   ├── customer-onboarding-page.tsx
│   │   │   ├── customer-payment-status-page.tsx
│   │   │   ├── customer-payments-page.tsx
│   │   │   ├── customer-plan-detail-page.tsx
│   │   │   ├── customer-plans-page.tsx
│   │   │   ├── customer-profile-kyc-page.tsx
│   │   │   ├── customer-profile-nominee-page.tsx
│   │   │   ├── customer-profile-pages.tsx
│   │   │   ├── customer-profile-shared.tsx
│   │   │   ├── customer-promo-banners.test.ts
│   │   │   ├── customer-promo-banners.tsx
│   │   │   ├── customer-recent-activity-page.tsx
│   │   │   ├── customer-scheme-detail-page.tsx
│   │   │   ├── customer-scheme-detail-views.tsx
│   │   │   ├── customer-scheme-schedule.test.ts
│   │   │   ├── customer-scheme-schedule.ts
│   │   │   ├── customer-schemes-page.tsx
│   │   │   ├── customer-shop-cart-page.tsx
│   │   │   ├── customer-shop-catalog-ui.tsx
│   │   │   ├── customer-shop-order-page.tsx
│   │   │   ├── customer-shop-order-progress.test.ts
│   │   │   ├── customer-shop-order-progress.tsx
│   │   │   ├── customer-shop-orders-page.tsx
│   │   │   ├── customer-shop-page.tsx
│   │   │   ├── customer-shop-policies.tsx
│   │   │   ├── customer-shop-quote-page.tsx
│   │   │   ├── customer-shop-quote.logic.test.ts
│   │   │   ├── customer-shop-ui.tsx
│   │   │   ├── customer-support-pages.tsx
│   │   │   └── flutter-payment-return-bridge.tsx
│   │   ├── customers/
│   │   │   ├── counter/
│   │   │   │   ├── counter-buy-metal-dialog.tsx
│   │   │   │   ├── counter-sell-auto-accept.test.tsx
│   │   │   │   ├── counter-sell-metal-dialog.tsx
│   │   │   │   ├── counter-store-order-dialog.tsx
│   │   │   │   ├── counter-trade-ui.tsx
│   │   │   │   └── sell-cash-payout-button.tsx
│   │   │   ├── create-customer-dialog.tsx
│   │   │   ├── create-enrollment-dialog.tsx
│   │   │   ├── customer-commerce-overview.tsx
│   │   │   ├── customer-detail-page.tsx
│   │   │   ├── customer-digital-metals-tab.tsx
│   │   │   ├── customer-ecommerce-orders-tab.tsx
│   │   │   ├── customer-status-dialog.tsx
│   │   │   ├── customers-analytics-tab.tsx
│   │   │   ├── customers-page.tsx
│   │   │   ├── edit-customer-dialog.tsx
│   │   │   ├── import-customers-dialog.tsx
│   │   │   ├── manage-nominee-dialog.tsx
│   │   │   └── review-kyc-dialog.tsx
│   │   ├── dashboard/
│   │   │   ├── dashboard-alerts.tsx
│   │   │   ├── dashboard-layout-order.test.ts
│   │   │   ├── dashboard-page.tsx
│   │   │   ├── digital-metals-dashboard-section.tsx
│   │   │   └── ecommerce-dashboard-section.tsx
│   │   ├── digital-metals/
│   │   │   ├── digital-metals-admin-direct-pdf-panel.tsx
│   │   │   ├── digital-metals-admin-document-panel.tsx
│   │   │   ├── digital-metals-admin-shared.tsx
│   │   │   ├── digital-metals-admin-ui.tsx
│   │   │   ├── digital-metals-bank-verification-page.tsx
│   │   │   ├── digital-metals-bank-verify-dialog.tsx
│   │   │   ├── digital-metals-config-editor.tsx
│   │   │   ├── digital-metals-config-page.tsx
│   │   │   ├── digital-metals-customer-bank-panel.tsx
│   │   │   ├── digital-metals-document-panel.tsx
│   │   │   ├── digital-metals-hedge-page.tsx
│   │   │   ├── digital-metals-operations-panel.tsx
│   │   │   ├── digital-metals-payment-exceptions-page.tsx
│   │   │   ├── digital-metals-payout-detail-page.tsx
│   │   │   ├── digital-metals-payouts-page.tsx
│   │   │   ├── digital-metals-procurement-page.tsx
│   │   │   ├── digital-metals-purchases-page.tsx
│   │   │   ├── digital-metals-redemption-admin-shared.tsx
│   │   │   ├── digital-metals-redemption-handover-ui.test.tsx
│   │   │   ├── digital-metals-redemption-pages.tsx
│   │   │   ├── digital-metals-sell-admin-shared.tsx
│   │   │   ├── digital-metals-sell-order-detail-parts.tsx
│   │   │   ├── digital-metals-sells-page.tsx
│   │   │   ├── digital-metals-workspace-overview.tsx
│   │   │   └── digital-metals-workspace-page.tsx
│   │   ├── dues/
│   │   │   └── dues-page.tsx
│   │   ├── ecommerce/
│   │   │   ├── ecommerce-admin-shared.tsx
│   │   │   ├── ecommerce-banner-editor-dialog.test.tsx
│   │   │   ├── ecommerce-banner-editor-dialog.tsx
│   │   │   ├── ecommerce-banners-page.tsx
│   │   │   ├── ecommerce-campaigns-page.tsx
│   │   │   ├── ecommerce-catalog-image.tsx
│   │   │   ├── ecommerce-catalog-page.tsx
│   │   │   ├── ecommerce-categories-page.tsx
│   │   │   ├── ecommerce-checkout-blockers.ts
│   │   │   ├── ecommerce-checkout-tax-panel.tsx
│   │   │   ├── ecommerce-courier-cod-order-panel.tsx
│   │   │   ├── ecommerce-courier-cod-workspace-page.tsx
│   │   │   ├── ecommerce-delivery-config.test.ts
│   │   │   ├── ecommerce-delivery-config.ts
│   │   │   ├── ecommerce-fulfilment-page.tsx
│   │   │   ├── ecommerce-gold-rates-page.tsx
│   │   │   ├── ecommerce-inventory-page.tsx
│   │   │   ├── ecommerce-order-cancellation-journey.tsx
│   │   │   ├── ecommerce-order-detail-page.tsx
│   │   │   ├── ecommerce-order-financial-review-dialog.tsx
│   │   │   ├── ecommerce-order-refunds-panel.tsx
│   │   │   ├── ecommerce-order-return-journey.tsx
│   │   │   ├── ecommerce-order-ui.tsx
│   │   │   ├── ecommerce-orders-list-page.tsx
│   │   │   ├── ecommerce-orders-page.tsx
│   │   │   ├── ecommerce-payment-exceptions-page.tsx
│   │   │   ├── ecommerce-pickup-collection-panel.test.tsx
│   │   │   ├── ecommerce-pickup-collection-panel.tsx
│   │   │   ├── ecommerce-product-dialog.test.tsx
│   │   │   ├── ecommerce-product-dialog.tsx
│   │   │   ├── ecommerce-promotion-composer-dialog.tsx
│   │   │   ├── ecommerce-record-money-received-panel.test.tsx
│   │   │   ├── ecommerce-record-money-received-panel.tsx
│   │   │   ├── ecommerce-settings-ui.tsx
│   │   │   ├── ecommerce-shared.tsx
│   │   │   ├── ecommerce-store-overview-page.tsx
│   │   │   ├── ecommerce-store-policies-panel.tsx
│   │   │   ├── ecommerce-tax-settings-page.tsx
│   │   │   └── p8-admin-workflow-journeys.test.tsx
│   │   ├── enrollments/
│   │   │   ├── cycle-progress.tsx
│   │   │   ├── enrollment-detail-page.tsx
│   │   │   ├── enrollment-maturity-tab.tsx
│   │   │   ├── enrollment-redemption-banner.tsx
│   │   │   ├── enrollments-analytics-tab.tsx
│   │   │   ├── enrollments-create-dialog.tsx
│   │   │   ├── enrollments-page.tsx
│   │   │   ├── scheme-schedule.tsx
│   │   │   ├── settlement-cash-basis-panel.tsx
│   │   │   ├── settlement-dialogs.tsx
│   │   │   └── settlement-lines-panel.tsx
│   │   ├── errors/
│   │   │   └── portal-not-found-page.tsx
│   │   ├── gold/
│   │   │   └── gold-rates-page.tsx
│   │   ├── maturity/
│   │   │   ├── flexible-locks-panel.tsx
│   │   │   ├── maturity-page.tsx
│   │   │   ├── redemption-detail-sheet.tsx
│   │   │   └── redemptions-queue.tsx
│   │   ├── payments/
│   │   │   ├── payment-dialog.tsx
│   │   │   ├── payments-needing-attention-page.test.tsx
│   │   │   └── payments-needing-attention-page.tsx
│   │   ├── platform/
│   │   │   ├── platform-audit-page.tsx
│   │   │   ├── platform-dashboard-page.tsx
│   │   │   ├── platform-login-page.tsx
│   │   │   ├── platform-monitoring-page.tsx
│   │   │   ├── platform-plans-page.tsx
│   │   │   ├── platform-settings-page.tsx
│   │   │   ├── platform-tenant-create-page.tsx
│   │   │   ├── platform-tenant-detail-page.tsx
│   │   │   ├── platform-tenant-digital-metals-section.tsx
│   │   │   ├── platform-tenant-subscription-usage-section.tsx
│   │   │   ├── platform-tenants-page.tsx
│   │   │   └── use-platform-session.ts
│   │   ├── reminders/
│   │   │   └── manual-push-panel.tsx
│   │   ├── reports/
│   │   │   ├── ecommerce-report-definitions.tsx
│   │   │   ├── exports-panel.tsx
│   │   │   ├── report-filter-support.ts
│   │   │   ├── report-filters-panel.tsx
│   │   │   ├── report-summary-strip.tsx
│   │   │   └── reports-page.tsx
│   │   ├── schemes/
│   │   │   ├── plan-availability-dialog.tsx
│   │   │   ├── plan-builder-form.ts
│   │   │   ├── plan-builder-ui.tsx
│   │   │   ├── plan-builder-wizard-types.ts
│   │   │   ├── plan-builder-wizard.tsx
│   │   │   ├── plan-card.tsx
│   │   │   ├── plan-contract-fields.ts
│   │   │   ├── plan-detail-page.tsx
│   │   │   ├── plan-detail-visuals.tsx
│   │   │   ├── plan-preview-panel.tsx
│   │   │   ├── plan-preview-types.ts
│   │   │   ├── plan-row-actions.tsx
│   │   │   └── schemes-page.tsx
│   │   ├── settings/
│   │   │   ├── customer-portal-url-field.tsx
│   │   │   ├── settings-operations-panel.tsx
│   │   │   ├── settings-page.tsx
│   │   │   └── subscription-invoices-panel.tsx
│   │   └── support/
│   │       ├── grievance-detail-sheet.tsx
│   │       ├── sla-chip.tsx
│   │       └── support-page.tsx
│   ├── hooks/
│   │   ├── use-acting-branch-id.ts
│   │   ├── use-banner-image-upload.race.test.tsx
│   │   ├── use-banner-image-upload.test.ts
│   │   ├── use-banner-image-upload.ts
│   │   ├── use-browser-pathname.ts
│   │   ├── use-client-mounted.ts
│   │   ├── use-cursor-pagination.ts
│   │   ├── use-debounced-value.ts
│   │   ├── use-external-value-sync.ts
│   │   ├── use-infinite-scroll.ts
│   │   ├── use-load-more-list.ts
│   │   ├── use-nav-badges.ts
│   │   ├── use-now-ms.ts
│   │   ├── use-throttled-value.ts
│   │   ├── use-validated-list-date-range.ts
│   │   ├── useAssistantChat.test.tsx
│   │   └── useAssistantChat.ts
│   ├── lib/
│   │   ├── tours/
│   │   │   ├── tours/
│   │   │   │   ├── customers.ts
│   │   │   │   ├── engage.ts
│   │   │   │   ├── helpers.ts
│   │   │   │   ├── metals.ts
│   │   │   │   ├── money.ts
│   │   │   │   ├── schemes.ts
│   │   │   │   ├── setup.ts
│   │   │   │   ├── start.ts
│   │   │   │   └── store.ts
│   │   │   ├── catalog.ts
│   │   │   ├── dom.ts
│   │   │   ├── registry.test.ts
│   │   │   ├── registry.ts
│   │   │   ├── storage.ts
│   │   │   └── types.ts
│   │   ├── access-form-validation.ts
│   │   ├── action-permissions.ts
│   │   ├── agent-receipt.ts
│   │   ├── api-error.ts
│   │   ├── assistant-conversation-storage.test.ts
│   │   ├── assistant-conversation-storage.ts
│   │   ├── assistant-stream.test.ts
│   │   ├── assistant-stream.ts
│   │   ├── assistant-workspace.test.tsx
│   │   ├── auth-base-query-refresh.test.ts
│   │   ├── auth-base-query-refresh.ts
│   │   ├── auth-jwt.ts
│   │   ├── auth-logout.ts
│   │   ├── auth-refresh-api.ts
│   │   ├── auth-refresh-coordinator.ts
│   │   ├── auth-refresh-fetch.ts
│   │   ├── auth-return-path.ts
│   │   ├── auth-session.ts
│   │   ├── auth-token-storage.ts
│   │   ├── auth-tokens-from-refresh.ts
│   │   ├── banner-admin-list-state.test.ts
│   │   ├── banner-admin-list-state.ts
│   │   ├── banner-admin-utils.ts
│   │   ├── banner-destination-picker.test.ts
│   │   ├── banner-destination-picker.ts
│   │   ├── banner-picker-session.test.ts
│   │   ├── banner-picker-session.ts
│   │   ├── banner-save-body.ts
│   │   ├── cash-handover-form-validation.ts
│   │   ├── cash-settlement-basis.test.ts
│   │   ├── cash-settlement-basis.ts
│   │   ├── chart-axis.ts
│   │   ├── contract-paths.ts
│   │   ├── contract-response.ts
│   │   ├── counter-trade-types.ts
│   │   ├── cursor-pagination.ts
│   │   ├── customer-auth-otp-form-meta.test.ts
│   │   ├── customer-auth-otp-form-meta.ts
│   │   ├── customer-banner-refresh.integration.test.tsx
│   │   ├── customer-banner-refresh.test.ts
│   │   ├── customer-banner-refresh.ts
│   │   ├── customer-banner-routing.test.ts
│   │   ├── customer-banner-routing.ts
│   │   ├── customer-brand-styles.ts
│   │   ├── customer-digital-metals-bank-copy.test.tsx
│   │   ├── customer-digital-metals-buy-silver.test.tsx
│   │   ├── customer-digital-metals-direct-pdf.test.ts
│   │   ├── customer-digital-metals-direct-pdf.ts
│   │   ├── customer-digital-metals-order-links.ts
│   │   ├── customer-digital-metals-passbook-ui.ts
│   │   ├── customer-digital-metals-portfolio-ui.test.tsx
│   │   ├── customer-digital-metals-purchase-receipt.tsx
│   │   ├── customer-digital-metals-sell-receipt.tsx
│   │   ├── customer-digital-metals-statement-dates.test.ts
│   │   ├── customer-digital-metals-statement-dates.ts
│   │   ├── customer-digital-metals-visible.test.ts
│   │   ├── customer-digital-metals-visible.ts
│   │   ├── customer-enrol-mock.test.ts
│   │   ├── customer-enrol-mock.ts
│   │   ├── customer-enrol-plan.ts
│   │   ├── customer-form.ts
│   │   ├── customer-gold-ui.ts
│   │   ├── customer-grievance-adapter.ts
│   │   ├── customer-identity-bootstrap.test.ts
│   │   ├── customer-identity-lifecycle.ts
│   │   ├── customer-identity-session-generation.test.ts
│   │   ├── customer-identity-switch.ts
│   │   ├── customer-identity.test.ts
│   │   ├── customer-identity.ts
│   │   ├── customer-import.ts
│   │   ├── customer-kyc-enabled.ts
│   │   ├── customer-notification-display.ts
│   │   ├── customer-otp-ui.test.ts
│   │   ├── customer-otp-ui.ts
│   │   ├── customer-payable-display.ts
│   │   ├── customer-payment-adapter.test.ts
│   │   ├── customer-payment-adapter.ts
│   │   ├── customer-payment-poll.ts
│   │   ├── customer-payment-polling.ts
│   │   ├── customer-payment-redirect.ts
│   │   ├── customer-payment-session.test.ts
│   │   ├── customer-payment-session.ts
│   │   ├── customer-phonepe-checkout.test.ts
│   │   ├── customer-phonepe-checkout.ts
│   │   ├── customer-plan-adapter.ts
│   │   ├── customer-portal-capabilities.ts
│   │   ├── customer-portal-url.ts
│   │   ├── customer-profile-complete.ts
│   │   ├── customer-profile-generation.test.ts
│   │   ├── customer-receipt.ts
│   │   ├── customer-recent-activity-ui.tsx
│   │   ├── customer-recent-activity.ts
│   │   ├── customer-shop-order-invoice.ts
│   │   ├── customer-shop-orders-list.test.ts
│   │   ├── customer-shop-orders-list.ts
│   │   ├── customer-shop-paths.test.ts
│   │   ├── customer-shop-paths.ts
│   │   ├── customer-status-form.ts
│   │   ├── customer-tenant-branding.test.ts
│   │   ├── customer-tenant-branding.ts
│   │   ├── customer-tenant.ts
│   │   ├── datetime-local.test.ts
│   │   ├── datetime-local.ts
│   │   ├── demo-dates.ts
│   │   ├── device-id.ts
│   │   ├── dialog-form-reset.ts
│   │   ├── dialog-open-change.test.ts
│   │   ├── dialog-open-change.ts
│   │   ├── digital-metals-asset-ui.ts
│   │   ├── digital-metals-customer-sell.test.tsx
│   │   ├── digital-metals-deep-link.test.ts
│   │   ├── digital-metals-display.ts
│   │   ├── digital-metals-document-route.test.tsx
│   │   ├── digital-metals-entitlement.test.ts
│   │   ├── digital-metals-entitlement.ts
│   │   ├── digital-metals-envelope.test.tsx
│   │   ├── digital-metals-fulfilment-envelope.test.ts
│   │   ├── digital-metals-payout-detail.test.tsx
│   │   ├── digital-metals-portfolio-summary.test.ts
│   │   ├── digital-metals-portfolio-summary.ts
│   │   ├── digital-metals-quote-preview.test.tsx
│   │   ├── digital-metals-quote-preview.tsx
│   │   ├── digital-metals-redeem.test.tsx
│   │   ├── digital-metals-redemption-charge-breakdown.tsx
│   │   ├── digital-metals-settings-form.test.ts
│   │   ├── download-api.ts
│   │   ├── download.ts
│   │   ├── ecommerce-banner-surfaces.test.ts
│   │   ├── ecommerce-banner-surfaces.ts
│   │   ├── ecommerce-courier-cod-labels.test.ts
│   │   ├── ecommerce-dashboard-period.test.ts
│   │   ├── ecommerce-dashboard-period.ts
│   │   ├── ecommerce-dashboard-visibility.test.ts
│   │   ├── ecommerce-entitlement.test.ts
│   │   ├── ecommerce-entitlement.ts
│   │   ├── ecommerce-historical-visibility.test.ts
│   │   ├── ecommerce-order-mutation-error.test.ts
│   │   ├── ecommerce-order-mutation-error.ts
│   │   ├── ecommerce-order-presenters.test.ts
│   │   ├── ecommerce-order-presenters.ts
│   │   ├── ecommerce-order-stock-disposition.test.ts
│   │   ├── ecommerce-order-stock-disposition.ts
│   │   ├── ecommerce-orders-list-filters.test.ts
│   │   ├── ecommerce-orders-list-filters.ts
│   │   ├── ecommerce-orders-list-filters.types.ts
│   │   ├── ecommerce-orders-url-state.test.ts
│   │   ├── ecommerce-orders-url-state.ts
│   │   ├── ecommerce-payment-blockers.test.ts
│   │   ├── ecommerce-payment-blockers.ts
│   │   ├── ecommerce-product-form.test.ts
│   │   ├── ecommerce-product-form.ts
│   │   ├── ecommerce-report-contract.test.ts
│   │   ├── ecommerce-store-availability.test.ts
│   │   ├── ecommerce-store-availability.ts
│   │   ├── ecommerce-upload-id.test.ts
│   │   ├── ecommerce-upload-id.ts
│   │   ├── enrol-form-validation.ts
│   │   ├── enrol-plan-rules.ts
│   │   ├── enrollment-cash-basis-adapter.test.ts
│   │   ├── enrollment-status-counts.ts
│   │   ├── fetch-all-list-pages.ts
│   │   ├── field-labels.ts
│   │   ├── form-api-error.ts
│   │   ├── format.ts
│   │   ├── fuzzy-search.ts
│   │   ├── gold-payment-display.ts
│   │   ├── gold-rate-form-validation.ts
│   │   ├── gold-rate-notification-ui.ts
│   │   ├── grievance-form-validation.ts
│   │   ├── idempotency.ts
│   │   ├── ist-business-date.ts
│   │   ├── kyc-form.ts
│   │   ├── list-date-range.ts
│   │   ├── navigate-back.test.ts
│   │   ├── navigate-back.ts
│   │   ├── nominee-form.ts
│   │   ├── password-validation.ts
│   │   ├── payment-form-validation.ts
│   │   ├── payment-limits.ts
│   │   ├── payment-link-share.ts
│   │   ├── permission-catalog.ts
│   │   ├── permissions.ts
│   │   ├── plain-language-labels.ts
│   │   ├── plan-builder-validation.ts
│   │   ├── platform-login-form-validation.ts
│   │   ├── platform-message-central-integration-form-validation.ts
│   │   ├── platform-monitoring-filters-validation.ts
│   │   ├── platform-phonepe-integration-form-validation.ts
│   │   ├── platform-subscription-plan-form-validation.ts
│   │   ├── platform-tenant-create-form-validation.ts
│   │   ├── platform-tenant-profile-form-validation.ts
│   │   ├── platform-tenant-subscription-form-validation.ts
│   │   ├── platform-tenant-template-form-validation.ts
│   │   ├── portal-nav.test.ts
│   │   ├── portal-nav.ts
│   │   ├── portal-path-slug.ts
│   │   ├── portal-routes.ts
│   │   ├── post-settlement-refund-case.test.ts
│   │   ├── post-settlement-refund-case.ts
│   │   ├── redemption-form-validation.ts
│   │   ├── report-export-validation.ts
│   │   ├── rtk-mutation-body.ts
│   │   ├── rtk-query-result.ts
│   │   ├── settings-form-validation.ts
│   │   ├── settlement-form-validation.ts
│   │   ├── shop-payment-idempotency.test.ts
│   │   ├── shop-payment-idempotency.ts
│   │   ├── ui-amount-conversion.ts
│   │   ├── upload-via-presign.ts
│   │   ├── use-customer-sign-out.ts
│   │   └── vinext-static-location-bootstrap.ts
│   ├── mocks/
│   │   ├── access-detail-mock.ts
│   │   ├── admin-report-mocks.ts
│   │   ├── agent-data.ts
│   │   ├── assistant-agent-mock.ts
│   │   ├── commerce-demo-images.ts
│   │   ├── commerce-demo-mocks.ts
│   │   ├── counter-trade-mocks.ts
│   │   ├── customer-commerce-mocks.ts
│   │   ├── customer-data.ts
│   │   ├── grievance-mocks.ts
│   │   ├── mock-db.ts
│   │   ├── mock-server.ts
│   │   ├── plan-detail-mock.ts
│   │   ├── plan-preview-mock.ts
│   │   ├── platform-data.ts
│   │   ├── platform-server.ts
│   │   └── settings-mock.ts
│   ├── store/
│   │   ├── api/
│   │   │   ├── admin-api.ts
│   │   │   ├── agent-api.ts
│   │   │   ├── contract-adapters.ts
│   │   │   ├── customer-api.ts
│   │   │   └── platform-api.ts
│   │   ├── slices/
│   │   │   ├── agent-session-slice.ts
│   │   │   ├── customer-session-slice.ts
│   │   │   ├── session-slice.ts
│   │   │   └── ui-slice.ts
│   │   ├── branch-listener.ts
│   │   ├── hooks.ts
│   │   └── index.ts
│   └── types/
│       ├── admin-report.ts
│       ├── agent.ts
│       ├── assistant.ts
│       ├── customer.ts
│       ├── domain.ts
│       ├── ecommerce-admin-mutations.ts
│       ├── ecommerce-cancellation.ts
│       ├── ecommerce-order.ts
│       ├── platform.ts
│       ├── session.ts
│       └── staff-performance.ts
├── swarna-grow-api-contract-v1.2/
│   ├── 00-conventions.md
│   ├── 01-platform-admin.md
│   ├── 02-auth-onboarding.md
│   ├── 03-tenant-config.md
│   ├── 04-customers.md
│   ├── 05-scheme-plans.md
│   ├── 06-enrolment-schemes.md
│   ├── 07-payments.md
│   ├── 08-lists-dues-maturity.md
│   ├── 09-redemption-closure.md
│   ├── 10-reminders-whatsapp.md
│   ├── 11-cash-handover.md
│   ├── 12-customer-app.md
│   ├── 13-staff-app.md
│   ├── 14-dashboard-reports.md
│   ├── 15-ui-flows.md
│   ├── 16-grievances.md
│   ├── 17-audit-timeline.md
│   └── README.md
├── vendor/
│   ├── shadcn-tailwind-4.13.0.css
│   └── shadcn-tailwind-4.13.0.LICENSE.md
├── .env.example
├── .env.local
├── .env.production.local
├── .env.vercel.production
├── .env.vercel.pulled
├── .gitignore
├── .npmrc
├── .vercelignore
├── cloudflare-env.d.ts
├── components.json
├── CUSTOMER_AGENT_BACKEND_ALIGNMENT.md
├── DEV_HANDOFF_RUN.md
├── env.netlify.production
├── eslint.config.mjs
├── netlify.toml
├── next-env.d.ts
├── next.config.ts
├── package.json
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── README.md
├── TENANT_ADMIN_BACKEND_ALIGNMENT.md
├── tsconfig.json
├── vercel.json
├── vite.config.ts
├── vitest.config.ts
└── vitest.setup.ts
```

## Top-level map

| Path | Role |
|------|------|
| `app/` | Next/vinext app router entry (`layout`, portal catch-all, payment-return) |
| `src/app/` | Client routers (`portal-router`, customer/agent routers, providers) |
| `src/features/` | Feature screens by domain (auth, customers, ecommerce, digital-metals, …) |
| `src/components/` | Shared UI shells, admin table, customer chrome, session helpers |
| `src/store/` | Redux store + RTK Query API slices |
| `src/lib/` | Helpers (auth, FCM, ecommerce filters, uploads, …) |
| `src/hooks/` | Shared React hooks |
| `src/types/` | Domain TypeScript types |
| `src/mocks/` | Mock/demo data for local mock mode |
| `components/` / `lib/` | shadcn/ui primitives and `cn` util |
| `public/` | Static assets (favicon, `.well-known` App Links) |
| `scripts/` | Build/assemble helpers (Netlify zip, env validation) |
| `docs/` | Frontend docs (credentials, guides) |

