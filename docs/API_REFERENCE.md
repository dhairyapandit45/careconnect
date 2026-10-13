# CareConnect — Complete API Reference (v1)

Base URL: `http://localhost:5000/api/v1` (or production: `https://careconnect-m0p2.onrender.com/api/v1`)

All authenticated requests require the header:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

## 1. Authentication & Identity (`/auth`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new user account (`CUSTOMER` or `SERVICE_PROVIDER`) |
| `POST` | `/auth/login` | Public | Authenticate with email/password and obtain JWT token |
| `GET` | `/auth/me` | Authenticated | Retrieve profile details of currently authenticated user |
| `POST` | `/auth/logout` | Authenticated | Invalidate client-side session |

---

## 2. Service Categories (`/categories`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/categories` | Public | List active service categories (query `includeInactive=true` for Admin) |
| `GET` | `/categories/:id` | Public | Get category details by ID |
| `POST` | `/categories` | `PLATFORM_ADMIN` | Create new service category |
| `PUT` | `/categories/:id` | `PLATFORM_ADMIN` | Update category details, icon, or active status |
| `DELETE`| `/categories/:id` | `PLATFORM_ADMIN` | Delete category (rejected if referenced by existing requests) |

---

## 3. Customer Service Requests (`/service-requests`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/service-requests` | `CUSTOMER` | Submit new home service request |
| `GET` | `/service-requests` | Authenticated | List service requests (filtered by customer ownership or admin role) |
| `GET` | `/service-requests/:id` | Authenticated | Get detailed view of specific service request |
| `POST` | `/service-requests/:id/quotes` | `SERVICE_PROVIDER` | Submit quote proposal for a service request |
| `GET` | `/service-requests/:id/quotes` | `CUSTOMER`, Admin | View and compare all received quotes for request |
| `POST` | `/service-requests/:id/quotes/:quoteId/accept` | `CUSTOMER` | Accept quote proposal and trigger schedule booking modal |

---

## 4. Provider Discovery & Requests (`/provider-requests`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/provider-requests/available` | `SERVICE_PROVIDER` | List available requests matching provider's verified categories & city |

---

## 5. Quotes Management (`/quotes`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/quotes` | `SERVICE_PROVIDER` | List all quotes submitted by the authenticated provider |
| `GET` | `/quotes/:id` | Authenticated | View details of specific quote proposal |
| `PATCH`| `/quotes/:id/withdraw` | `SERVICE_PROVIDER` | Withdraw a pending submitted quote |

---

## 6. Provider Profiles & Verification (`/providers`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/providers/me` | `SERVICE_PROVIDER` | Get current provider's professional profile & verification status |
| `PUT` | `/providers/me` | `SERVICE_PROVIDER` | Update business name, trade categories, service areas, and pricing |
| `POST` | `/providers/me/documents` | `SERVICE_PROVIDER` | Upload verification credentials (license, ID, certification) |
| `GET` | `/providers` | Public / Admin | Browse verified active service providers |
| `GET` | `/providers/:id` | Public / Admin | View public provider profile and customer reviews |

---

## 7. Availability & Schedules (`/availability`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/availability/me` | `SERVICE_PROVIDER` | Get provider's recurring weekly shift schedules |
| `PUT` | `/availability/me` | `SERVICE_PROVIDER` | Configure weekly working hours and blackout dates |
| `GET` | `/availability/:providerId` | Authenticated | View provider's available booking time slots |

---

## 8. Bookings & Appointments (`/bookings`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/bookings` | `CUSTOMER` | Create confirmed booking from accepted quote with schedule selection |
| `GET` | `/bookings` | Authenticated | List bookings (customer views own; provider views assigned) |
| `GET` | `/bookings/:id` | Authenticated | View detailed appointment schedule, address, and status |
| `PATCH`| `/bookings/:id/cancel` | Authenticated | Cancel booking with mandatory cancellation reason |
| `PATCH`| `/bookings/:id/status` | Admin / Provider | Update booking operational status |

---

## 9. Job Operations & Execution (`/jobs`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/jobs` | Authenticated | List jobs (provider views assigned; customer views own jobs) |
| `GET` | `/jobs/:id` | Authenticated | View live job status, milestones, and evidence |
| `PATCH`| `/jobs/:id/status` | `SERVICE_PROVIDER`, Ops | Progress job: `ASSIGNED` $\rightarrow$ `ON_THE_WAY` $\rightarrow$ `CHECKED_IN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` |
| `POST` | `/jobs/:id/evidence` | `SERVICE_PROVIDER` | Upload photographic job proof or completion evidence |

---

## 10. Invoicing & Billing (`/invoices`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/invoices` | Authenticated | List invoices (customer views payable; provider views earned) |
| `GET` | `/invoices/:id` | Authenticated | View line-item invoice details, tax, and platform fees |
| `POST` | `/invoices/:id/pay` | `CUSTOMER` | Process simulated escrow payment (`ISSUED` $\rightarrow$ `PAID`) |

---

## 11. Customer Reviews (`/reviews`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/reviews` | `CUSTOMER` | Submit 1–5 star rating and review after job completion |
| `GET` | `/reviews/provider/:providerId` | Public | List published reviews for a specific service provider |

---

## 12. Disputes & Conflict Resolution (`/disputes`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/disputes` | `CUSTOMER` | File dispute against a completed booking with reason and evidence |
| `GET` | `/disputes` | Authenticated | List disputes (filtered by customer, provider, or arbitration roles) |
| `GET` | `/disputes/:id` | Authenticated | View dispute status, claim details, and review history |
| `PATCH`| `/disputes/:id/resolve` | `SUPPORT_AGENT`, Admin | Resolve dispute (approve refund, reject claim, or dismiss) |

