# CareConnect API Overview & Reference

## 1. Protocol & Versioning

All CareConnect endpoints are versioned with the base path prefix:
```
http://localhost:5000/api/v1
```

- Content Negotiation: `application/json`
- Character Set: `UTF-8`
- Security Headers: Enforced via Helmet (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- Rate Limiting: 
  - Standard API routes: 100 requests per 15 minutes per IP
  - Authentication routes: 20 attempts per 15 minutes per IP

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
| `CATEGORY_IN_USE` | 400 | Cannot delete category because existing service requests reference it. |
| `CATEGORY_INACTIVE` | 400 | Cannot submit service request against an inactive or archived category. |
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired JWT bearer token. |
| `FORBIDDEN` | 403 | Principal authenticated, but lacks necessary role or account is inactive/suspended. |
| `NOT_FOUND` | 404 | Resource with specified identifier does not exist. |
| `DUPLICATE_RESOURCE` | 409 | Unique constraint violated (e.g. email or category slug already registered). |
| `RATE_LIMIT_EXCEEDED`| 429 | Request rate exceeded allowed window quota. |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled operational or database exception. |

---

## 4. Authentication & Authorization

All authenticated endpoints require an Authorization header using the Bearer token scheme:
```http
Authorization: Bearer <jwt-token>
```

Tokens are signed using HMAC-SHA256 with `JWT_SECRET`. To protect user privacy, the payload contains only essential identity data:
```json
{
  "id": "60d0fe4f5311236168a109ca",
  "role": "CUSTOMER",
  "iat": 1727100000,
  "exp": 1727704800
}
```

---

## 5. Detailed Endpoint Specifications

### Health Check: `GET /api/v1/health`
- **Purpose**: Verifies that the API server is operational and responsive.
- **Authentication**: None (Public).
- **Request Body**: None.
- **Successful Response (200 OK)**:
```json
{
  "success": true,
  "message": "CareConnect API is running",
  "data": {
    "uptime": 24.5,
    "timestamp": "2026-09-23T17:00:00.000Z",
    "environment": "development"
  }
}
```
- **Error Responses**:
  - `500 INTERNAL_SERVER_ERROR`: If server encounters an unhandled runtime error.

---

### User Registration: `POST /api/v1/auth/register`
- **Purpose**: Creates a new user principal, hashes the password via bcrypt (work factor 12), creates a ProviderProfile if registering as `SERVICE_PROVIDER`, and issues a signed JWT.
- **Authentication**: None (Public, protected by rate limiting).
- **Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "Password123!",
  "phone": "+1-555-0123",
  "role": "CUSTOMER"
}
```
- **Validation Rules**:
  - `name`: String, 2-100 characters.
  - `email`: Valid email format (normalized to lowercase and trimmed).
  - `password`: String, minimum 8 characters.
  - `role`: One of `CUSTOMER`, `SERVICE_PROVIDER`, `SUPPORT_AGENT`, `OPERATIONS_MANAGER`, `PLATFORM_ADMIN` (defaults to `CUSTOMER`).
- **Successful Response (201 Created)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "66f1947b1981e194821a3611",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1-555-0123",
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "createdAt": "2026-09-23T17:00:00.000Z",
      "updatedAt": "2026-09-23T17:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
- **Error Responses**:
  - `409 DUPLICATE_RESOURCE`: If email address is already registered.
  - `422 VALIDATION_ERROR`: If input validation fails (e.g. password < 8 characters or malformed email).

---

### User Login: `POST /api/v1/auth/login`
- **Purpose**: Authenticates user credentials, validates account active status, and issues a signed JWT.
- **Authentication**: None (Public, protected by rate limiting).
- **Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "Password123!"
}
```
- **Successful Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "66f1947b1981e194821a3611",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1-555-0123",
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "createdAt": "2026-09-23T17:00:00.000Z",
      "updatedAt": "2026-09-23T17:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
- **Error Responses**:
  - `401 UNAUTHORIZED`: If email does not exist or password does not match.
  - `403 FORBIDDEN`: If account status is `SUSPENDED`, `INACTIVE`, or `PENDING`.
  - `422 VALIDATION_ERROR`: If required fields are missing.

---

