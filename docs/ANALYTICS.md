# CareConnect — Platform Analytics & Aggregation Engine

This document outlines the architectural design, MongoDB aggregation pipelines, financial precision guarantees, and endpoint contracts of the CareConnect Analytics Subsystem.

---

## 1. System Overview & RBAC Boundaries

The analytics engine powers real-time reporting for platform executives and operations personnel. It processes high-volume transactional data from Bookings, Invoices, Jobs, Service Requests, Disputes, and Support Tickets without requiring external OLAP data warehouses.

- **Access Level**: Server-side enforced via `authorize('PLATFORM_ADMIN', 'OPERATIONS_MANAGER')`.
- **Query Execution**: High-efficiency MongoDB aggregation pipelines leveraging compound indexes.
- **Date Filtering**: Supports dynamic query parameters (`startDate`, `endDate`). Date strings (`YYYY-MM-DD`) are automatically normalized to UTC day boundaries (`00:00:00.000` to `23:59:59.999`).

---

## 2. Core Aggregation Architecture & Principles

### 2.1 Financial Precision (Integer Cents)
To prevent floating-point drift common in financial computations (e.g. `0.1 + 0.2 = 0.30000000000000004`), all invoice balances and platform fees are stored and aggregated as **integer cents**.
- Aggregations compute sums on `totalInvoicedCents` and `paidRevenueCents`.
- Projected payloads return both precise integer amounts and formatted float amounts (`cents / 100`) for display.

### 2.2 Division-by-Zero Protection
All computed rates (completion rates, cancellation rates, resolution rates) utilize conditional guards:
```javascript
const completionRate = totalBookings > 0
  ? Number(((completedBookings / totalBookings) * 100).toFixed(2))
  : 0;
```
Inside MongoDB aggregation stages, `$cond` prevents pipeline crashes:
```javascript
{
  $cond: [
    { $gt: ['$totalJobs', 0] },
    { $round: [{ $multiply: [{ $divide: ['$completedJobs', '$totalJobs'] }, 100] }, 2] },
    0
  ]
}
```

---

## 3. Analytics Endpoints & Pipelines

### 3.1 Overview KPI Summary
- **Endpoint**: `GET /api/v1/admin/analytics/overview`
- **Query Params**: `startDate`, `endDate`
- **Description**: Consolidates executive metrics across bookings, revenue, dispute ratios, support queues, top categories, and top providers via parallel `Promise.all` aggregations.
- **Payload Structure**:
  ```json
  {
    "success": true,
    "data": {
      "bookings": { "totalBookings": 120, "completedBookings": 110, "completionRate": 91.67 },
      "revenue": { "totalInvoiced": 550000, "paidRevenue": 520000, "paidRate": 94.55 },
      "disputes": { "totalDisputes": 4, "resolvedCount": 3, "resolutionRate": 75.0 },
      "support": { "totalTickets": 18, "resolvedCount": 16, "resolutionRate": 88.89 },
      "topCategories": [...],
      "topProviders": [...]
    }
  }
  ```

---

### 3.2 Booking Trends
- **Endpoint**: `GET /api/v1/admin/analytics/bookings`
- **Pipeline Strategy**:
  1. `$match` on date range.
  2. `$group` by `$dateToString` (`%Y-%m-%d`) to construct daily time-series buckets.
  3. Conditional summation (`$sum: { $cond: [...] }`) across statuses (`COMPLETED`, `CANCELLED`, `IN_PROGRESS`, `CONFIRMED`, `DISPUTED`).
  4. Parallel aggregation for summary totals and conversion percentages.

---

### 3.3 Revenue & Billing Trends
- **Endpoint**: `GET /api/v1/admin/analytics/revenue`
- **Pipeline Strategy**:
  1. Filters invoices by `createdAt`.
  2. Aggregates `paidInvoices` vs total invoices.
  3. Accumulates `totalInvoicedCents` and `paidRevenueCents` ($status = `PAID`$).
  4. Computes daily timeline and overall collection efficiency rate (`paidRate`).

---

### 3.4 Provider Performance & Leaderboards
- **Endpoint**: `GET /api/v1/admin/analytics/providers`
- **Query Params**: `startDate`, `endDate`, `limit` (default 20)
- **Pipeline Strategy**:
  1. Groups `jobs` by `provider`.
  2. `$lookup` join to `users` collection for personal details.
  3. `$lookup` join to `providerprofiles` for ratings, review counts, and business names.
  4. Correlated sub-pipeline `$lookup` to `invoices` matching `$provider` and `$status == PAID`.
  5. Sorts descending by `completedJobs` and total volume.

---

### 3.5 Category Demand & Market Penetration
- **Endpoint**: `GET /api/v1/admin/analytics/categories`
- **Pipeline Strategy**:
  1. Aggregates `ServiceRequest` records by `category` to track initial demand.
  2. Aggregates `Booking` records by category to track conversion and fulfilled revenue.
  3. Merges catalog categories with aggregated counts, ensuring zero-demand categories are still represented with accurate zero-counts.
  4. Sorts descending by total booking conversion.

---

### 3.6 Dispute & Support Ticket Operational Health
- **Endpoints**:
  - `GET /api/v1/admin/analytics/disputes`
  - `GET /api/v1/admin/analytics/support`
- **Metrics Tracked**:
  - Daily incident creation vs. resolution volume.
  - Priority distribution (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - Average resolution turnaround time in hours.
  - Refund approval rate and total refunded volume.

---

## 4. Frontend Visualization Architecture

The frontend (`/admin/analytics`) renders high-performance interactive visualizations:
- **Component Stack**: React, Tailwind CSS, Lucide Icons, and Recharts.
- **Controls**: Pre-configured date filter presets (Last 7 Days, Last 30 Days, Last 90 Days, All Time) plus custom ISO date pickers.
- **Widgets**:
  - Metric summary cards with percentage trend indicators.
  - Responsive multi-line chart comparing bookings requested vs completed.
  - Stacked bar charts depicting invoiced vs paid revenue.
  - Top category demand bar breakdown.
  - Ranked provider table with star ratings, completion rates, and total payouts.