---

## 13. Support Ticketing (`/support-tickets` & `/tickets`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/support-tickets` | Authenticated | Open a new customer support ticket |
| `GET` | `/support-tickets` | Authenticated | List support tickets (own tickets or triage queue) |
| `GET` | `/support-tickets/:id` | Authenticated | View ticket thread and conversation history |
| `POST` | `/support-tickets/:id/messages`| Authenticated | Send message / reply in support ticket thread |
| `PATCH`| `/support-tickets/:id/status` | `SUPPORT_AGENT`, Admin | Update ticket lifecycle status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`) |

---

## 14. In-App Notifications (`/notifications`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/notifications` | Authenticated | List notifications for authenticated user with unread count |
| `PATCH`| `/notifications/:id/read` | Authenticated | Mark a single notification as read |
| `PATCH`| `/notifications/read-all` | Authenticated | Mark all notifications as read |

---

## 15. Admin & Operations Control Center (`/admin` & `/operations`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/admin/stats` | `PLATFORM_ADMIN` | Executive KPI control center metrics |
| `GET` | `/operations/stats`| `OPERATIONS_MANAGER`, Admin| Operational dispatch and marketplace metrics |
| `GET` | `/admin/users` | `PLATFORM_ADMIN`, Ops | List user directory with status filtering and search |
| `PATCH`| `/admin/users/:id/status` | `PLATFORM_ADMIN` | Update user account status (`ACTIVE`, `SUSPENDED`, `INACTIVE`) |
| `GET` | `/admin/providers/pending` | `PLATFORM_ADMIN`, Ops | List providers awaiting credential verification |
| `PATCH`| `/admin/providers/:id/verify`| `PLATFORM_ADMIN` | Approve or reject provider verification application |

---

## 16. Platform Analytics (`/admin/analytics` & `/operations/analytics`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/admin/analytics/overview` | `PLATFORM_ADMIN`, Ops | High-level summary KPIs (bookings, revenue, SLAs) |
| `GET` | `/admin/analytics/bookings` | `PLATFORM_ADMIN`, Ops | Daily booking counts, completion rates, cancellation rates |
| `GET` | `/admin/analytics/revenue` | `PLATFORM_ADMIN`, Ops | Daily paid revenue vs total invoiced timeline |
| `GET` | `/admin/analytics/providers`| `PLATFORM_ADMIN`, Ops | Provider performance leaderboard and completed jobs |
| `GET` | `/admin/analytics/categories`| `PLATFORM_ADMIN`, Ops | Service category demand distribution and revenue share |
| `GET` | `/admin/analytics/disputes` | `PLATFORM_ADMIN`, Ops | Dispute resolution rates, volume by status and category |
| `GET` | `/admin/analytics/support` | `PLATFORM_ADMIN`, Ops | Ticket resolution rates, priority breakdown, SLA metrics |

*All analytics endpoints support optional query parameters: `startDate` (`YYYY-MM-DD`), `endDate` (`YYYY-MM-DD`), and `limit`.*

---

## 17. Assistive AI Intelligence (`/ai`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/ai/classify` | Authenticated | Predicts service category from text/title/description with confidence score and explainability |
| `POST` | `/ai/match-providers` | `CUSTOMER`, `PLATFORM_ADMIN`, Ops | Ranks verified active providers using multi-factor composite scoring with transparent reasoning |

### AI Endpoint Payloads

#### `POST /ai/classify` Request
```json
{
  "title": "Kitchen sink pipe burst",
  "description": "Water is leaking continuously from the p-trap under the cabinet."
}
```

#### `POST /ai/classify` Response
```json
{
  "success": true,
  "message": "Service category classified successfully",
  "data": {
    "categoryId": "651f8a...",
    "categoryName": "Plumbing",
    "categorySlug": "plumbing",
    "confidence": 0.94,
    "confidenceLevel": "HIGH",
    "explanation": "CareConnect AI identified key domain indicators ['pipe', 'leak', 'sink'] strongly aligning with Plumbing.",
    "matchedKeywords": ["pipe", "leak", "sink"],
    "suggestedSkills": ["Master Plumber", "Pipe Soldering", "Drain Snaking"],
    "isFallback": false,
    "alternatives": []
  }
}
```

#### `POST /ai/match-providers` Request
```json
{
  "categoryId": "651f8a...",
  "city": "Bangalore",
  "preferredDate": "2026-03-20",
  "urgency": "STANDARD",
  "limit": 5
}
```

#### `POST /ai/match-providers` Response
```json
{
  "success": true,
  "message": "Provider matches calculated successfully",
  "data": {
    "providers": [
      {
        "providerId": "651f8b...",
        "profileId": "651f8c...",
        "name": "Aarav Sharma",
        "businessName": "Aarav Rapid Plumbing",
        "rating": 5.0,
        "reviewCount": 15,
        "experienceYears": 6,
        "completedJobsCount": 12,
        "compositeScore": 96,
        "scoreBreakdown": {
          "locationScore": 35,
          "ratingScore": 26,
          "experienceScore": 20,
          "availabilityScore": 15
        },
        "cityMatch": true,
        "explanation": "96% Match — Aarav Rapid Plumbing is a verified specialist (services Bangalore, 5.0★ rating, 12 completed jobs, 6y experience)."
      }
    ],
    "totalEligible": 1
  }
}
```
