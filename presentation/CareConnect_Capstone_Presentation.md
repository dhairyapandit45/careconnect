---
marp: true
theme: default
paginate: true
header: 'CareConnect — MERN Capstone Presentation'
footer: 'Department of Computer Science & Engineering | Final Capstone Defense'
style: |
  section {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #1e293b;
    background-color: #f8fafc;
    padding: 40px;
  }
  h1 {
    color: #1e40af;
  }
  h2 {
    color: #0369a1;
  }
  table {
    font-size: 0.85em;
  }
  .highlight {
    background-color: #e0f2fe;
    padding: 10px;
    border-radius: 8px;
    border-left: 5px solid #0284c7;
  }
---

# CareConnect
## Home Services Booking & Operations Platform
### Production MERN Stack Capstone Project

**Student Presenter**: CareConnect Engineering Team  
**Technology Stack**: MongoDB | Express.js | React (Vite) | Node.js | Tailwind CSS  
**Project Status**: 100% Complete | 373 Tests Passing | Live Deployed

---

## 1. Problem Statement

Modern urban households face significant friction when sourcing reliable trade services:

- **Fragmented Discovery**: No unified standard for finding plumbers, electricians, or appliance technicians.
- **Price Opacity**: Lack of upfront pricing quotes; customers frequently overcharged on-site.
- **Lack of Verification**: Untrusted service providers entering households without vetted background checks.
- **Operational Black Holes**: No real-time status tracking between booking confirmation and job fulfillment.
- **Absence of Accountability**: No formal dispute resolution or arbitration when services are botched.

---

## 2. Proposed Solution: The CareConnect Platform

CareConnect is an end-to-end multi-role marketplace and operations engine designed to modernize home service logistics:

- **Role-Based Workflows**: Tailored portals for Customers, Providers, Support Agents, Operations Managers, and Platform Admins.
- **Transparent Competitive Bidding**: Providers submit itemized quotes with estimated durations.
- **Strict Verification Onboarding**: Providers must upload identity, address, and license documents before approval.
- **Formal Job State Machine**: Verifiable milestones (`ASSIGNED` $\to$ `EN_ROUTE` $\to$ `IN_PROGRESS` $\to$ `COMPLETED`) with completion photo proof.
- **Explainable AI Integration**: Deterministic classification and multi-factor provider matching without expensive API keys.

---

## 3. High-Level System Architecture

CareConnect implements a decoupled, layered micro-architecture:

```
+-------------------------------------------------------+
|            Client Layer (React 18 + Vite)             |
|   Tailwind CSS | Lucide Icons | Recharts | Context   |
+-------------------------------------------------------+
                           |  HTTPS / REST (JSON)
+-------------------------------------------------------+
|           API Gateway & Middleware (Express)          |
|  Rate Limiting | CORS | JWT Auth | RBAC | Error Hndlr |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|             Business Service Layer (Node.js)          |
|  Booking Engine | Invoicing | Analytics | AI Logic   |
+-------------------------------------------------------+
                           |  Mongoose ODM / Pooling
+-------------------------------------------------------+
|               Data Layer (MongoDB Atlas)              |
|        14 Collections | Compound & Geo Indexes        |
+-------------------------------------------------------+
```

---

## 4. 5-Tier Role-Based Access Control (RBAC)

All security boundaries are enforced server-side. Client route guards optimize UX only.

| Role | Primary Scope & Access |
|:---|:---|
| **CUSTOMER** | Post requests, compare bids, accept quotes, track jobs, pay invoices, submit reviews. |
| **SERVICE_PROVIDER** | Manage operating areas & weekly shifts, submit quotes, upload proof of work. |
| **SUPPORT_AGENT** | Resolve disputes, arbitrate refund amounts, triage threaded support tickets. |
| **OPERATIONS_MANAGER** | Monitor live dispatch queues, reassign jobs, review operational health. |
| **PLATFORM_ADMIN** | Verify provider profiles, manage categories & pricing, inspect immutable audit logs. |

---

## 5. Relational & Schema Data Architecture

CareConnect maintains 14 MongoDB collections with strict referential integrity:

