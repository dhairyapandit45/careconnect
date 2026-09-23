# CareConnect System Architecture

## 1. Architectural Overview

CareConnect is architected as a modular, production-ready MERN (MongoDB, Express, React, Node.js) platform designed for home services booking and end-to-end operational dispatch.

The architecture strictly decouples:
- **Presentation Layer (`client/`)**: Modern React single-page application bundled with Vite and styled with Tailwind CSS.
- **API & Domain Layer (`server/`)**: Express.js REST application operating on a strict layered pattern.
- **Data Persistence Layer (`MongoDB + Mongoose`)**: Fully schema-defined collections with built-in validation, referential integrity, and indexing.
- **Assistive Intelligence Layer (`server/src/services/ai/`)**: Fully isolated service contracts for classification and provider matching that assist rather than override core operational invariants.

```
                              CLIENT (React + Vite SPA)
                                         │
                                [HTTPS / JSON REST]
                                         │
                                         ▼
                              EXPRESS SERVER (app.js)
                                         │
                  ┌──────────────────────┴──────────────────────┐
                  ▼                                             ▼
          Security Middleware                         Rate Limiting Middleware
        (Helmet, CORS, JSON, Logs)                   (express-rate-limit)
                  │                                             │
                  └──────────────────────┬──────────────────────┘
                                         ▼
                               API ROUTER (/api/v1)
                                         │
                       ┌─────────────────┴─────────────────┐
                       ▼                                   ▼
             Auth Middleware (/auth/me)          Validate Middleware (Zod)
                       │                                   │
                       └─────────────────┬─────────────────┘
                                         ▼
                                    CONTROLLERS
                          (Thin HTTP req/res mappers)
                                         │
                                         ▼
                                  SERVICE LAYER
                      (Core business logic, orchestration)
                                         │
                     ┌───────────────────┴───────────────────┐
                     ▼                                       ▼
             Mongoose Models                         AI Assistive Services
            (User, Booking, etc.)                  (Classification, Matching)
                     │                                       │
                     ▼                                       ▼
               MongoDB Database                       LLM Provider / Cache
```

---

## 2. Layered Backend Design

To maintain long-term maintainability, the backend enforces a one-way dependency flow:

```
Routes  ──>  Middleware  ──>  Controllers  ──>  Services  ──>  Models  ──>  MongoDB
```

### Layer Responsibilities
- **Routes (`server/src/routes/`)**: Mount URI endpoints and bind path-specific middleware pipelines (validation, rate-limiting, authentication).
- **Middleware (`server/src/middleware/`)**: Cross-cutting concerns including JWT verification, RBAC enforcement (`authorize`), schema validation (`validate`), and error interception (`errorHandler`).
- **Controllers (`server/src/controllers/`)**: Parse HTTP headers/query/params/body, delegate execution to the domain service, and invoke `sendSuccess()` or forward exceptions to `next(err)`. Controllers contain **no database queries** or **complex business logic**.
- **Services (`server/src/services/`)**: The core domain engine. Executes operations, creates transactional boundaries, hashes credentials, calculates quotes/fees, and manages state transitions.
- **Models (`server/src/models/`)**: Mongoose schemas enforcing constraints, types, lifecycle hooks (e.g. bcrypt pre-save), custom query helpers, and JSON serialization masks (`passwordHash` removal).

---

## 3. Role-Based Access Control (RBAC)

The platform supports 5 distinct user roles governed by hierarchical permissions:

| Role | Domain Scope | Primary Capabilities |
| :--- | :--- | :--- |
| **`CUSTOMER`** | Marketplace Buyer | Post service requests, receive and compare provider quotes, confirm bookings, make payments, track job progress, submit reviews, and file disputes. |
| **`SERVICE_PROVIDER`** | Marketplace Seller / Field Operator | Maintain business profile, verify trade credentials, set hourly rates and coverage zones, review local leads, submit bids/quotes, execute scheduled jobs, and invoice customers. |
| **`SUPPORT_AGENT`** | Operations Resolution | Review customer/provider disputes, adjudicate cancellations, authorize dispute refunds, and mediate communications. |
| **`OPERATIONS_MANAGER`** | Marketplace Fulfillment | Oversee booking completion rates, dispatch emergency / unassigned requests, monitor provider quality, and optimize coverage liquidity. |
| **`PLATFORM_ADMIN`** | System Governance | Verify provider trade credentials, configure service categories and pricing baselines, manage user accounts, inspect immutable audit logs, and oversee platform settings. |

