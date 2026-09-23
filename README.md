# CareConnect – Home Services Booking & Operations Platform

[![Node.js](https://img.shields.io/badge/Node.js-v24.x-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21.x-blue.svg)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18.x-cyan.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.x-38bdf8.svg)](https://tailwindcss.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8.x-47A248.svg)](https://www.mongodb.com)

---

## Overview

**CareConnect** is an enterprise-grade marketplace and operations management platform designed to streamline home services booking, provider dispatch, job fulfillment, and dispute resolution.

The platform connects homeowners and property managers with verified trade specialists (plumbing, electrical, appliance repair, HVAC, cleaning, and maintenance), providing automated quote comparison, live scheduling, milestone tracking, invoicing, and escrow resolution.

---

## Features

### Foundational Capabilities
- **Multi-Role Authentication**: JWT-based authentication with bcrypt hashing (work factor 12) and secure session management.
- **Strict Layered Architecture**: Routes $\rightarrow$ Middleware $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Models.
- **Role-Based Access Control (RBAC)**: Comprehensive permission enforcement across 5 distinct system roles.
- **Centralized Error Handling**: Standardized API error payloads with operational error mapping and stack trace masking in production.
- **Defensive API Hardening**: Built-in Helmet security headers, CORS origin verification, and tiered request rate limiters.
- **Modular Frontend UI**: Clean dashboard design system with reusable components (`Button`, `Input`, `Select`, `Modal`, `Card`, `Badge`, `Table`, `LoadingSpinner`, `EmptyState`, `ErrorState`).
- **Unified API Client**: Centralized Axios instance with automatic JWT injection, 401 automatic recovery, and error formatting.
- **Isolated AI Layer**: Assistive AI architecture for classification and provider ranking quarantined from business invariants.

---

## Technology Stack

### Frontend (`client/`)
- **Library/Framework**: React 18
- **Build Tool**: Vite 6
- **Routing**: React Router 6
- **Styling**: Tailwind CSS 3.4
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Testing**: Vitest + React Testing Library + JSDOM

### Backend (`server/`)
- **Runtime**: Node.js 24
- **Framework**: Express.js 4.21
- **Database**: MongoDB with Mongoose 8
- **Validation**: Zod
- **Security**: Helmet, CORS, Express-Rate-Limit, BCryptJS, JSONWebToken
- **Logging**: Leveled structured logger abstraction + Morgan
- **Testing**: Jest 29 + Supertest 7 + MongoDB Memory Server

---

## Architecture

CareConnect enforces a decoupled client-server architecture with an isolated AI service subsystem:

```
[React + Vite Single Page Application]
                 │
           (Axios Client)
                 │
                 ▼
       [Express.js REST API]
                 │
       [Layered Architecture]
  Routes -> Middleware -> Controllers -> Services -> Models
                 │                               │
                 ▼                               ▼
        [MongoDB Database]           [AI Services (Advisory)]
```

For full architectural diagrams and flow details, see [`docs/architecture/system-architecture.md`](docs/architecture/system-architecture.md).

---

## Project Structure

```
careconnect/
├── client/                     # Vite + React Frontend
│   ├── public/                 # Static assets
│   └── src/
│       ├── assets/             # Branding and icons
│       ├── components/
│       │   ├── common/         # ProtectedRoute, ResourcePlaceholder
│       │   ├── forms/          # Form components
│       │   ├── layout/         # Navbar, Sidebar, DashboardLayout
│       │   └── ui/             # Reusable design system components
│       ├── pages/
│       │   ├── auth/           # LoginPage, RegisterPage
│       │   ├── customer/       # Customer dashboard & subpages
│       │   ├── provider/       # Provider dashboard & subpages
│       │   ├── support/        # Support agent dashboard
│       │   ├── operations/     # Operations manager dashboard
│       │   ├── admin/          # Platform admin dashboard
│       │   └── NotFoundPage.jsx
│       ├── routes/             # AppRoutes routing table
│       ├── context/            # AuthContext provider
│       ├── services/           # apiClient, auth.service, health.service
│       ├── constants/          # Role and navigation constants
│       ├── tests/              # Frontend component tests
│       ├── App.jsx             # Root application component
│       └── main.jsx            # Entry point
│
├── server/                     # Node.js + Express REST API
│   ├── src/
│   │   ├── config/             # env.js, db.js
│   │   ├── constants/          # roles.js, status.js, errorCodes.js
│   │   ├── controllers/        # health.controller.js, auth.controller.js
│   │   ├── middleware/         # auth, error, rateLimiter, validate
│   │   ├── models/             # Mongoose schemas for all 13 domain entities
│   │   ├── routes/             # v1 versioned API routes
│   │   ├── services/           # auth.service.js, ai/ (classification, matching)
│   │   ├── validators/         # auth.validator.js (Zod)
│   │   ├── utils/              # apiResponse, apiError, logger
│   │   ├── jobs/               # Background task scheduler stubs
│   │   ├── app.js              # Express app pipeline
│   │   └── server.js           # Server bootstrap and lifecycle
│   └── tests/                  # Integration tests (Supertest + Jest)
│
├── docs/                       # Project Documentation
│   ├── architecture/           # System architecture guide
│   ├── api/                    # API specification and endpoints
│   └── database/               # Entity relationship and database dictionary
│
├── .gitignore
├── .env.example
├── package.json                # Root orchestration package
└── README.md
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) >= 18.x (Recommended: v20 or v24)
- [npm](https://www.npmjs.com) >= 9.x
- [MongoDB](https://www.mongodb.com) (Local community server or MongoDB Atlas URI)
- [Git](https://git-scm.com)

---

## Environment Variables

Copy the example environment configurations:

```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env
```

### Server Configuration (`server/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | API listener port | `5000` |
| `NODE_ENV` | Runtime environment (`development`, `test`, `production`) | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/careconnect` |
| `JWT_SECRET` | Secret key for signing JWTs ($\ge 16$ chars) | *(Required in production)* |
| `JWT_EXPIRES_IN` | Token validity duration | `7d` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting sliding window (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `OPENAI_API_KEY` | Optional LLM key for AI classification/matching | `""` |

### Client Configuration (`client/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URI of backend REST API | `http://localhost:5000/api/v1` |

---

## Running Locally

### 1. Install All Dependencies
From the project root:
```bash
npm run install:all
```
*(Or install inside `client/` and `server/` individually with `npm install`).*

### 2. Start Both Server and Client Concurrently
```bash
npm run dev
```
- Frontend will be available at: [http://localhost:5173](http://localhost:5173)
- Backend API will be available at: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- Health check endpoint: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

### 3. Running Services Independently
To run only the backend:
```bash
npm run dev:server
```

To run only the frontend:
```bash
npm run dev:client
```

---

## API

CareConnect features versioned REST APIs under `/api/v1`.

### Health Check Endpoint
```http
GET /api/v1/health
```
**Response**:
```json
{
  "success": true,
  "message": "CareConnect API is running",
  "data": {
    "uptime": 12.45,
    "timestamp": "2026-09-23T16:00:00.000Z",
    "environment": "development"
  }
}
```

For complete documentation of endpoints, status codes, and headers, see [`docs/api/api-overview.md`](docs/api/api-overview.md).

---

## Database

The database layer contains 13 models prepared for the complete marketplace lifecycle:
1. `User` – Authenticated principals across all roles
2. `ProviderProfile` – Certifications, skills, hourly rates, and verification status
3. `ServiceCategory` – Configurable service catalogs and price estimates
4. `ServiceRequest` – Customer requests with geolocation and AI tags
5. `Quote` – Provider bids and price estimates
6. `Booking` – Confirmed appointments and agreements
7. `Availability` – Provider weekly schedules and blackout dates
8. `Job` – Live field fulfillment, check-ins, and evidence photos
9. `Invoice` – Split billing, platform commission, and payment records
10. `Review` – Customer ratings and reviews
11. `Dispute` – Conflict tickets and refund handling
12. `Notification` – Notification stream
13. `AuditLog` – Immutable compliance audit log

For the full entity-relationship schema and indices, see [`docs/database/database-design.md`](docs/database/database-design.md).

---

## Authentication

- **Registration**: `POST /api/v1/auth/register`
- **Login**: `POST /api/v1/auth/login`
- **Session Profile**: `GET /api/v1/auth/me` (Requires `Authorization: Bearer <token>`)
- **Logout**: `POST /api/v1/auth/logout`

Passwords are automatically hashed via bcrypt in Mongoose pre-save hooks and omitted from JSON output.

---

## User Roles

The platform enforces Role-Based Access Control (RBAC) across 5 roles:
- `CUSTOMER` – Creates service requests, reviews quotes, books providers, tracks jobs.
- `SERVICE_PROVIDER` – Manages profile, availability, quotes, and active job evidence.
- `SUPPORT_AGENT` – Resolves disputes, handles cancellations, and initiates refunds.
- `OPERATIONS_MANAGER` – Oversees marketplace health, provider dispatch, and unassigned requests.
- `PLATFORM_ADMIN` – Verifies provider licenses, manages service categories, and reviews audit logs.

---

## Future AI Features

The AI architecture is cleanly partitioned under `server/src/services/ai/`:
- **`classification.service.js`**: Analyzes natural language descriptions to predict category, extract urgency, and flag required trade skills.
- **`matching.service.js`**: Ranks pre-screened providers based on customer location, availability, verified ratings, and skill match.
- **Non-Bypass Guarantee**: AI rankings operate exclusively on providers that have already passed hard database constraints (verified status, active account, and schedule availability).

---

## Testing

Automated testing is configured using **Supertest**, **Jest**, and **Vitest**.

### Run All Tests
```bash
npm test
```

### Run Backend Tests Only
```bash
npm run test:server
```
*(Runs against an in-memory MongoDB instance using `mongodb-memory-server` without requiring external database setup).*

### Run Frontend Tests Only
```bash
npm run test:client
```
*(Runs UI unit tests using Vitest and React Testing Library).*

---

## Development Guidelines

1. **Keep Controllers Thin**: Controllers must only parse requests and format responses. Business logic belongs in `services/`.
2. **Never Commit Secrets**: Always use `.env` and never commit credentials or API keys.
3. **Validate All Inputs**: Validate client requests using Zod schemas before reaching controllers.
4. **Standardize Responses**: Always return responses using `sendSuccess` or `sendError` helpers.
5. **Protect Core Rules from AI**: AI must assist workflows; it must never mutate state or bypass business validation.