- **Principals**: `User`, `ProviderProfile`, `Availability`
- **Catalog & Orders**: `ServiceCategory`, `ServiceRequest`, `Quote`
- **Fulfillment**: `Booking`, `Job`, `Review`
- **Finance**: `Invoice` (Integer cents precision)
- **Governance**: `Dispute`, `SupportTicket`, `Notification`, `AuditLog`

<div class="highlight">
<strong>Key Guarantee:</strong> Overlapping booking schedules are prevented using interval queries: <code>scheduledStart < newEnd && scheduledEnd > newStart</code>.
</div>

---

## 6. End-to-End Service Fulfillment Lifecycle

```
[Customer] Posts Service Request
    │ (AI Classifies Category: Plumbing / 92% Conf)
    ▼
[Providers] Submit Itemized Quotes (Amount, Duration, Notes)
    │
    ▼
[Customer] Accepts Quote ──► Confirms Booking ──► Provisions Job
                                                    │
                                                    ▼
                             [Provider] EN_ROUTE ──► IN_PROGRESS
                                                    │
                                                    ▼
                             [Provider] Uploads Work Photo ──► COMPLETED
                                                    │
                                                    ▼
                             [System] Generates Invoice INV-2026-XXXX
                                                    │
                                                    ▼
                             [Customer] Pays Invoice ──► Submits 5★ Review
```

---

## 7. Operational Job Tracking & Evidence Verification

- **Milestone State Machine**: Jobs strictly progress through verified states:
  - `ASSIGNED` $\to$ `EN_ROUTE` $\to$ `IN_PROGRESS` $\to$ `COMPLETED`
- **Digital Evidence Requirement**: Providers upload completion photo evidence and service notes before a job can transition to `COMPLETED`.
- **Automatic Invoice Trigger**: Completion instantaneously calculates subtotal, platform commission split (10%), and tax, provisioning an immutable invoice.

---

## 8. Financial Engine & Billing Architecture

### Integer-Cent Precision Guarantee
- Standard IEEE 754 floating-point math causes rounding inaccuracies (`0.1 + 0.2 = 0.30000000000000004`).
- CareConnect stores all invoice balances, platform fees, and refunds in **integer cents** (e.g. ₹1,200 stored as `120000`).
- Mathematical additions, subtractions, and commission calculations remain 100% lossless.

### Automated Revenue Breakdown
- **Subtotal**: Provider service rate.
- **Platform Fee**: Configurable percentage commission.
- **Total Amount**: Guaranteed payable sum.

---

## 9. Customer Disputes & Support Ticketing

- **Arbitration Workflow**:
  - Customers or Providers can raise formal disputes against bookings.
  - Support agents review photo evidence and provider notes.
  - Agents can reject disputes or approve full/partial refunds.