### Current User Profile: `GET /api/v1/auth/me`
- **Purpose**: Rehydrates authenticated user profile on client bootstrap or route navigation.
- **Authentication**: Required (`Bearer <token>`).
- **Request Body**: None.
- **Successful Response (200 OK)**:
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "_id": "66f1947b1981e194821a3611",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1-555-0123",
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "createdAt": "2026-09-23T17:00:00.000Z",
      "updatedAt": "2026-09-23T17:00:00.000Z"
    }
  }
}
```
- **Error Responses**:
  - `401 UNAUTHORIZED`: If token is missing, expired, or malformed.
  - `403 FORBIDDEN`: If the account has become suspended or inactive.

---

### Admin Dashboard Overview: `GET /api/v1/admin/dashboard`
- **Purpose**: Delivers core administrative metrics and verifies server-side RBAC security enforcement.
- **Authentication**: Required (`Bearer <token>`).
- **Authorization**: `PLATFORM_ADMIN` only.
- **Successful Response (200 OK)**:
```json
{
  "success": true,
  "message": "Admin metrics retrieved successfully",
  "data": {
    "totalUsers": 14,
    "pendingVerifications": 2,
    "systemStatus": "HEALTHY",
    "activeRole": "PLATFORM_ADMIN"
  }
}
```
- **Error Responses**:
  - `401 UNAUTHORIZED`: If not authenticated.
  - `403 FORBIDDEN`: If authenticated user role is not `PLATFORM_ADMIN` (e.g. `CUSTOMER` or `SERVICE_PROVIDER`).

---

### Service Categories Catalog: `GET /api/v1/categories`
- **Purpose**: Lists service categories. By default, returns active categories only. Platform Admins can request `?includeInactive=true` to view all categories.
- **Authentication**: Optional (Public for active categories; JWT required for `includeInactive=true`).
- **Query Parameters**:
  - `includeInactive` (boolean, optional): Set to `true` (Admins only) to include archived/inactive categories.
- **Successful Response (200 OK)**:
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": {
    "categories": [
      {
        "_id": "6732a101b0f1e2938475a101",
        "name": "Appliance Repair",
        "slug": "appliance-repair",
        "description": "Professional diagnostics and repairs for major home appliances",
        "icon": "Wrench",
        "startingPrice": 65,
        "pricingUnit": "HOURLY",
        "requiredSkills": ["electrical", "refrigeration", "diagnostics"],
        "isActive": true
      }
    ]
  }
}
```

---

### Create Service Category: `POST /api/v1/categories`
- **Purpose**: Allows Platform Admins to create new trade categories with auto-slug generation and pricing units.
- **Authentication**: Required (`Bearer <token>`).
- **Authorization**: `PLATFORM_ADMIN` only.
- **Request Body**:
```json
{
  "name": "Electrical Work",
  "slug": "electrical-work",
  "description": "Wiring, breaker panel replacements, and light fixture installations",
  "icon": "Zap",
  "startingPrice": 80,
  "pricingUnit": "HOURLY",
  "requiredSkills": ["wiring", "breaker maintenance"],
  "isActive": true
}
```
- **Successful Response (201 Created)**: Returns created category object.
- **Error Responses**:
  - `401 UNAUTHORIZED`: If not authenticated.
  - `403 FORBIDDEN`: If user is not `PLATFORM_ADMIN`.
  - `409 DUPLICATE_RESOURCE`: If category name or slug already exists.
  - `422 VALIDATION_ERROR`: If required fields are missing or invalid.

---

### Update Service Category: `PATCH /api/v1/categories/:id`
- **Purpose**: Allows Platform Admins to modify category attributes, pricing, or toggle active status.
- **Authentication**: Required (`Bearer <token>`).
- **Authorization**: `PLATFORM_ADMIN` only.

---

### Delete Service Category: `DELETE /api/v1/categories/:id`
- **Purpose**: Deletes category if unreferenced.
- **Authentication**: Required (`Bearer <token>`).
- **Authorization**: `PLATFORM_ADMIN` only.
- **Referential Protection**: Returns `400 BAD_REQUEST` with `code: CATEGORY_IN_USE` if any historical service requests reference this category. Admins must deactivate (`isActive: false`) instead.

---

### Submit Service Request: `POST /api/v1/service-requests`
- **Purpose**: Customer creates a new home service request.
- **Authentication**: Required (`Bearer <token>`).
- **Authorization**: `CUSTOMER` only.
- **Security Invariants**:
  - Customer ownership is strictly bound to `req.user._id` from token (payload attempts to spoof customer are ignored).
  - Initial status is strictly forced to `SUBMITTED`.
  - Preferred date must be in the future.
- **Request Body**:
```json
{
  "categoryId": "6732a101b0f1e2938475a101",
  "title": "Kitchen Sink Drain Leaking Continuously",
  "description": "The P-trap pipe underneath the kitchen sink is cracked and dripping water when tap runs.",
  "address": "742 Evergreen Terrace",
  "city": "Springfield",
  "postalCode": "62704",
  "state": "IL",
  "preferredDate": "2026-09-25",
  "preferredTime": {
    "start": "09:00",
    "end": "12:00"
  },
  "requiredSkills": ["pipe repair"]
}
```
- **Successful Response (201 Created)**: Returns created request with populated category and customer details.

---

### List Service Requests: `GET /api/v1/service-requests`
- **Purpose**: Lists service requests.
- **Authentication**: Required (`Bearer <token>`).
- **Access Boundaries**:
  - `CUSTOMER`: Strictly limited to requests where `customer === req.user._id`.
  - `PLATFORM_ADMIN`, `OPERATIONS_MANAGER`, `SUPPORT_AGENT`: Operational staff can query across all customer requests.
  - `SERVICE_PROVIDER`: Quarantined with `403 FORBIDDEN` until provider matching milestone.
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 10, ceiling: 50)
  - `status` (string, optional: e.g. `SUBMITTED`, `BOOKED`)
  - `category` (ObjectId, optional)