### Enforcing Authorization
RBAC is enforced via composite middleware:
```javascript
router.get('/admin/audit-logs', authenticate, authorize('PLATFORM_ADMIN'), getAuditLogs);
router.post('/jobs/:id/evidence', authenticate, authorize('SERVICE_PROVIDER'), uploadEvidence);
```

---

## 4. Artificial Intelligence Subsystem Boundaries

The AI integration is isolated under `server/src/services/ai/`. 

### Boundary Principles
1. **Advisory Only**: AI suggestions never directly trigger billing, provider disbursement, or state mutation.
2. **Determinism Before Intelligence**: Business constraints (provider active status, verified credentials, service area polygon/radius, and calendar availability) are strictly resolved in MongoDB *before* any candidate list is sent to an AI ranking service.
3. **Graceful Fallback**: If an LLM endpoint is unreachable, timed out, or unconfigured, the system automatically falls back to deterministic rule-based ranking (e.g., rating $\times$ experience weighting).

```
Customer Request
      │
      ▼
AI Classification ──> [Extracts urgency, keywords, suggested trade]
      │
      ▼
DB Query Engine  ──> [Filters VERIFIED providers with open schedule slot & location match]
      │
      ▼
AI Provider Ranker ──> [Scores top matches based on historical reviews and skills fit]
      │
      ▼
Recommended Provider List
```

---

## 5. Security & Defensive Engineering

- **No Plaintext Secrets**: Passwords hashed with `bcryptjs` using a salt work factor of 12.
- **Token Protection**: JWTs signed with minimum 32-character secrets loaded strictly via validated `env.js`.
- **Response Scrubbing**: Mongoose `.toJSON()` masks sensitive properties (`passwordHash`, `__v`) from ever being serialized over the wire.
- **HTTP Hardening**: Helmet sets Content Security Policy (CSP), X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security (HSTS).
- **Rate Limiting**: Tiered rate limiters protect public API routes (100 req / 15 min) and authentication endpoints (20 attempts / 15 min).
- **Environment Validation**: Zod schema in `env.js` validates environment variables on application bootstrap, preventing runtime crashes due to missing configuration.

---

## 6. Provider Onboarding & Verification State Machine

Service provider marketplace trust and safety is enforced through a strict finite state machine governed solely by `PLATFORM_ADMIN` users:

```
                  ┌───────────────┐
                  │    PENDING    │
                  └──┬───┬────────┘
                     │   │
     Under Review    │   │ Approved
         ┌───────────┘   └───────────┐
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  UNDER_REVIEW   │◄───────►│    APPROVED     │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ Rejected                  │ Suspended
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│    REJECTED     │         │    SUSPENDED    │
└─────────────────┘         └─────────────────┘
```

### Transition Invariants
1. **No Self-Approval**: Provider self-onboarding strictly initializes `verificationStatus` to `PENDING`. Providers cannot modify their own verification status, rating, or review count.
2. **Valid State Transitions**:
   - `PENDING` $\rightarrow$ `UNDER_REVIEW`, `APPROVED`, `REJECTED`
   - `UNDER_REVIEW` $\rightarrow$ `APPROVED`, `REJECTED`, `PENDING`
   - `APPROVED` $\rightarrow$ `SUSPENDED`, `UNDER_REVIEW`
   - `REJECTED` $\rightarrow$ `UNDER_REVIEW`, `PENDING`
   - `SUSPENDED` $\rightarrow$ `APPROVED`, `UNDER_REVIEW`
3. **Audited Actions**: Status modifications record the administrative transition action and mandatory rationale in `verificationNotes`.
4. **Data Isolation & Sanitization**: Public provider profile endpoints (`GET /api/v1/providers/:id`) strip sensitive document metadata, verification notes, and private owner contacts when queried by guests or customer accounts.

