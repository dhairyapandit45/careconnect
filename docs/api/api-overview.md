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
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired JWT bearer token. |
| `FORBIDDEN` | 403 | Principal authenticated, but lacks necessary role or account is inactive/suspended. |
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