- **Successful Response (200 OK)**:
```json
{
  "success": true,
  "message": "Service requests retrieved successfully",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### Get Service Request Details: `GET /api/v1/service-requests/:id`
- **Purpose**: Retrieves full service request details by ID.
- **Authentication**: Required (`Bearer <token>`).
- **Access Boundaries**:
  - Customer can only access their own request; requests belonging to another customer return `403 FORBIDDEN`.
  - Operational staff can view any request.

---

## 6. Service Provider Profile & Verification Endpoints

### Get Aggregated Skills Catalog: `GET /api/v1/providers/skills`
- **Purpose**: Retrieves aggregated unique required skills across all active service categories.
- **Authentication**: Optional.
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Skills catalog retrieved successfully",
  "data": {
    "skills": ["Pipe Fitting", "Drain Cleaning", "Leak Inspection", "Wiring"]
  }
}
```

---

### Get Authenticated Provider Profile: `GET /api/v1/providers/me`
- **Purpose**: Retrieves the authenticated provider's own business profile, documents, and verification audit notes.
- **Authentication**: Required (`Bearer <token>`).
- **Role Requirement**: `SERVICE_PROVIDER`.
- **Response (200 OK)**: Full provider profile object with `verificationStatus`, `documents`, and `verificationNotes`.

---

### Create Provider Profile (Onboarding): `POST /api/v1/providers/profile`
- **Purpose**: Completes provider onboarding. Forces `verificationStatus: "PENDING"`, `rating: 0`, and `reviewCount: 0`.
- **Authentication**: Required (`Bearer <token>`).
- **Role Requirement**: `SERVICE_PROVIDER`.
- **Request Body**:
```json
{
  "businessName": "Mario Master Plumbing LLC",
  "description": "Licensed residential and commercial plumbing specialist.",
  "skills": ["Pipe Fitting", "Leak Inspection"],
  "serviceCategories": ["607f1f77bcf86cd799439011"],
  "serviceAreas": [
    { "city": "Hyderabad", "areas": ["Hitec City", "Madhapur"] }
  ],
  "experienceYears": 12,
  "pricing": {
    "model": "HOURLY",
    "minimumCharge": 300,
    "hourlyRate": 750
  },
  "documents": [
    {
      "type": "CERTIFICATION",
      "name": "Master Plumber License",
      "url": "https://docs.careconnect.local/lic_982.pdf"
    }
  ]
}
```
- **Response (201 Created)**: Returns created profile with `verificationStatus: "PENDING"`.

---

### Update Provider Profile: `PATCH /api/v1/providers/profile` (or `PUT`)
- **Purpose**: Updates business information, pricing, skills, and coverage areas. Ignores client-sent `verificationStatus`, `rating`, and `reviewCount`.
- **Authentication**: Required (`Bearer <token>`).
- **Role Requirement**: `SERVICE_PROVIDER`.
- **Response (200 OK)**: Returns updated provider profile.

---

### Get Provider by ID: `GET /api/v1/providers/:id`
- **Purpose**: Retrieves provider profile. Returns a safe public summary (stripping documents, verification notes, and private contact details) for customers/guests, or full details for profile owners and platform staff.
- **Authentication**: Optional.
- **Response (200 OK)**: Sanitized public summary or full profile.

---

### Platform Admin: List Providers: `GET /api/v1/admin/providers`
- **Purpose**: Lists providers with verification filters, search query, and pagination.
- **Authentication**: Required (`Bearer <token>`).
- **Role Requirement**: `PLATFORM_ADMIN`.
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 10, max: 50)
  - `status` (`PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `SUSPENDED`)
  - `search` (matches business name or owner name/email)
  - `category` (Filter by service category ObjectId)

---

### Platform Admin: Get Provider Details: `GET /api/v1/admin/providers/:id`
- **Purpose**: Retrieves full provider dossier including attached verification documents, licenses, and previous notes.
- **Authentication**: Required (`Bearer <token>`).
- **Role Requirement**: `PLATFORM_ADMIN`.

---

### Platform Admin: Transition Verification Status: `PATCH /api/v1/admin/providers/:id/verification`
- **Purpose**: Executes state-machine governed verification status transitions with audit notes.
- **Authentication**: Required (`Bearer <token>`).
- **Role Requirement**: `PLATFORM_ADMIN`.
- **Request Body**:
```json
{
  "action": "APPROVE",
  "notes": "All trade credentials and liability insurance verified against official registry."
}
```
*Valid Actions / Transitions*:
- `PENDING` $\rightarrow$ `UNDER_REVIEW`, `APPROVED`, `REJECTED`
- `UNDER_REVIEW` $\rightarrow$ `APPROVED`, `REJECTED`, `PENDING`
- `APPROVED` $\rightarrow$ `SUSPENDED`, `UNDER_REVIEW`
- `REJECTED` $\rightarrow$ `UNDER_REVIEW`, `PENDING`
- `SUSPENDED` $\rightarrow$ `APPROVED`, `UNDER_REVIEW`
- **Response (200 OK)**: Returns updated profile with new status and updated verification notes.


