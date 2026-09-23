# CareConnect API Overview & Reference

## 1. Protocol & Versioning

All CareConnect endpoints are versioned with the base path prefix:
```
http://localhost:5000/api/v1
```

- Content Negotiation: `application/json`
- Character Set: `UTF-8`
- Security Headers: Enforced via Helmet
- Rate Limiting: 100 requests per 15 minutes per IP (API), 20 requests per 15 minutes per IP (Auth)

---

## 2. Standardized Response Formats

### Success Payload Structure
Every successful response returns HTTP 2xx and adheres to this schema:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Payload Structure
Every error response returns HTTP 4xx or 5xx and adheres to this schema:
```json
{
  "success": false,
  "message": "Human-readable summary of the error",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Please provide a valid email address"
      }
    ]
  }
}
```
*(Note: `error.stack` is only included when running in development mode for 5xx errors; it is strictly excluded in production).*

---

## 3. Error Codes Catalog

| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 422 | Request payload failed schema validation (Zod / Mongoose). |
| `BAD_REQUEST` | 400 | Malformed syntax or invalid parameter format. |
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired JWT bearer token. |
| `FORBIDDEN` | 403 | Principal authenticated, but lacks necessary role or permission. |
| `NOT_FOUND` | 404 | Resource with specified identifier does not exist. |
| `DUPLICATE_RESOURCE` | 409 | Unique constraint violated (e.g. email already registered). |
| `RATE_LIMIT_EXCEEDED`| 429 | Request rate exceeded allowed window quota. |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled operational or database exception. |

---

## 4. Authentication & Authorization

All authenticated endpoints require an Authorization header using the Bearer token scheme:
```http
Authorization: Bearer <jwt-token>
```

Tokens are signed using HMAC-SHA256 with `JWT_SECRET` and contain payload:
```json
{
  "id": "60d0fe4f5311236168a109ca",
  "email": "customer@careconnect.local",
  "role": "CUSTOMER",
  "iat": 1727100000,
  "exp": 1727704800
}
```

---

## 5. API Endpoints Catalog

### System & Health
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | Returns server status, uptime, and timestamp. |

### Authentication
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Registers a new account and returns JWT token. |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials and returns JWT token. |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieves current authenticated principal's profile. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Confirms logout and cleans up session tokens. |

### Domain Route Groups (Foundational Routing Configured)
The following route groups are mounted in `server/src/routes/v1/index.js` and return structured placeholder confirmations:

- `/api/v1/users` – User management and account settings
- `/api/v1/providers` – Provider search, profile updates, and credentials
- `/api/v1/categories` – Home service categories and pricing estimates
- `/api/v1/service-requests` – Customer service requests and AI classification
- `/api/v1/quotes` – Provider bids and quote comparison
- `/api/v1/bookings` – Appointments, scheduling, and cancellations
- `/api/v1/availability` – Provider working hours and blackout dates
- `/api/v1/jobs` – Real-time fulfillment, check-ins, and evidence
- `/api/v1/invoices` – Billing statements and payments
- `/api/v1/reviews` – Customer ratings and reviews
- `/api/v1/disputes` – Conflict mediation and refunds
- `/api/v1/notifications` – User notifications stream
- `/api/v1/admin` – Administrative control, verification, and audit logs