- **Threaded Support Tickets**:
  - Auto-generated ticket numbers (e.g. `TCK-10294`).
  - Prioritized queues (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - Threaded conversational messages with staff-only internal notes (`isInternal: true`).

---

## 10. Platform Analytics & Aggregation Engine

Zero dependency on external OLAP warehouses. Native high-speed MongoDB aggregation pipelines:

- **Executive KPI Overview**: Total bookings, revenue, active disputes, ticket resolution rates.
- **Time-Series Daily Trends**: Bookings and revenue grouped by `%Y-%m-%d`.
- **Category Demand Analysis**: Cross-collection joins (`$lookup`) linking service requests and fulfilled bookings.
- **Provider Leaderboard**: Dynamic ranking based on completed jobs, average star rating, and fulfilled revenue.
- **Division-by-Zero Resilience**: Bounded by `$cond` stages to prevent pipeline crashes during empty date ranges.

---

## 11. Explainable AI: Intelligent Request Classification

- **Zero Cloud API Keys**: Runs deterministically in Node.js memory. Offline ready.
- **Rich Domain Taxonomy**: 5 core categories with 100+ domain terms (e.g. *"p-trap"*, *"mcb"*, *"compressor"*, *"sanitization"*).
- **Multi-Tier Scoring Matrix**:
  - Category Name: $+35$ | Slug: $+30$ | Skills: $+20$ | Taxonomy phrases: $+18$ | Word tokens: $+10$
- **Normalized Confidence Formula**:
  $$\text{Confidence} = \min(0.98, \max(0.50, 0.50 + \min(\text{score}, 60) \times 0.008))$$
- **Deterministic Fallback**: If score is 0, defaults gracefully to `Home Maintenance` with `confidence = 0.30` and transparent explanation.

---

## 12. Explainable AI: Multi-Factor Provider Matching

Ranks verified providers out of **100 composite points**:

1. **Geographical Service Match (35 pts)**: Provider serves customer city ($35$ pts) vs out of city ($10$ pts).
2. **Rating & Reputation (30 pts)**: Base star rating $((\text{rating}/5) \times 25)$ plus review count bonus.
3. **Fulfillment Track Record (20 pts)**: Completed jobs $(\min(15, \text{jobs} \times 1.5))$ plus experience years.
4. **Active Availability (15 pts)**: Active dispatch availability flag.

<div class="highlight">
<strong>Strict Advisory Rule:</strong> AI recommendations are strictly advisory. AI cannot accept bids, modify bookings, or bypass user authorization.
</div>

---

## 13. Security Engineering & Hardening

- **JWT Stateless Authentication**: 7-day expiration with HMAC-SHA256 signatures.
- **Bcrypt Password Security**: Salt rounds set to 12. `passwordHash` omitted from queries and JSON serialization.
- **Rate Limiting**: `express-rate-limit` prevents brute-force attacks on auth endpoints.
- **CORS Whitelisting**: Credentials-enabled origin restriction.
- **Immutable Audit Logging**: Every administrative action, provider verification, and user suspension is permanently logged with IP and user-agent metadata.

---

## 14. Comprehensive Testing & Verification

CareConnect achieves a **100% automated test pass rate**:

| Suite | Scope | Total Tests | Status |
|:---|:---|:---:|:---:|
| **Backend Integration (Jest)** | 15 suites (Auth, Bookings, AI, Analytics, RBAC) | **307 tests** | **307 / 307 Passed** |
| **Frontend UI (Vitest)** | 9 suites (Dashboards, State, AI components) | **66 tests** | **66 / 66 Passed** |
| **Static Analysis (ESLint)** | Full client & server repositories | Codebase | **0 Errors** |
| **Production Build (Vite)** | Client production asset compilation | Bundle | **0 Errors** |
| **Total Test Count** | **Full Stack End-to-End** | **373 tests** | **100% PASS** |

---

## 15. Production Deployment Architecture

- **Frontend Deployment**:
  - Hosted on **Vercel** (`https://careconnect-6iyi.vercel.app`)
  - Continuous deployment connected to `main` branch.
  - Sub-second asset delivery via Global Edge CDN.
- **Backend Deployment**:
  - Hosted on **Render** (`https://careconnect-m0p2.onrender.com`)
  - Containerized Node.js web service.
  - Live health check endpoint: `/api/v1/health`.
- **Database**:
  - **MongoDB Atlas** with automated backups and TLS transport security.

---

## 16. Technical Roadmap & Future Extensions

| Area | Future Production Enhancement |
|:---|:---|
| **Real-Time Communication** | Integrate **WebSockets (Socket.io)** for instant duplex messaging and typing indicators. |
| **Payment Gateway** | Integrate **Razorpay / Stripe Webhooks** for automated escrow holding and instant payouts. |
| **Search Engine** | Implement **MongoDB Atlas Search / ElasticSearch** for typo-tolerant fuzzy discovery. |
| **GPS Live Tracking** | Integrate **Google Maps Directions API** for real-time provider en-route vehicle tracking. |

---

## 17. Conclusion & Viva Defense

### Key Achievements
- **Complete MERN Stack Implementation**: Delivered all 12 project milestones ahead of schedule.
- **Zero Mocking of Business Logic**: 14 operational Mongoose models with complete relational workflows.
- **Explainable & Reliable AI**: High-accuracy category and provider matching without external API costs or latency.
- **Enterprise Testing Rigor**: 373 automated tests passing with zero errors.

### Thank You!
**Evaluator Q&A Session Welcomed.**
