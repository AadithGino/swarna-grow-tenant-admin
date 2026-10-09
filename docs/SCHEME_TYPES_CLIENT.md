# Types of jewellery savings schemes (market overview)

A short guide for **jewellers who are new to running schemes** — what customers expect in the market, and what SwarnaGrow supports.

Most shops run schemes in one of two styles: **fixed monthly installments** or **flexible saving then fixed monthly cap**. Amount can be tracked in **rupees (cash)** or in **gold weight** (each payment buys gold at that day’s rate).

---

## Part A — Fixed schemes (monthly installment plans)

The customer joins for a fixed period (often **11 months pay + 1 month benefit**, or **12 equal months**). They pay **the same idea every month** on a due date. The shop tracks who paid, who is due, and who is overdue.

SwarnaGrow supports **three common ways** to set the monthly amount:

### 1. Fixed by jeweller (one amount for everyone)

**Market example:** “Our Dhanam scheme — ₹5,000 every month for 11 months.”

- You decide the installment (e.g. ₹2,000, ₹5,000, ₹10,000).
- Every customer on that plan pays the **same** amount.
- Simple for staff and for marketing: one poster, one number.

**Good when:** You want a branded product with no negotiation at the counter.

---

### 2. Fixed by customer (choose amount within your limits)

**Market example:** “Join our savings plan — you choose from ₹1,000 to ₹50,000 per month (in steps of ₹500).”

- Customer picks an amount **within your minimum, maximum, and step** when they enrol.
- That amount is **locked** for all future installments on that enrollment.
- Different customers on the same plan name can pay different amounts.

**Good when:** You want one scheme name but serve both small and large savers.

---

### 3. Slabs (pick a tier)

**Market example:** “Choose your slab: ₹1,000 / ₹2,000 / ₹5,000 / ₹10,000 per month.”

- You publish a **fixed list of amounts** (slabs).
- Customer selects **one slab** at joining; they pay that slab every month.
- Easier than free typing; still gives choice without unlimited amounts.

**Good when:** You want choice but controlled options (like package tiers).

---

### What fixed schemes usually include

| Feature | Typical in market |
|--------|-------------------|
| Due date | Same day each month (e.g. 10th) or based on join date |
| Benefit | 12th month free, bonus %, or store promise (e.g. making charges waived) |
| Reminders | SMS/WhatsApp for due and overdue |
| Gold vs cash | **Cash scheme** — balance in rupees. **Gold scheme** — each payment adds weight at daily rate; customer redeems gold or cash per your rules |

**In SwarnaGrow:** Fixed schemes appear on **dues / overdue** lists; agents can collect; customer app can show next due and pay online if you enable it.

---

## Part B — Flexible scheme (free months, then capped months)

Popular with customers who want to **save irregularly at first**, then commit to a **steady monthly amount** after the shop sees how much they saved.

### Typical structure: **6 months free + 5 months capped**

**Market story:**  
“For the **first 6 months**, save whatever you can (within our min/max). After 6 months, we calculate your average and set your **monthly payment for the last 5 months**. Complete those 5 months to mature the scheme.”

| Phase | Duration (example) | Customer experience |
|-------|-------------------|---------------------|
| **Free / flexible window** | 6 months | Pay optional amounts any time in the month (e.g. ₹500–₹25,000 per payment). No fixed “installment due” like a chit. |
| **Capped window** | 5 months | Shop sets a **monthly cap** from what was saved in the free phase (e.g. total saved ÷ 6, rounded). Customer pays up to that cap **each month** for 5 months. |

**Total tenure example:** 6 + 5 = **11 months** of activity, often paired with a **benefit at maturity** (bonus, free installment, or purchase offer).

**Market rules customers understand:**

- Money paid in the free phase **is not lost** — it counts toward the scheme.
- Unused “room” under the monthly cap in capped months usually **does not carry** to the next month (shop policy; SwarnaGrow enforces per-cycle caps).
- This style is **not** the same as a classic 11-month fixed chit — there is **no monthly due list** in the free phase.

**In SwarnaGrow:** You configure `6` flexible cycles and `5` capped cycles (or other splits, e.g. 3 + 9). The system computes the cap from ledger totals and quotes **how much can be paid now** each time.

---

## Quick comparison — what runs in the market

| Scheme style | How amount is set | Customer pays | Shop tracks |
|--------------|-------------------|---------------|-------------|
| **Jeweller fixed** | You set one amount | Same every month | Dues / overdue |
| **Customer chosen** | Customer picks in your range | Same chosen amount every month | Dues / overdue |
| **Slabs** | Customer picks a tier | Slab amount every month | Dues / overdue |
| **6 free + 5 capped** | Free phase: any amount in rules; capped phase: system-set monthly cap | Irregular then fixed cap | Payable quote per phase (not classic dues in free phase) |

---

## Cash scheme vs gold scheme (simple)

| | **Cash savings scheme** | **Gold savings scheme** |
|--|-------------------------|-------------------------|
| **Balance** | Rupees saved | Gold weight accumulated |
| **Each payment** | Adds rupees | Buys gold at **that day’s rate** (you set daily rate in system) |
| **At maturity** | Cash payout, purchase adjustment, or gold handover (as per plan) | Usually gold or value linked to weight; cash option if you allow it |
| **Common in market** | Monthly ₹ schemes, flexi cash | “Gold accumulation” / “booking” schemes |

You can run **both** in the same shop as **separate plan names**.

---

## Starting out — practical suggestion

1. **Begin with one fixed plan** — e.g. jeweller-fixed ₹5,000 × 11 months + 12th month free (cash or gold).
2. **Add slabs or customer choice** if customers ask for flexibility on amount.
3. **Add a flexible plan** (e.g. 6 + 5) when you want a modern “save first, commit later” product.

SwarnaGrow lets you define each product once in **Plan Builder**, then enrol customers at branch, via staff, or (optional) customer self-enrol on the app.

---

## One-page summary

```
FIXED SCHEMES (monthly installment)
├── Fixed by jeweller     → one amount for all
├── Fixed by customer     → amount in your min/max range at join
└── Slabs                 → customer picks ₹1K / ₹2K / ₹5K etc.

FLEXIBLE SCHEMES
└── e.g. 6 months FREE (save any amount in rules)
    then 5 months CAPPED (monthly limit from average saved)

VALUE
├── Cash scheme           → balance in ₹
└── Gold scheme           → balance in gold weight (daily rate)
```

---

*For internal technical detail, see SwarnaGrow plan configuration and API documentation. This sheet is for client onboarding and PDF sharing.*

**SwarnaGrow** · Scheme types for jewellers
