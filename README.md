# CareConnect — Home Services Booking & Operations Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21.x-blue.svg)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18.x-cyan.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.x-38bdf8.svg)](https://tailwindcss.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8.x-47A248.svg)](https://www.mongodb.com)
[![Tests Passing](https://img.shields.io/badge/Tests-373%2F373%20Passing-brightgreen.svg)](docs/TESTING.md)
[![Deployment Vercel](https://img.shields.io/badge/Frontend-Vercel%20Live-success.svg)](https://careconnect-6iyi.vercel.app)
[![Deployment Render](https://img.shields.io/badge/Backend-Render%20Live-success.svg)](https://careconnect-m0p2.onrender.com/api/v1/health)

---

## Overview

**CareConnect** is an enterprise-grade full-stack MERN marketplace and operations platform designed to streamline home services booking, provider credentialing, job fulfillment, automated invoicing, customer disputes, and executive analytics.

The platform connects homeowners with verified trade professionals (Plumbing, Electrical, Cleaning, Appliance Repair, Home Maintenance) through competitive quoting, verifiable job fulfillment milestones with photo evidence, integer-cent financial accuracy, and an explainable AI subsystem.

---

## Live Deployments & Health Checks

- **Live Frontend (Vercel)**: [https://careconnect-6iyi.vercel.app](https://careconnect-6iyi.vercel.app)
- **Live Backend API (Render)**: [https://careconnect-m0p2.onrender.com](https://careconnect-m0p2.onrender.com)
- **API Health Check**: [https://careconnect-m0p2.onrender.com/api/v1/health](https://careconnect-m0p2.onrender.com/api/v1/health)

---

## Core Capabilities & Features

### 1. Multi-Role Portals & RBAC
- Dedicated workflows for 5 roles: `CUSTOMER`, `SERVICE_PROVIDER`, `SUPPORT_AGENT`, `OPERATIONS_MANAGER`, and `PLATFORM_ADMIN`.
- Server-side access control with permission matrix enforcement on all Express routes.
- Client-side navigation guards with automatic role dashboard redirection.

### 2. Service Requests & Competitive Quoting
- Customers post requests with geolocations, preferred time slots, and problem descriptions.
- Verified service providers submit itemized quotes with estimated repair durations.
- Transparent quote review, acceptance, and automated booking creation.

### 3. Provider Onboarding & Scheduling
- Multi-document verification pipeline (Government ID, Address Proof, Trade Licenses).
- Provider calendar with weekly shift recurrence and blackout date overrides.
- Overlap prevention algorithm stopping double-bookings for the same provider.

### 4. Operational Job State Machine
- Strict job milestone progression: `ASSIGNED` $\to$ `EN_ROUTE` $\to$ `IN_PROGRESS` $\to$ `COMPLETED`.
- Digital proof-of-work requirement (completion photos and notes) prior to completion.

### 5. Financial Billing Engine
- Subtotal, platform commission split (10%), and tax calculations.
- **Integer-Cent Precision Guarantee**: All invoice balances are stored and computed in integer cents to eliminate IEEE 754 floating-point drift.

### 6. Customer Disputes & Support Ticketing
- Integrated arbitration workflow with evidence inspection and refund adjudication.
- Threaded support tickets with priority queues and staff-only internal notes.

### 7. Real-Time Platform Analytics
- Native high-performance MongoDB aggregation pipelines (no external data warehouse needed).
- Real-time KPI summaries, daily booking timelines, revenue collection rates, category demand breakdowns, and provider leaderboards.
- Bounded with division-by-zero protection.

### 8. Explainable AI (XAI)
- **Intelligent Request Classification**: Heuristic analysis utilizing a 100+ domain term taxonomy. Computes normalized confidence scores with transparent keyword rationales and deterministic fallback.
- **Multi-Factor Provider Matching**: 100-point composite scoring model evaluating location, ratings, track record, and availability. Strictly advisory; never bypasses quotes or customer review.

---

## Technical Stack

| Layer | Technologies |
|:---|:---|
| **Frontend** | React 18, Vite 5, React Router 6, Tailwind CSS 3.4, Recharts, Lucide React, Axios |
| **Backend** | Node.js 20+, Express.js 4.21, Mongoose 8.x, JWT, BcryptJS, Express-Rate-Limit, Cors |
| **Database** | MongoDB Atlas (Cloud) / In-Memory MongoDB (Testing) |
| **Testing** | Jest 29, Supertest 7, `mongodb-memory-server`, Vitest, React Testing Library |
| **Deployment** | Vercel (Edge SPA), Render (Containerized Web Service), MongoDB Atlas (TLS Cluster) |

---

## Project Structure

```
careconnect/
├── client/                     # Vite + React Frontend Application
│   ├── public/                 # Static branding assets
│   └── src/
│       ├── components/         # Common, form, layout, and UI components
│       ├── context/            # AuthContext provider
│       ├── pages/              # Customer, Provider, Support, Ops, Admin pages
│       ├── routes/             # AppRoutes and ProtectedRoute guards
│       ├── services/           # Axios API client and domain endpoints
│       └── tests/              # 66 Vitest UI integration tests
│
├── server/                     # Node.js + Express REST API
│   ├── src/
│   │   ├── config/             # Environment parsing and DB connection
│   │   ├── constants/          # Roles, status codes, and permissions
│   │   ├── controllers/        # Express request handlers across 17 domains
│   │   ├── middleware/         # Auth, RBAC, error handling, rate limiting
│   │   ├── models/             # 14 Mongoose schemas and indexes
│   │   ├── routes/             # Versioned /api/v1 router endpoints
│   │   ├── services/           # Business logic, state machines, analytics, AI
│   │   └── validators/         # Input sanitization and validators
│   └── tests/                  # 307 Jest + Supertest integration tests
│
├── docs/                       # Comprehensive System Documentation
│   ├── ARCHITECTURE.md         # Full architectural design & data flow
│   ├── API_REFERENCE.md        # Complete v1 REST API endpoint reference
│   ├── DATABASE_MODELS.md      # Detailed reference for all 14 Mongoose models
│   ├── AUTHENTICATION_AND_RBAC.md # Auth lifecycle & 5-role permission matrix
│   ├── ANALYTICS.md            # MongoDB aggregation pipelines & financial math
│   ├── AI_FEATURES.md          # Heuristic classification & provider matching
│   ├── TESTING.md              # Automated testing methodology & metrics
│   └── DEMO_AND_VIVA_GUIDE.md  # 5-10 min demo script & 25+ viva questions
│
├── presentation/               # Capstone Presentation Materials
│   ├── CareConnect_Capstone_Presentation.md   # Marp markdown presentation deck
│   └── CareConnect_Capstone_Presentation.html # Standalone interactive HTML presentation
│
├── package.json                # Monorepo root scripts
└── README.md
```

---

## Getting Started Locally

### Prerequisites
- Node.js >= 18.x (Recommended: Node 20 LTS)
- npm >= 9.x
- Git

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/dhairya-test/careconnect.git
cd careconnect

# Install client and server dependencies
npm --prefix server install
npm --prefix client install
```

### 2. Configure Environment Variables

**Server (`server/.env`)**:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/careconnect
JWT_SECRET=careconnect_super_secret_jwt_key_2026_test
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=500
```

**Client (`client/.env`)**:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### 3. Run Development Servers
```bash
# Terminal 1: Run Backend API
npm --prefix server run dev

# Terminal 2: Run Frontend UI
npm --prefix client run dev
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000/api/v1`
- Health: `http://localhost:5000/api/v1/health`

---

## Automated Testing & Quality Assurance

CareConnect maintains **373 automated tests** with a **100% pass rate**:

```bash
# Run backend test suite (307 tests across 15 suites)
npm --prefix server test

# Run frontend test suite (66 tests across 9 files)
npm --prefix client test

# Run code linters
npm --prefix server run lint
npm --prefix client run lint

# Compile production frontend build
npm --prefix client run build
```

| Suite | Tests | Result |
|:---|:---:|:---:|
| Backend (Jest + Supertest + In-Memory Mongo) | 307 | **307 Passed** |
| Frontend (Vitest + React Testing Library) | 66 | **66 Passed** |
| Client & Server Linters | Codebase | **0 Errors** |
| Production Build Compilation | Bundle | **0 Errors** |

---

## Capstone Documentation Directory

Detailed technical documentation and presentation artifacts:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Architectural pattern, micro-layers, state machines, and sequence diagrams.
- [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) — Complete REST specification covering all 17 route files.
- [`docs/DATABASE_MODELS.md`](docs/DATABASE_MODELS.md) — Schema definitions, indexes, hooks, and relationships for all 14 models.
- [`docs/AUTHENTICATION_AND_RBAC.md`](docs/AUTHENTICATION_AND_RBAC.md) — JWT lifecycle, password hashing, and role permission matrix.
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md) — Aggregation pipelines, revenue formulas, and integer-cent precision.
- [`docs/AI_FEATURES.md`](docs/AI_FEATURES.md) — Heuristic classification rules, scoring formulas, and deterministic fallback.
- [`docs/TESTING.md`](docs/TESTING.md) — Test directory layout, test scenarios, and security assertions.
- [`docs/DEMO_AND_VIVA_GUIDE.md`](docs/DEMO_AND_VIVA_GUIDE.md) — 5–10 min demo script, role checklists, and 25+ viva voce Q&As.
- [`presentation/CareConnect_Capstone_Presentation.md`](presentation/CareConnect_Capstone_Presentation.md) — 17-slide Marp markdown deck.
- [`presentation/CareConnect_Capstone_Presentation.html`](presentation/CareConnect_Capstone_Presentation.html) — Interactive standalone presentation deck with keyboard controls.

---

## License

This project is developed as an academic capstone software engineering project under the MIT License.
