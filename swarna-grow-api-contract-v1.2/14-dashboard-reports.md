# 14 — Dashboard & Reports

Every widget and every report is **derived from the ledger** at read time or from a rebuildable aggregate cache. Nothing here reads an authoritative running counter.

Everything is branch-scoped automatically: a `BRANCH_MANAGER` or a branch-scoped `TENANT_ADMIN` sees only their branch, a `TENANT_OWNER` sees the consolidated view and can filter by branch. The response always echoes `scope` so the UI can label the page honestly ("MG Road" vs "All showrooms").

Every chart returns the `ChartSeries` object defined in `00-conventions.md §11`. The designer should build one chart component that renders any `ChartSeries` and never hand-code a chart per endpoint.

---

## 1. Endpoints

| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/dashboard/summary` | P1 | `report.read` |
| `GET` | `/admin/dashboard/charts/:chartKey` | P1 | `report.read` |
| `GET` | `/admin/dashboard/activity` | P1.5 | `report.read` |
| `GET` | `/admin/reports/:reportKey` | P1 | `report.read` |
| `POST` | `/admin/exports` | P1 | `report.export` |
| `GET` | `/admin/exports/:exportId` | P1 | `report.export` |
| `GET` | `/admin/exports` | P1.5 | `report.export` |
| `GET` | `/staff/dashboard/summary` | P1 | staff app — own performance only |

---

## 2. Dashboard summary

**`GET /admin/dashboard/summary?period=THIS_MONTH&branchId=`**

`period` ∈ `TODAY` | `THIS_WEEK` | `THIS_MONTH` | `LAST_MONTH` | `THIS_QUARTER` | `THIS_YEAR` | `CUSTOM` (with `from`/`to`).

One call fills the whole widget row. Each widget carries its own comparison so the UI never computes deltas.

```json
{
  "success": true,
  "data": {
    "scope": {
      "level": "TENANT",
      "branch": null,
      "branchCount": 2,
      "label": "All showrooms"
    },
    "period": {
      "from": "2026-09-01",
      "to": "2026-09-14",
      "label": "This month",
      "comparedTo": { "from": "2026-08-01", "to": "2026-08-14", "label": "Same period last month" }
    },

    "widgets": [
      {
        "key": "COLLECTION",
        "label": "Collection",
        "value": { "amountPaise": 184500000, "amountDisplay": "₹18,45,000" },
        "valueType": "currency",
        "secondary": { "label": "184 payments", "value": 184 },
        "change": { "percent": 12.4, "direction": "up", "isGood": true },
        "actionPath": "/payments"
      },
      {
        "key": "ACTIVE_SCHEMES",
        "label": "Active schemes",
        "value": 431,
        "valueType": "count",
        "secondary": { "label": "of 518 total", "value": 518 },
        "change": { "percent": 3.1, "direction": "up", "isGood": true },
        "actionPath": "/schemes?status=ACTIVE"
      },
      {
        "key": "ACTIVE_CUSTOMERS",
        "label": "Active customers",
        "value": 412,
        "valueType": "count",
        "secondary": { "label": "of 1,000 on Growth plan", "value": 1000, "usagePercent": 41.2, "usageStatus": "OK" },
        "change": { "percent": 4.8, "direction": "up", "isGood": true },
        "actionPath": "/customers"
      },
      {
        "key": "NEW_ENROLMENTS",
        "label": "New enrolments",
        "value": 34,
        "valueType": "count",
        "change": { "percent": -8.1, "direction": "down", "isGood": false },
        "actionPath": "/schemes?enrolledFrom=2026-09-01"
      },
      {
        "key": "OVERDUE",
        "label": "Overdue",
        "value": { "amountPaise": 41200000, "amountDisplay": "₹4,12,000" },
        "valueType": "currency",
        "secondary": { "label": "64 schemes", "value": 64 },
        "change": { "percent": 6.2, "direction": "up", "isGood": false },
        "severity": "WARNING",
        "actionPath": "/overdues"
      },
      {
        "key": "DUE_TODAY",
        "label": "Due today",
        "value": { "amountPaise": 23500000, "amountDisplay": "₹2,35,000" },
        "valueType": "currency",
        "secondary": { "label": "47 installments", "value": 47 },
        "actionPath": "/dues?preset=TODAY"
      },
      {
        "key": "MATURING_THIS_MONTH",
        "label": "Maturing this month",
        "value": 23,
        "valueType": "count",
        "secondary": { "label": "₹13,80,000 to settle", "value": { "amountPaise": 138000000, "amountDisplay": "₹13,80,000" } },
        "actionPath": "/maturities?preset=THIS_MONTH"
      },
      {
        "key": "GOLD_ACCRUED",
        "label": "Gold liability",
        "value": { "weightMg": 2841500, "weightDisplay": "2841.500 g" },
        "valueType": "weight",
        "secondary": { "label": "₹2,06,00,875 at today's rate", "value": { "amountPaise": 2060087500, "amountDisplay": "₹2,06,00,875" } },
        "actionPath": "/reports/gold-accrual"
      },
      {
        "key": "CASH_IN_HAND",
        "label": "Staff cash in hand",
        "value": { "amountPaise": 4260000, "amountDisplay": "₹42,600" },
        "valueType": "currency",
        "secondary": { "label": "4 staff, 3 pending handovers", "value": 3 },
        "severity": "INFO",
        "actionPath": "/cash-handovers"
      },
      {
        "key": "PENDING_APPROVALS",
        "label": "Pending approvals",
        "value": 5,
        "valueType": "count",
        "secondary": { "label": "redemptions awaiting you", "value": 5 },
        "severity": "WARNING",
        "actionPath": "/redemptions?pendingApprovalOnly=true"
      }
    ],

    "goldRate": {
      "isSetForToday": true,
      "ratePerGram": { "ratePerGramPaise": 725000, "ratePerGramDisplay": "₹7,250" },
      "change": { "amountDisplay": "₹60", "percent": 0.83, "direction": "up" },
      "asOf": "2026-09-14T09:00:00+05:30"
    },

    "alerts": [
      { "severity": "MEDIUM", "key": "PENDING_CASH_HANDOVERS", "title": "3 cash handovers awaiting acceptance", "count": 3, "actionPath": "/cash-handovers?status=PENDING" },
      { "severity": "MEDIUM", "key": "WHATSAPP_QUOTA_NEAR_LIMIT", "title": "WhatsApp quota 86% used", "actionPath": "/settings/subscription" }
    ],

    "defaultCharts": ["collection-trend", "collection-by-mode", "scheme-status-distribution", "overdue-ageing", "branch-comparison"]
  }
}
```

`widgets` is an **ordered array**, not a fixed object — the designer lays out a responsive grid that renders whatever comes back. Widgets a role can't see (e.g. `PENDING_APPROVALS` for a branch manager without `redemption.approve`) are simply absent rather than zeroed, so the grid never shows a meaningless zero.

`defaultCharts` tells the client which chart keys to fetch for the default dashboard layout.

---

## 3. Dashboard charts

**`GET /admin/dashboard/charts/:chartKey`**

Common query: `period` (or `from`/`to`), `branchId`, `planId`, `granularity` ∈ `DAY` | `WEEK` | `MONTH`, `compare=true`.

| `chartKey` | Chart type | What it shows |
|---|---|---|
| `collection-trend` | line | Collection over time, optional previous-period overlay |
| `collection-by-mode` | donut | Split across the six payment modes (plus `LEGACY_ONLINE` where historical) |
| `collection-by-branch` | stackedBar | Branch × mode |
| `enrolment-trend` | bar | New enrolments over time |
| `scheme-status-distribution` | donut | Active / locked / matured / redeemed / defaulted / closed |
| `overdue-ageing` | bar | 1–7, 8–15, 16–30, 30+ buckets |
| `branch-comparison` | horizontalBar | Branches ranked by collection |
| `gold-accrual-trend` | area | Cumulative grams accrued over time |
| `plan-wise-distribution` | horizontalBar | Active schemes and collection per plan |
| `staff-performance` | horizontalBar | Collection per staff |
| `collection-heatmap` | heatmap | Day-of-week × week-of-month collection density |
| `new-vs-churn` | bar | Enrolments vs closures per month |

**`GET /admin/dashboard/charts/collection-trend?period=THIS_MONTH&granularity=DAY&compare=true`**

```json
{
  "success": true,
  "data": {
    "chartType": "line",
    "title": "Collection trend",
    "subtitle": "1 – 14 Sep 2026, all showrooms",
    "xAxis": { "type": "category", "label": "Date", "format": "d MMM" },
    "yAxis": { "type": "currency", "label": "Amount collected", "unit": "INR" },
    "series": [
      {
        "key": "current",
        "name": "This month",
        "data": [
          { "x": "2026-09-01", "y": 4520000, "yDisplay": "₹45,200" },
          { "x": "2026-09-02", "y": 3810000, "yDisplay": "₹38,100" },
          { "x": "2026-09-03", "y": 6240000, "yDisplay": "₹62,400" }
        ]
      },
      {
        "key": "previous",
        "name": "Last month",
        "dashed": true,
        "data": [
          { "x": "2026-09-01", "y": 4010000, "yDisplay": "₹40,100" },
          { "x": "2026-09-02", "y": 3520000, "yDisplay": "₹35,200" },
          { "x": "2026-09-03", "y": 5180000, "yDisplay": "₹51,800" }
        ]
      }
    ],
    "summary": {
      "total": { "amountPaise": 184500000, "amountDisplay": "₹18,45,000" },
      "average": { "amountPaise": 13178571, "amountDisplay": "₹1,31,786" },
      "peak": { "x": "2026-09-10", "y": 9840000, "yDisplay": "₹98,400" },
      "changePercent": 12.4,
      "changeDirection": "up",
      "comparedTo": "previous_period"
    },
    "drilldown": { "enabled": true, "path": "/payments", "paramKey": "from" }
  }
}
```

`drilldown` lets the designer make every data point tappable — clicking 10 Sep navigates to `/payments?from=2026-09-10&to=2026-09-10`.

**`GET /admin/dashboard/charts/scheme-status-distribution`**
```json
{
  "success": true,
  "data": {
    "chartType": "donut",
    "title": "Schemes by status",
    "yAxis": { "type": "count", "label": "Schemes" },
    "series": [
      {
        "key": "status",
        "name": "Schemes",
        "data": [
          { "x": "Active", "y": 398, "yDisplay": "398", "statusKey": "ACTIVE" },
          { "x": "Locked", "y": 33, "yDisplay": "33", "statusKey": "LOCKED" },
          { "x": "Matured", "y": 12, "yDisplay": "12", "statusKey": "MATURED" },
          { "x": "Redeemed", "y": 64, "yDisplay": "64", "statusKey": "REDEEMED" },
          { "x": "Defaulted", "y": 14, "yDisplay": "14", "statusKey": "DEFAULTED" },
          { "x": "Closed early", "y": 8, "yDisplay": "8", "statusKey": "CLOSED_PREMATURE" }
        ]
      }
    ],
    "summary": { "total": 529, "centreLabel": "529 schemes" },
    "drilldown": { "enabled": true, "path": "/schemes", "paramKey": "status", "paramSource": "statusKey" }
  }
}
```

**`GET /admin/dashboard/charts/gold-accrual-trend`**
```json
{
  "success": true,
  "data": {
    "chartType": "area",
    "title": "Gold accrued",
    "yAxis": { "type": "weight", "label": "Grams", "unit": "g" },
    "series": [
      {
        "key": "cumulative",
        "name": "Cumulative grams",
        "data": [
          { "x": "2026-07", "y": 2418200, "yDisplay": "2418.200 g" },
          { "x": "2026-08", "y": 2634900, "yDisplay": "2634.900 g" },
          { "x": "2026-09", "y": 2841500, "yDisplay": "2841.500 g" }
        ]
      }
    ],
    "summary": {
      "total": { "weightMg": 2841500, "weightDisplay": "2841.500 g" },
      "valueAtCurrentRate": { "amountPaise": 2060087500, "amountDisplay": "₹2,06,00,875" },
      "changePercent": 7.8,
      "changeDirection": "up",
      "note": "This is the gold you owe customers at maturity, valued at today's rate."
    }
  }
}
```

---

## 4. Reports

**`GET /admin/reports/:reportKey`**

Every report returns the same three-part envelope: **`summary`** (KPI strip), **`charts`** (one or more `ChartSeries`), **`rows`** (the paginated table) plus **`columns`** describing the table so the designer builds one generic table component.

Common query: `from`, `to`, `branchId`, `planId`, `staffId`, `groupBy`, `limit`, `cursor`, `sort`.

**Range cap:** 12 months per query. Beyond that the API returns `422 REPORT_RANGE_TOO_LARGE` with a message pointing at the async export, which has no cap.

| `reportKey` | Covers |
|---|---|
| `COLLECTION` | Every payment, grouped by day / branch / staff / mode / plan |
| `ENROLMENT` | New schemes by period, plan, branch, staff |
| `OUTSTANDING` | Expected vs collected, with ageing |
| `MATURITY_REDEMPTION` | Maturities, settlements, modes, benefit paid out |
| `GOLD_ACCRUAL` | Grams outstanding per plan, liability at today's rate |
| `CUSTOMER_LEDGER` | Per-customer statement rows |
| `STAFF_PERFORMANCE` | Enrolments, collections, cash discipline per staff |
| `CASH_HANDOVER` | Collected vs handed over vs in hand, discrepancies |
| `REMINDER_DELIVERY` | Message volume, delivery and failure rates |
| `WHATSAPP_USAGE` | Quota consumption by type and period |
| `SCHEME_REGISTER` | Full register of schemes with status and balances |
| `DEFAULTER` | Defaulted schemes with recovery value |

### `GET /admin/reports/COLLECTION?from=2026-09-01&to=2026-09-14&groupBy=BRANCH`

```json
{
  "success": true,
  "data": {
    "reportKey": "COLLECTION",
    "title": "Collection report",
    "scope": { "level": "TENANT", "label": "All showrooms" },
    "period": { "from": "2026-09-01", "to": "2026-09-14", "label": "1 – 14 Sep 2026" },
    "generatedAt": "2026-09-14T10:30:00+05:30",

    "summary": [
      { "key": "TOTAL_COLLECTED", "label": "Total collected", "value": { "amountPaise": 184500000, "amountDisplay": "₹18,45,000" }, "valueType": "currency", "change": { "percent": 12.4, "direction": "up" } },
      { "key": "PAYMENT_COUNT", "label": "Payments", "value": 184, "valueType": "count" },
      { "key": "AVERAGE_PAYMENT", "label": "Average payment", "value": { "amountPaise": 1002717, "amountDisplay": "₹10,027" }, "valueType": "currency" },
      { "key": "GOLD_CREDITED", "label": "Gold credited", "value": { "weightMg": 254482, "weightDisplay": "254.482 g" }, "valueType": "weight" },
      { "key": "CASH_SHARE", "label": "Cash share", "value": 61.2, "valueType": "percent" }
    ],

    "charts": {
      "trend": {
        "chartType": "line",
        "title": "Daily collection",
        "yAxis": { "type": "currency", "label": "Amount" },
        "series": [ { "key": "COLLECTED", "name": "Collected", "data": [ { "x": "2026-09-01", "y": 4520000, "yDisplay": "₹45,200" }, { "x": "2026-09-02", "y": 3810000, "yDisplay": "₹38,100" } ] } ]
      },
      "byMode": {
        "chartType": "donut",
        "title": "By payment mode",
        "yAxis": { "type": "currency", "label": "Amount" },
        "series": [ { "key": "mode", "name": "Amount", "data": [
          { "x": "Cash", "y": 112900000, "yDisplay": "₹11,29,000", "modeKey": "CASH" },
          { "x": "Card / POS", "y": 15600000, "yDisplay": "₹1,56,000", "modeKey": "CARD" },
          { "x": "UPI", "y": 41200000, "yDisplay": "₹4,12,000", "modeKey": "UPI" },
          { "x": "Bank transfer", "y": 6800000, "yDisplay": "₹68,000", "modeKey": "BANK_TRANSFER" },
          { "x": "Cheque", "y": 4800000, "yDisplay": "₹48,000", "modeKey": "CHEQUE" },
          { "x": "Online payment", "y": 3200000, "yDisplay": "₹32,000", "modeKey": "ONLINE_GATEWAY" }
        ] } ],
        "drilldown": { "enabled": true, "path": "/payments", "paramKey": "mode", "paramSource": "modeKey" }
      },
      "byBranch": {
        "chartType": "stackedBar",
        "title": "By showroom and mode",
        "yAxis": { "type": "currency", "label": "Amount" },
        "series": [
          { "key": "CASH", "name": "Cash", "data": [ { "x": "MG Road", "y": 68400000, "yDisplay": "₹6,84,000" }, { "x": "Panampilly Nagar", "y": 44500000, "yDisplay": "₹4,45,000" } ] },
          { "key": "CARD", "name": "Card / POS", "data": [ { "x": "MG Road", "y": 9600000, "yDisplay": "₹96,000" }, { "x": "Panampilly Nagar", "y": 6000000, "yDisplay": "₹60,000" } ] },
          { "key": "UPI", "name": "UPI", "data": [ { "x": "MG Road", "y": 25200000, "yDisplay": "₹2,52,000" }, { "x": "Panampilly Nagar", "y": 16000000, "yDisplay": "₹1,60,000" } ] },
          { "key": "BANK_TRANSFER", "name": "Bank transfer", "data": [ { "x": "MG Road", "y": 4000000, "yDisplay": "₹40,000" }, { "x": "Panampilly Nagar", "y": 2800000, "yDisplay": "₹28,000" } ] },
          { "key": "CHEQUE", "name": "Cheque", "data": [ { "x": "MG Road", "y": 3000000, "yDisplay": "₹30,000" }, { "x": "Panampilly Nagar", "y": 1800000, "yDisplay": "₹18,000" } ] },
          { "key": "ONLINE_GATEWAY", "name": "Online payment", "data": [ { "x": "MG Road", "y": 2200000, "yDisplay": "₹22,000" }, { "x": "Panampilly Nagar", "y": 1000000, "yDisplay": "₹10,000" } ] }
        ]
      }
    },

    "columns": [
      { "key": "label", "label": "Showroom", "type": "text", "sortable": true, "sticky": true },
      { "key": "paymentCount", "label": "Payments", "type": "count", "sortable": true, "align": "right" },
      { "key": "cash", "label": "Cash", "type": "currency", "sortable": true, "align": "right" },
      { "key": "upi", "label": "UPI", "type": "currency", "sortable": true, "align": "right" },
      { "key": "card", "label": "Card / POS", "type": "currency", "align": "right" },
      { "key": "bankTransfer", "label": "Bank transfer", "type": "currency", "align": "right" },
      { "key": "cheque", "label": "Cheque", "type": "currency", "align": "right" },
      { "key": "onlineGateway", "label": "Online payment", "type": "currency", "align": "right" },
      { "key": "total", "label": "Total", "type": "currency", "sortable": true, "align": "right", "emphasis": true },
      { "key": "goldCredited", "label": "Gold credited", "type": "weight", "align": "right" }
    ],

    "rows": [
      {
        "key": "brn_01HQ7A...",
        "label": "MG Road",
        "paymentCount": 112,
        "cash": { "amountPaise": 68400000, "amountDisplay": "₹6,84,000" },
        "card": { "amountPaise": 9600000, "amountDisplay": "₹96,000" },
        "upi": { "amountPaise": 25200000, "amountDisplay": "₹2,52,000" },
        "bankTransfer": { "amountPaise": 4000000, "amountDisplay": "₹40,000" },
        "cheque": { "amountPaise": 3000000, "amountDisplay": "₹30,000" },
        "onlineGateway": { "amountPaise": 2200000, "amountDisplay": "₹22,000" },
        "total": { "amountPaise": 112400000, "amountDisplay": "₹11,24,000" },
        "goldCredited": { "weightMg": 155034, "weightDisplay": "155.034 g" },
        "drilldownPath": "/payments?branchId=brn_01HQ7A&from=2026-09-01&to=2026-09-14"
      },
      {
        "key": "brn_01HQ7B...",
        "label": "Panampilly Nagar",
        "paymentCount": 72,
        "cash": { "amountPaise": 44500000, "amountDisplay": "₹4,45,000" },
        "card": { "amountPaise": 6000000, "amountDisplay": "₹60,000" },
        "upi": { "amountPaise": 16000000, "amountDisplay": "₹1,60,000" },
        "bankTransfer": { "amountPaise": 2800000, "amountDisplay": "₹28,000" },
        "cheque": { "amountPaise": 1800000, "amountDisplay": "₹18,000" },
        "onlineGateway": { "amountPaise": 1000000, "amountDisplay": "₹10,000" },
        "total": { "amountPaise": 72100000, "amountDisplay": "₹7,21,000" },
        "goldCredited": { "weightMg": 99448, "weightDisplay": "99.448 g" },
        "drilldownPath": "/payments?branchId=brn_01HQ7B&from=2026-09-01&to=2026-09-14"
      }
    ],

    "totalsRow": {
      "label": "Total",
      "paymentCount": 184,
      "cash": { "amountPaise": 112900000, "amountDisplay": "₹11,29,000" },
      "card": { "amountPaise": 15600000, "amountDisplay": "₹1,56,000" },
      "upi": { "amountPaise": 41200000, "amountDisplay": "₹4,12,000" },
      "bankTransfer": { "amountPaise": 6800000, "amountDisplay": "₹68,000" },
      "cheque": { "amountPaise": 4800000, "amountDisplay": "₹48,000" },
      "onlineGateway": { "amountPaise": 3200000, "amountDisplay": "₹32,000" },
      "total": { "amountPaise": 184500000, "amountDisplay": "₹18,45,000" },
      "goldCredited": { "weightMg": 254482, "weightDisplay": "254.482 g" }
    },

    "exportFormats": ["CSV", "XLSX", "PDF"]
  },
  "meta": { "nextCursor": null, "hasMore": false }
}
```

`columns` + `rows` + `totalsRow` is the pattern for **every** report. Build the table component once.

### `GET /admin/reports/OUTSTANDING`

```json
{
  "success": true,
  "data": {
    "reportKey": "OUTSTANDING",
    "title": "Outstanding & ageing",
    "summary": [
      { "key": "EXPECTED_TO_DATE", "label": "Expected to date", "value": { "amountPaise": 428000000, "amountDisplay": "₹42,80,000" }, "valueType": "currency" },
      { "key": "COLLECTED_TO_DATE", "label": "Collected to date", "value": { "amountPaise": 386800000, "amountDisplay": "₹38,68,000" }, "valueType": "currency" },
      { "key": "OUTSTANDING", "label": "Outstanding", "value": { "amountPaise": 41200000, "amountDisplay": "₹4,12,000" }, "valueType": "currency", "severity": "WARNING" },
      { "key": "COLLECTION_EFFICIENCY", "label": "Collection efficiency", "value": 90.4, "valueType": "percent" },
      { "key": "FUTURE_EXPECTED", "label": "Future installments", "value": { "amountPaise": 942000000, "amountDisplay": "₹94,20,000" }, "valueType": "currency" }
    ],
    "charts": {
      "ageing": {
        "chartType": "bar",
        "title": "Outstanding by ageing",
        "yAxis": { "type": "currency", "label": "Amount" },
        "series": [ { "key": "OUTSTANDING", "name": "Outstanding", "data": [ { "x": "1–7 days", "y": 9000000, "yDisplay": "₹90,000" }, { "x": "8–15 days", "y": 12600000, "yDisplay": "₹1,26,000" }, { "x": "16–30 days", "y": 9800000, "yDisplay": "₹98,000" }, { "x": "30+ days", "y": 9800000, "yDisplay": "₹98,000" } ] } ]
      },
      "efficiencyTrend": {
        "chartType": "line",
        "title": "Collection efficiency",
        "yAxis": { "type": "percent", "label": "Efficiency", "min": 0, "max": 100 },
        "series": [ { "key": "EFFICIENCY", "name": "Efficiency", "data": [ { "x": "2026-07", "y": 92.1 }, { "x": "2026-08", "y": 91.3 }, { "x": "2026-09", "y": 90.4 } ] } ]
      }
    },
    "columns": [
      { "key": "customer", "label": "Customer", "type": "customer", "sticky": true },
      { "key": "schemeNumber", "label": "Scheme", "type": "text" },
      { "key": "branch", "label": "Showroom", "type": "text" },
      { "key": "overdueCount", "label": "Missed", "type": "count", "align": "right" },
      { "key": "overdueAmount", "label": "Overdue", "type": "currency", "align": "right", "emphasis": true },
      { "key": "ageingDays", "label": "Oldest (days)", "type": "count", "align": "right", "sortable": true },
      { "key": "ageingBucket", "label": "Bucket", "type": "badge" },
      { "key": "lastPaymentAt", "label": "Last paid", "type": "date" }
    ],
    "rows": [
      {
        "key": "sch_01HQ7Z...",
        "customer": { "id": "cus_01HQ7Z...", "name": "Suresh Kumar", "mobile": "9847XXXX88", "passbookNumber": "MGR/2026/00288" },
        "schemeNumber": "MGR/DH11/2026/00201",
        "branch": "MG Road",
        "overdueCount": 2,
        "overdueAmount": { "amountPaise": 1000000, "amountDisplay": "₹10,000" },
        "ageingDays": 66,
        "ageingBucket": { "value": "30_PLUS", "label": "30+ days", "severity": "HIGH" },
        "lastPaymentAt": "2026-06-10",
        "drilldownPath": "/schemes/sch_01HQ7Z"
      }
    ]
  }
}
```

### `GET /admin/reports/GOLD_ACCRUAL`

```json
{
  "success": true,
  "data": {
    "reportKey": "GOLD_ACCRUAL",
    "title": "Gold accrual & liability",
    "valuationRate": { "ratePerGramPaise": 725000, "ratePerGramDisplay": "₹7,250", "asOf": "2026-09-14T09:00:00+05:30" },
    "summary": [
      { "key": "TOTAL_GRAMS", "label": "Gold owed", "value": { "weightMg": 2841500, "weightDisplay": "2841.500 g" }, "valueType": "weight" },
      { "key": "LIABILITY_TODAY", "label": "Liability at today's rate", "value": { "amountPaise": 2060087500, "amountDisplay": "₹2,06,00,875" }, "valueType": "currency" },
      { "key": "AMOUNT_RECEIVED", "label": "Amount received", "value": { "amountPaise": 2041200000, "amountDisplay": "₹2,04,12,000" }, "valueType": "currency" },
      { "key": "RATE_EXPOSURE", "label": "Rate exposure", "value": { "amountPaise": 18887500, "amountDisplay": "₹1,88,875" }, "valueType": "currency", "severity": "INFO", "note": "Difference between today's value and what customers actually paid." }
    ],
    "charts": {
      "accrualTrend": { "chartType": "area", "title": "Cumulative grams", "yAxis": { "type": "weight", "label": "Grams" }, "series": [ { "key": "GOLD_ACCRUED", "name": "Grams", "data": [ { "x": "2026-07", "y": 2418200 }, { "x": "2026-08", "y": 2634900 }, { "x": "2026-09", "y": 2841500 } ] } ] },
      "byPlan": { "chartType": "horizontalBar", "title": "Grams by plan", "yAxis": { "type": "weight", "label": "Grams" }, "series": [ { "key": "grams", "name": "Grams", "data": [ { "x": "Swarna Plus 11", "y": 1842300, "yDisplay": "1842.300 g" }, { "x": "Flexi Gold 11", "y": 999200, "yDisplay": "999.200 g" } ] } ] }
    },
    "columns": [
      { "key": "label", "label": "Plan", "type": "text", "sticky": true },
      { "key": "activeSchemes", "label": "Schemes", "type": "count", "align": "right" },
      { "key": "gramsAccrued", "label": "Grams owed", "type": "weight", "align": "right", "emphasis": true },
      { "key": "amountReceived", "label": "Received", "type": "currency", "align": "right" },
      { "key": "liabilityToday", "label": "Liability today", "type": "currency", "align": "right" },
      { "key": "averageRatePaid", "label": "Avg rate paid", "type": "currency", "align": "right" }
    ],
    "rows": [
      {
        "key": "spl_01HQ7...",
        "label": "Swarna Plus 11",
        "activeSchemes": 284,
        "gramsAccrued": { "weightMg": 1842300, "weightDisplay": "1842.300 g" },
        "amountReceived": { "amountPaise": 1328400000, "amountDisplay": "₹1,32,84,000" },
        "liabilityToday": { "amountPaise": 1335667500, "amountDisplay": "₹1,33,56,675" },
        "averageRatePaid": { "ratePerGramPaise": 721050, "ratePerGramDisplay": "₹7,211" }
      }
    ]
  }
}
```

### `GET /admin/reports/STAFF_PERFORMANCE`

```json
{
  "success": true,
  "data": {
    "reportKey": "STAFF_PERFORMANCE",
    "title": "Staff performance",
    "summary": [
      { "key": "TOTAL_COLLECTED", "label": "Collected by staff", "value": { "amountPaise": 118400000, "amountDisplay": "₹11,84,000" }, "valueType": "currency" },
      { "key": "ENROLMENTS", "label": "Enrolments", "value": 34, "valueType": "count" },
      { "key": "STAFF_ACTIVE", "label": "Active staff", "value": 6, "valueType": "count" }
    ],
    "charts": {
      "collectionByStaff": { "chartType": "horizontalBar", "title": "Collection by staff", "yAxis": { "type": "currency", "label": "Amount" }, "series": [ { "key": "COLLECTED", "name": "Collected", "data": [ { "x": "Rahul Nair", "y": 28400000, "yDisplay": "₹2,84,000" }, { "x": "Anoop M", "y": 24100000, "yDisplay": "₹2,41,000" } ] } ] },
      "enrolmentsByStaff": { "chartType": "horizontalBar", "title": "Enrolments by staff", "yAxis": { "type": "count", "label": "Enrolments" }, "series": [ { "key": "enrolments", "name": "Enrolments", "data": [ { "x": "Rahul Nair", "y": 12 }, { "x": "Anoop M", "y": 9 } ] } ] }
    },
    "columns": [
      { "key": "staff", "label": "Staff", "type": "staff", "sticky": true },
      { "key": "branch", "label": "Showroom", "type": "text" },
      { "key": "enrolments", "label": "Enrolments", "type": "count", "align": "right", "sortable": true },
      { "key": "collected", "label": "Collected", "type": "currency", "align": "right", "sortable": true, "emphasis": true },
      { "key": "receiptCount", "label": "Receipts", "type": "count", "align": "right" },
      { "key": "cashInHand", "label": "Cash in hand", "type": "currency", "align": "right" },
      { "key": "avgHoldingDays", "label": "Avg holding (days)", "type": "number", "align": "right" },
      { "key": "discrepancies", "label": "Discrepancies", "type": "count", "align": "right", "severityOnNonZero": true }
    ],
    "rows": [
      {
        "key": "usr_01HQ8Z...",
        "staff": { "id": "usr_01HQ8Z...", "name": "Rahul Nair", "role": "BRANCH_STAFF" },
        "branch": "MG Road",
        "enrolments": 12,
        "collected": { "amountPaise": 28400000, "amountDisplay": "₹2,84,000" },
        "receiptCount": 62,
        "cashInHand": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
        "avgHoldingDays": 1.8,
        "discrepancies": 1
      }
    ]
  }
}
```

Remaining report keys follow the identical envelope. The shapes worth noting:

- `ENROLMENT` — rows per period/plan/staff, with `enrolments`, `totalCommitted`, `averageInstallment`, `firstInstallmentCollectedCount`; charts `enrolmentTrend` (bar) and `byPlan` (horizontalBar).
- `MATURITY_REDEMPTION` — rows per redemption; summary carries `totalSettled`, `benefitPaidOut`, `penaltyCollected`, `goldHandedOver`; charts `settlementTrend` (line) and `byMode` (donut).
- `CUSTOMER_LEDGER` — requires `customerId`; rows are ledger entries with a running balance column.
- `REMINDER_DELIVERY` and `WHATSAPP_USAGE` — see `10-reminders-whatsapp.md §4`; same envelope.
- `SCHEME_REGISTER` — the full register: scheme number, customer, plan, status, start, maturity, paid, outstanding, grams. This is the report jewellers print for their accountant.
- `DEFAULTER` — rows from `08 §4` plus `recoveryValue`.

---

## 4.1 Payment-mode alignment across all analytics

Every `byMode` grouping, chart series and report column returns the six final modes with the exact keys and labels from `00-conventions.md §12`, in that order, including zero rows.

Affected responses:

```
GET /admin/dashboard/charts/collection-by-mode
GET /admin/dashboard/charts/collection-by-branch
GET /admin/reports/COLLECTION
GET /admin/collections/summary
GET /admin/payments?includeSummary=true
GET /staff/home
GET /staff/collections/summary
```

Rules:

- **Never collapse counter UPI, Card/POS, Bank transfer and Online gateway into a single "online" bucket.** That is the exact defect this change removes.
- `LEGACY_ONLINE` stays a **separate row** in any window that includes pre-migration records, so historical totals still reconcile. It is never merged into `ONLINE_GATEWAY`.
- Each data point carries `modeKey` so drill-down can filter the payment list by mode.
- Only `CASH` contributes to cash-in-hand anywhere in the system.

## 4.2 Chart colour policy

Backend responses use the common `ChartSeries` shape, but the backend does **not** own branding. `color` is forbidden in chart series and data points. Stable semantic `key`, `modeKey` and `statusKey` values are the only visual hooks. The frontend assigns burgundy, muted gold and supporting neutrals from its design tokens.

`isGood`, `direction` and `severity` carry the semantics; the frontend maps those to accessible colours. Every summary and chart echoes its scope and period, directly or through the enclosing response, and every drill-down path preserves the filters represented by the card or point it came from.

## 4.3 Do not duplicate existing analytics

These UI needs are already served. Do not build parallel routes for them:

| UI requirement | Existing API |
|---|---|
| Admin dashboard cards | `GET /admin/dashboard/summary` |
| Dashboard charts | `GET /admin/dashboard/charts/:chartKey` |
| Collection / enrolment / outstanding / maturity / gold / staff analytics | the corresponding `GET /admin/reports/:reportKey` |
| Cash analytics | `GET /admin/cash/overview`, `/admin/cash/report`, `/admin/reports/CASH_HANDOVER` |
| Reminder & WhatsApp analytics | `GET /admin/messaging/summary`, `/admin/reports/REMINDER_DELIVERY`, `/admin/reports/WHATSAPP_USAGE` |
| Per-plan analytics | `GET /admin/scheme-plans/:planId/stats` |
| Due / overdue cards and ageing | `GET /admin/dues`, `/admin/overdues` with `includeSummary=true` |
| Maturity list and calendar | `GET /admin/maturities`, `/admin/maturities/calendar` |
| Customer / KYC / branch analytics | `GET /admin/customers/analytics` (`04 §9.2`) |
| Operational payment cards | `GET /admin/payments?includeSummary=true&includeCharts=true` (`07 §10`) |
| Staff personal dashboard | `GET /staff/dashboard/summary` |
| Staff operational home | `GET /staff/home` |
| Activity feed | `GET /admin/dashboard/activity` |
| Full filterable audit | `GET /admin/audit-events` (`17`) |

There is **no** `GET /admin/dashboard` and **no** `GET /admin/schemes/analytics`. Both would duplicate the above.

**Maturity forecast is not implemented.** No endpoint, no chart key, no UI. It stays here only as a deferred P2 idea; building an endpoint with no UI consumer is wasted effort.

---

## 5. Async export

Any report or list can be exported. Exports have **no range cap** and no row cap.

**`POST /admin/exports`**
```json
{
  "reportKey": "COLLECTION",
  "filters": { "from": "2025-04-01", "to": "2026-03-31", "branchId": null, "groupBy": "DAY" },
  "format": "XLSX",
  "includeCharts": false,
  "deliverBy": "DOWNLOAD"
}
```

`format` ∈ `CSV` | `XLSX` | `PDF`. `PDF` renders the summary strip and charts as images above the table. `deliverBy` ∈ `DOWNLOAD` | `WHATSAPP` (P1.5, sends the file to the requesting user's mobile).

```json
{
  "success": true,
  "data": {
    "exportId": "exp_01HQ8Z...",
    "status": "QUEUED",
    "estimatedRows": 4820,
    "estimatedSeconds": 25,
    "statusUrl": "/api/v1/admin/exports/exp_01HQ8Z..."
  }
}
```

**`GET /admin/exports/:exportId`**
```json
{
  "success": true,
  "data": {
    "id": "exp_01HQ8Z...",
    "reportKey": "COLLECTION",
    "format": "XLSX",
    "status": "READY",
    "progressPercent": 100,
    "rowCount": 4820,
    "fileSizeBytes": 842910,
    "url": "https://cdn.../exports/exp_01HQ8Z.xlsx",
    "expiresAt": "2026-09-15T10:30:00+05:30",
    "requestedAt": "2026-09-14T10:30:00+05:30",
    "generatedAt": "2026-09-14T10:30:24+05:30",
    "requestedBy": { "id": "usr_01HQ7...", "name": "Mahesh Kumar" }
  }
}
```

While running:
```json
{ "status": "PROCESSING", "progressPercent": 42, "retryAfterSeconds": 3 }
```

Failed:
```json
{ "status": "FAILED", "failureReason": "Report range exceeded the maximum of 5 years.", "canRetry": false }
```

Download URLs are signed and expire after 24 hours. Rate limit: 5 exports per tenant per hour.

---

## 6. Staff app dashboard

**`GET /staff/dashboard/summary`** — deliberately narrow. A staff member sees their own numbers and their branch's due list, not branch-wide financials.

```json
{
  "success": true,
  "data": {
    "staff": { "id": "usr_01HQ8Z...", "name": "Rahul Nair" },
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
    "widgets": [
      { "key": "TODAY_COLLECTED", "label": "Collected today", "value": { "amountPaise": 1350000, "amountDisplay": "₹13,500" }, "valueType": "currency", "secondary": { "label": "8 receipts", "value": 8 } },
      { "key": "TODAY_BY_MODE", "label": "By mode", "valueType": "breakdown", "value": [
        { "mode": "CASH", "label": "Cash", "amount": { "amountPaise": 700000, "amountDisplay": "₹7,000" } },
        { "mode": "CARD", "label": "Card / POS", "amount": { "amountPaise": 200000, "amountDisplay": "₹2,000" } },
        { "mode": "UPI", "label": "UPI", "amount": { "amountPaise": 300000, "amountDisplay": "₹3,000" } },
        { "mode": "BANK_TRANSFER", "label": "Bank transfer", "amount": { "amountPaise": 0, "amountDisplay": "₹0" } },
        { "mode": "CHEQUE", "label": "Cheque", "amount": { "amountPaise": 0, "amountDisplay": "₹0" } },
        { "mode": "ONLINE_GATEWAY", "label": "Online payment", "amount": { "amountPaise": 150000, "amountDisplay": "₹1,500" } }
      ] },
      { "key": "CASH_IN_HAND", "label": "Cash in hand", "value": { "amountPaise": 1850000, "amountDisplay": "₹18,500" }, "valueType": "currency", "severity": "WARNING", "actionPath": "/cash" },
      { "key": "DUE_TODAY", "label": "Due today", "value": 47, "valueType": "count", "secondary": { "label": "₹2,35,000", "value": { "amountPaise": 23500000, "amountDisplay": "₹2,35,000" } }, "actionPath": "/dues" },
      { "key": "OVERDUE", "label": "Overdue", "value": 18, "valueType": "count", "severity": "WARNING", "actionPath": "/overdues" },
      { "key": "MY_ENROLMENTS", "label": "Enrolments this month", "value": 12, "valueType": "count" }
    ],
    "monthSummary": {
      "collected": { "amountPaise": 28400000, "amountDisplay": "₹2,84,000" },
      "receiptCount": 62,
      "enrolments": 12,
      "chart": {
        "chartType": "bar",
        "title": "My collection this month",
        "yAxis": { "type": "currency", "label": "Amount" },
        "series": [ { "key": "COLLECTED", "name": "Collected", "data": [ { "x": "2026-09-12", "y": 1840000, "yDisplay": "₹18,400" }, { "x": "2026-09-13", "y": 2210000, "yDisplay": "₹22,100" }, { "x": "2026-09-14", "y": 1350000, "yDisplay": "₹13,500" } ] } ]
      }
    },
    "goldRate": { "isSetForToday": true, "ratePerGramDisplay": "₹7,250" },
    "alerts": [
      { "severity": "MEDIUM", "message": "You're holding ₹18,500. Hand over before closing.", "actionPath": "/cash/handover/new" }
    ]
  }
}
```

---

## 7. Activity feed

**`GET /admin/dashboard/activity`** (P1.5) — a live tail of what's happening, for the owner who wants an ambient view.

```json
{
  "success": true,
  "data": [
    { "id": "act_01", "at": "2026-09-14T10:30:00+05:30", "type": "PAYMENT", "text": "Rahul Nair collected ₹5,000 from Anjali Menon", "branch": "MG Road", "path": "/payments/pay_01HQ8Z" },
    { "id": "act_02", "at": "2026-09-14T10:12:00+05:30", "type": "ENROLMENT", "text": "New scheme MGR/DH11/2026/00319 enrolled by Anoop M", "branch": "MG Road", "path": "/schemes/sch_01HQ8Z" },
    { "id": "act_03", "at": "2026-09-14T09:48:00+05:30", "type": "REDEMPTION", "text": "Redemption of ₹60,000 awaiting your approval", "branch": "MG Road", "severity": "WARNING", "path": "/redemptions/rdm_01HQ8Z" }
  ],
  "meta": { "nextCursor": "eyJpZCI6...", "hasMore": true }
}
```

Activity types: `PAYMENT`, `ENROLMENT`, `REDEMPTION`, `CLOSURE`, `CASH_HANDOVER`, `REVERSAL`, `GOLD_RATE`, `STAFF`, `LATE_SUCCESS`.
