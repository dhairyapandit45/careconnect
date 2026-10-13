# CareConnect — System Architecture & Design Specification

## 1. Architectural Overview

**CareConnect** is an enterprise-grade home services marketplace and operations dispatch platform implemented on the **MERN** technology stack (MongoDB, Express.js, React 18, Node.js 24). The system enables end-to-end service lifecycles: customer request submission, quote bidding, provider verification, shift scheduling, real-time job execution, split invoicing, dispute arbitration, support ticketing, analytics intelligence, and assistive AI matching.

The architecture enforces strict decoupling between:
1. **Client Presentation Tier (`client/`)**: Single Page Application built with React 18, Vite 6, Tailwind CSS 3.4, and Lucide React.
2. **Application & Routing Tier (`server/`)**: Express.js REST API with layered separation of concerns (Routes $\rightarrow$ Middleware $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Models).
3. **Data Persistence Tier (`MongoDB + Mongoose 8`)**: 13 schema-validated collections with compound indexes, referential consistency, and aggregation pipelines.
4. **Assistive AI Tier (`server/src/services/ai.service.js`)**: Advisory intelligence service for category classification and multi-factor provider matching that assists user choices without bypassing database invariants.

```
                              CLIENT (React 18 + Vite 6 SPA)
                                            │
                                  [HTTPS / JSON REST API]
                                            │
                                            ▼
                                 EXPRESS SERVER (app.js)
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
            Security Headers                               Request Rate Limiting
            (Helmet, CORS, Morgan)                        (express-rate-limit)
                    │                                               │
                    └───────────────────────┬───────────────────────┘
                                            ▼
                                   API ROUTER (/api/v1)
                                            │
                         ┌──────────────────┴──────────────────┐
                         ▼                                     ▼
                Auth Middleware (JWT)               Validation Middleware (Zod)
                         │                                     │
                         └──────────────────┬──────────────────┘
                                            ▼
                                       CONTROLLERS
                            (Thin HTTP req/res translation)
                                            │
                                            ▼
                                      SERVICE LAYER
                         (Business logic, FSM transitions, ACID)
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      ▼                                           ▼
               MONGOOSE MODELS                             AI SERVICE LAYER
             (13 Domain Schemas)                         (Advisory Matching)
                      │                                           │
                      ▼                                           ▼
               MONGODB ATLAS / LOCAL                       DOMAIN TAXONOMY / LLM
```

---

## 2. Layered Backend Design Pattern

The server enforces a unidirectional dependency hierarchy:

```
Routes  ──>  Middleware  ──>  Controllers  ──>  Services  ──>  Models  ──>  MongoDB
```

### Layer Responsibilities
- **Routes (`src/routes/v1/`)**: Define HTTP verbs, route paths, and apply role authorizations (`authorize(...)`) and schema validation (`validate(...)`).
- **Middleware (`src/middleware/`)**: Global and route-level cross-cutting concerns:
  - `auth.middleware.js`: Verifies JWT bearer tokens, loads active user records, checks account statuses (`ACTIVE`, `SUSPENDED`, `INACTIVE`), and validates role permissions.
  - `validate.middleware.js`: Validates `req.body`, `req.query`, or `req.params` against Zod schemas.
  - `rateLimiter.middleware.js`: Prevents brute-force attacks via sliding window rate limiting.
  - `error.middleware.js`: Translates CastErrors, ValidationErrors, DuplicateKeys, and JWT errors into standardized JSON responses, stripping stack traces in production.
- **Controllers (`src/controllers/`)**: Extract request data, invoke corresponding service functions, and return standardized responses using `sendSuccess(...)`.
- **Services (`src/services/`)**: Encapsulate all business logic, transactional integrity, finite state machine (FSM) rules, MongoDB aggregations, and notifications.
- **Models (`src/models/`)**: Mongoose schema definitions with pre-save hooks, validation rules, indexes, and `.toJSON()` transforms that delete sensitive fields like `passwordHash`.

---

## 3. Finite State Machine (FSM) Engine

CareConnect models mission-critical domain entities as deterministic Finite State Machines governed by centralized transition tables in `server/src/constants/status.js`:

```
[ServiceRequest]  DRAFT ──> SUBMITTED ──> QUOTING ──> PROVIDER_SELECTED ──> BOOKED ──> COMPLETED / CANCELLED
[Quote]           SUBMITTED ──> VIEWED ──> ACCEPTED / REJECTED / WITHDRAWN / EXPIRED
[Booking]         PENDING ──> CONFIRMED ──> IN_PROGRESS ──> COMPLETED / CANCELLED / DISPUTED
[Job]             ASSIGNED ──> ON_THE_WAY ──> CHECKED_IN ──> IN_PROGRESS ──> COMPLETED / CANCELLED
[Invoice]         DRAFT ──> ISSUED ──> PAID ──> REFUNDED / VOID
[Dispute]         OPEN ──> UNDER_REVIEW ──> RESOLVED / REJECTED / CANCELLED
[SupportTicket]   OPEN ──> IN_PROGRESS ──> RESOLVED / CLOSED
```

Any invalid state transition triggers a 400 Bad Request via `isValidTransition(...)`, preventing unauthorized lifecycle jumps.

---

## 4. Frontend Architecture

The client application is organized into modular layers:
- **`components/ui/`**: Reusable design system (`Button`, `Card`, `Modal`, `Input`, `Badge`, `LoadingSpinner`, `EmptyState`, `ErrorState`).
- **`components/layout/`**: `Navbar`, `Sidebar`, `DashboardLayout`.
- **`context/`**: `AuthContext` providing JWT authentication state, login, register, and logout handlers with automatic localStorage hydration.
- **`services/`**: Modular API service abstractions (`auth.service.js`, `serviceRequest.service.js`, `booking.service.js`, `analytics.service.js`, `ai.service.js`) built on an Axios client with request/response interceptors.
- **`routes/AppRoutes.jsx`**: Client-side route declarations guarded by `ProtectedRoute`, redirecting unauthorized users to their designated role dashboard (`ROLE_DASHBOARD_ROUTES`).

---

## 5. Security & Defensive Engineering

1. **Password Security**: Bcrypt hashing with salt rounds = 12. Pre-save Mongoose hook ensures plain-text passwords never reach disk.
2. **Session Security**: Stateless JSON Web Tokens signed with HMAC-SHA256, strictly validated on each request.
3. **HTTP Hardening**: Helmet sets CSP, HSTS, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy headers.
4. **Data Isolation**: Multi-tenant authorization ensures customers only access their own requests, bookings, and invoices, while providers only access bids and assigned jobs.
5. **AI Safety Guarantee**: The AI classification and matching engine acts as an advisory layer. Recommendations cannot create bookings, mutate database state, or bypass verification rules.
