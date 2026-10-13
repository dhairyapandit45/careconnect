# CareConnect — Comprehensive Testing Strategy & Verification Guide

This document specifies the testing methodology, test suites, execution commands, coverage metrics, and quality assurance standards implemented across the CareConnect MERN codebase.

---

## 1. Testing Architecture & Summary

CareConnect adopts an automated multi-tier testing strategy covering unit, integration, route authorization, aggregation pipeline, and end-to-end component rendering:

| Layer | Framework / Tools | Test Suites | Total Tests | Pass Rate |
|:---|:---|:---:|:---:|:---:|
| **Backend Integration & API** | Jest, Supertest, `mongodb-memory-server` | 15 suites | **307 tests** | **100% (307/307)** |
| **Frontend Components & State** | Vitest, React Testing Library, jsdom | 9 suites | **66 tests** | **100% (66/66)** |
| **Code Hygiene & Standards** | ESLint | Client & Server | Lint Passed | **0 Errors** |
| **Production Bundler** | Vite 5 | Client | Build Passed | **0 Errors** |
| **Grand Total** | — | **24 suites** | **373 tests** | **100% PASS** |

---

## 2. Test Execution Commands

### Run Full Test Suite
```bash
# Execute backend test suite (307 tests)
npm --prefix server test

# Execute frontend test suite (66 tests)
npm --prefix client test
```

### Run Static Analysis & Linter
```bash
# Server linter
npm --prefix server run lint

# Client linter
npm --prefix client run lint
```

### Run Production Build
```bash
# Vite frontend production compilation
npm --prefix client run build
```

---

## 3. Backend Test Suite Directory (`server/tests/`)

Backend tests execute in complete data isolation using an in-memory MongoDB server instance (`mongodb-memory-server`). Schemas, compound indexes, hooks, and RBAC middlewares are exercised against real database interactions without mocking database queries.

```
server/tests/
├── adminOperations.test.js   # 18 tests — RBAC, user moderation, audit logs, category ops
├── ai.test.js                # 18 tests — Request classification heuristics, provider ranking
├── analytics.test.js         # 18 tests — MongoDB aggregation pipelines, integer cents, dates
├── auth.test.js              # 21 tests — Registration, bcrypt hashing, JWT issuance, profile
├── bookings.test.js          # 23 tests — Booking creation, schedule conflict checks, cancels
├── categories.test.js        # 16 tests — Category CRUD, slug generation, active filters
├── disputes.test.js          # 20 tests — Dispute lifecycle, evidence, arbitration, refunds
├── invoices.test.js          # 18 tests — Invoice generation, fee splits, status transitions
├── jobs.test.js              # 22 tests — Job milestone progression, proof of work uploads
├── notifications.test.js     # 22 tests — In-app alerts, read receipts, unread counter queries
├── providers.test.js         # 24 tests — Provider onboarding, document verification, shifts
├── quotes.test.js            # 22 tests — Provider quotes, validation, bid acceptance
├── requests.test.js          # 24 tests — Customer service requests, location parsing, status
├── reviews.test.js           # 20 tests — Star ratings, job verification, rolling averages
├── supportTickets.test.js    # 21 tests — Threaded messages, staff assignment, ticket queues
└── testSetup.js              # In-memory MongoDB lifecycle harness & clean database teardown
```

---

## 4. Frontend Test Suite Directory (`client/src/tests/`)

Frontend tests simulate user interactions, verify RBAC route protection, test form validation, and confirm state updates using React Testing Library and Vitest.

```
client/src/tests/
├── AdminDashboard.test.jsx          # 7 tests — Admin tabs, metrics, user moderation actions
├── AiClassification.test.jsx        # 7 tests — Heuristic suggestion button, confidence badges
├── AiProviderMatching.test.jsx      # 8 tests — Match score pills, provider ranking card display
├── AnalyticsDashboard.test.jsx      # 8 tests — Metric cards, Recharts renders, date filters
├── AuthContext.test.jsx             # 7 tests — Token decoding, login/logout, session persistence
├── CustomerDashboard.test.jsx       # 7 tests — Request list, booking status, quick action links
├── OperationsDashboard.test.jsx     # 7 tests — Live dispatch overview, pending jobs, disputes
├── ProtectedRoute.test.jsx          # 8 tests — Role-based navigation guards, redirect logic
└── ProviderDashboard.test.jsx       # 7 tests — Job schedule, earnings overview, quote actions
```

---

## 5. Security & Edge Case Test Scenarios

The test suite explicitly asserts edge cases and attack vectors:
1. **Privilege Escalation**: Asserts that `CUSTOMER` or `SERVICE_PROVIDER` tokens attempting to call `/api/v1/admin/*` or `/api/v1/analytics/*` receive HTTP `403 Forbidden`.
2. **Resource Ownership Isolation**: Confirms that Customer A cannot view or cancel Customer B's bookings or invoices (`403 Forbidden` / `404 Not Found`).
3. **Double Booking Prevention**: Confirms that scheduling overlapping bookings for the same provider within identical time intervals triggers a conflict error.
4. **Token Tampering**: Confirms that corrupted JWT signatures or expired tokens are immediately rejected with HTTP `401 Unauthorized`.
5. **Division-by-Zero Resilience**: Confirms that analytics endpoints return valid `0.00%` rates when queried over date ranges with zero bookings or invoices.
6. **AI Heuristic Fallback**: Confirms that input containing zero domain keywords falls back gracefully to `Home Maintenance` with `isFallback: true` and `0.30` confidence.
