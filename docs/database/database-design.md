# CareConnect Database Design & Data Architecture

## 1. Overview

CareConnect utilizes MongoDB with Mongoose ODM to model a multi-role marketplace and operations platform. The database architecture balances relational referential integrity (using Mongoose `ObjectId` references) with document-oriented embedding for performance, historical immutability, and transactional clarity.

---

## 2. Entity Relationship Overview

```mermaid
erDiagram
    USER ||--o{ PROVIDER_PROFILE : has
    USER ||--o{ SERVICE_REQUEST : creates
    USER ||--o{ QUOTE : submits
    USER ||--o{ BOOKING : customer_in
    USER ||--o{ BOOKING : provider_in
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : initiates

    SERVICE_CATEGORY ||--o{ SERVICE_REQUEST : categorizes
    SERVICE_REQUEST ||--o{ QUOTE : receives
    SERVICE_REQUEST ||--o| BOOKING : results_in

    PROVIDER_PROFILE ||--o{ QUOTE : originates
    PROVIDER_PROFILE ||--o{ BOOKING : fulfills
    PROVIDER_PROFILE ||--o{ AVAILABILITY : defines
    PROVIDER_PROFILE ||--o{ REVIEW : rated_by

    BOOKING ||--o| JOB : tracks
    BOOKING ||--o| INVOICE : generates
    BOOKING ||--o| REVIEW : receives
    BOOKING ||--o| DISPUTE : subject_of
```

---

## 3. Data Dictionary & Collections

### 1. `users`
Represents all system actors across the 5 system roles.
- `_id`: ObjectId (Primary Key)
- `name`: String (Required, trimmed, min: 2, max: 100)
- `email`: String (Required, unique, indexed, normalized to lowercase)
- `passwordHash`: String (Bcrypt salt rounds 12, `select: false`, stripped from JSON)
- `phone`: String (Optional, trimmed)
- `role`: Enum [`CUSTOMER`, `SERVICE_PROVIDER`, `SUPPORT_AGENT`, `OPERATIONS_MANAGER`, `PLATFORM_ADMIN`]
- `status`: Enum [`ACTIVE`, `INACTIVE`, `SUSPENDED`, `PENDING`]
- `createdAt`, `updatedAt`: Timestamps
- **Indexes**: `{ email: 1 }` (unique), `{ role: 1, status: 1 }`

### 2. `providerprofiles`
Extended operational and business data for `SERVICE_PROVIDER` accounts.
- `user`: ObjectId (Ref: `User`, unique index)
- `businessName`: String (Trimmed, minlength: 2, maxlength: 120)
- `description`: String (Company bio & credentials, minlength: 10, maxlength: 2000)
- `serviceCategories`: Array of ObjectId (Ref: `ServiceCategory`, indexed)
- `skills`: Array of String (Normalized trade capabilities)
- `serviceAreas`: Array of `{ city: String, areas: [String] }`
- `experienceYears`: Number (Integer, 0 to 60)
- `pricing`: Object:
  - `model`: Enum [`FIXED`, `HOURLY`, `STARTING_FROM`, `QUOTE_REQUIRED`] (Default: `HOURLY`)
  - `minimumCharge`: Number (Min: 0, default: 0)
  - `hourlyRate`: Number (Min: 0, default: 0)
- `hourlyRate`: Number (Legacy synchronized alias)
- `verificationStatus`: Enum [`PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `SUSPENDED`] (Initial state: `PENDING`)
- `verificationNotes`: String (Administrative audit notes and reason log)
- `documents`: Array of `{ type: Enum['IDENTITY', 'ADDRESS_PROOF', 'CERTIFICATION', 'BUSINESS_LICENSE', 'OTHER'], name: String, url: String }`
- `rating`: Number (0.0 to 5.0, default: 0, protected from client mutation)
- `reviewCount`: Number (default: 0, protected from client mutation)
- `isAvailable`: Boolean (Default: `true`, indexed)
- `createdAt`, `updatedAt`: Timestamps
- **Indexes**:
  - `{ user: 1 }` (unique)
  - `{ verificationStatus: 1 }`
  - `{ serviceCategories: 1, verificationStatus: 1 }`
  - `{ 'serviceAreas.city': 1, verificationStatus: 1 }`
  - `{ rating: -1, verificationStatus: 1 }`
- **Security Invariant**: `verificationStatus`, `rating`, and `reviewCount` are strictly non-writable by providers. Public profiles accessed by guests or customers strip sensitive document URLs and administrative notes.

### 3. `servicecategories`
Configurable home service classifications.
- `name`: String (Required, unique, trimmed, e.g. `Appliance Repair`)
- `slug`: String (Required, unique, indexed, e.g. `appliance-repair`, auto-generated if omitted)
- `description`: String (Required, trimmed)
- `icon`: String (Default: `Wrench`, e.g. `Wrench`, `Sparkles`, `Zap`, `Droplets`, `Hammer`)
- `startingPrice`: Number (Required, min: 0, default: 0)
- `pricingUnit`: Enum [`FIXED`, `HOURLY`, `STARTING_FROM`, `QUOTE_REQUIRED`] (Default: `STARTING_FROM`)
- `requiredSkills`: Array of String (Normalized skill tags)
- `isActive`: Boolean (Indexed, default: `true`)
- `createdAt`, `updatedAt`: Timestamps
- **Indexes**: `{ slug: 1 }` (unique), `{ name: 1 }` (unique), `{ isActive: 1 }`
- **Integrity Rule**: Cannot be deleted if historical `servicerequests` reference this category (`CATEGORY_IN_USE`). Must be deactivated instead.

### 4. `servicerequests`
Home service requests posted by Customers.
- `customer`: ObjectId (Ref: `User`, required, indexed, immutable from token identity)
- `category`: ObjectId (Ref: `ServiceCategory`, required, indexed)
- `title`: String (Required, minlength: 5, maxlength: 120, trimmed)
- `description`: String (Required, minlength: 15, maxlength: 2000, trimmed)
- `location`: Structured object:
  - `address`: String (Required, street address)
  - `city`: String (Required, city name)
  - `postalCode`: String (Required, postal / PIN code)
  - `state`: String (Optional, state / province)
  - `coordinates`: [Number] (Optional GeoJSON `[longitude, latitude]`, 2dsphere index)
- `preferredDate`: Date (Required, validated non-past date)
- `preferredTime`: Object `{ start: String (e.g. "09:00"), end: String (e.g. "12:00") }`
- `preferredTimeSlot`: String (`MORNING`, `AFTERNOON`, `EVENING` - legacy alias)
- `requiredSkills`: Array of String (Capabilities required to fulfill this job)
- `assignedProvider`: ObjectId (Ref: `User`, assigned upon quote acceptance / booking confirmation)
- `status`: Enum [`DRAFT`, `SUBMITTED`, `MATCHING`, `QUOTING`, `PROVIDER_SELECTED`, `BOOKED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `DISPUTED`] (Initial status strictly defaults to `SUBMITTED`)
- `aiClassification`: `{ predictedCategory, confidenceScore, extractedUrgency, tags, processedAt }`
- `createdAt`, `updatedAt`: Timestamps
- **Indexes**:
  - `{ customer: 1, status: 1 }` (Compound index for customer dashboard / request queries)
  - `{ category: 1, status: 1 }` (Compound index for category filtering and provider matching)
  - `{ preferredDate: 1, status: 1 }` (Compound index for schedule queries)
  - `{ 'location.city': 1, status: 1 }` (Compound index for geographic provider eligibility discovery)
  - `{ 'location.coordinates': '2dsphere' }` (Geospatial index for location queries)
- **Security Boundary**: Strict server-side ownership isolation. Customers can only read and mutate their own requests. Eligible approved providers can discover sanitized requests without private customer contact/address details.

### 5. `quotes`
Bids and formal price quotes submitted by Providers for Service Requests.
- `serviceRequest`: ObjectId (Ref: `ServiceRequest`, required, indexed)
- `provider`: ObjectId (Ref: `User`, required, indexed)
- `providerProfile`: ObjectId (Ref: `ProviderProfile`, indexed)
- `amount`: Number (Required, canonical price in INR, min: 0.01)
- `currency`: String (Strictly `'INR'`)
- `estimatedDuration`: Number (Estimated hours to fulfill job, min: 0.1)
- `description`: String (Detailed proposal scope, materials, guarantees, minlength: 10)
- `validUntil`: Date (Required, future validity expiration timestamp)
- `status`: Enum [`SUBMITTED`, `VIEWED`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`, `EXPIRED`] (Default: `SUBMITTED`)
- `pricing`: `{ totalAmount, laborCost, materialCost, currency }` (Synchronized legacy pricing block)
- `estimatedHours`: Number (Synchronized legacy alias)
- `notes`: String (Synchronized legacy alias)
- `expiresAt`: Date (Synchronized legacy alias)
- `createdAt`, `updatedAt`: Timestamps
- **Indexes**:
  - `{ serviceRequest: 1, provider: 1 }` (Compound index)
  - `{ serviceRequest: 1, status: 1 }` (Compound index for quote comparison queries)
  - `{ provider: 1, status: 1 }` (Compound index for provider submitted quotes)
  - `{ serviceRequest: 1, provider: 1, status: 1 }` (Enforces active quote uniqueness)
- **State Machine Transitions**:
  - `SUBMITTED` $\rightarrow$ `VIEWED`, `WITHDRAWN`, `ACCEPTED`, `REJECTED`, `EXPIRED`
  - `VIEWED` $\rightarrow$ `WITHDRAWN`, `ACCEPTED`, `REJECTED`, `EXPIRED`
  - `ACCEPTED` $\rightarrow$ Terminal state (triggers transition of other request quotes to `REJECTED` and `serviceRequest.status` to `PROVIDER_SELECTED`)
  - `REJECTED`, `WITHDRAWN`, `EXPIRED` $\rightarrow$ Terminal states

### 6. `bookings`
Legally binding service contracts resulting from accepted quotes and confirmed scheduling.
- `serviceRequest`: ObjectId (Ref: `ServiceRequest`, required, indexed)
- `customer`: ObjectId (Ref: `User`, required, indexed)
- `provider`: ObjectId (Ref: `User`, required, indexed)
- `providerProfile`: ObjectId (Ref: `ProviderProfile`, indexed)
- `quote`: ObjectId (Ref: `Quote`, required)
- `scheduledStart`: Date (Required, ISO 8601 UTC timestamp, indexed)
- `scheduledEnd`: Date (Required, ISO 8601 UTC timestamp, strictly `> scheduledStart`)
- `price`: Number (Required, agreed amount, min: 0)
- `currency`: String (Required, strictly `'INR'`)
- `status`: Enum [`PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `DISPUTED`] (Default: `CONFIRMED`)
- `cancellationReason`: String (Top-level reason for cancellation)
- `cancelledBy`: Enum [`CUSTOMER`, `SERVICE_PROVIDER`, `OPERATIONS_MANAGER`, `PLATFORM_ADMIN`]
- `cancelledAt`: Date (Cancellation timestamp)
- `cancellation`: `{ cancelledBy, cancelledAt, cancellationReason, reason, refundAmount }` (Synchronized sub-document)
- `createdAt`, `updatedAt`: Timestamps
- **Indexes**:
  - `{ customer: 1, status: 1 }` (Compound index for customer booking history)
  - `{ provider: 1, status: 1 }` (Compound index for provider job lists)
  - `{ scheduledStart: 1, status: 1 }` (Index for calendar queries)
  - `{ provider: 1, scheduledStart: 1, scheduledEnd: 1 }` (Compound index for high-performance double-booking conflict detection)
- **Double-Booking Conflict Query Specification**:
  An active booking collision exists if:
  `provider = quote.provider`, `status in ['CONFIRMED', 'IN_PROGRESS', 'PENDING']`,
  `scheduledStart < requestedEnd` AND `scheduledEnd > requestedStart`.
  Adjacent back-to-back bookings (`existingEnd == requestedStart` or `requestedEnd == existingStart`) and cancelled/completed bookings do not conflict.

### 7. `availabilities`
Weekly schedules, recurring shift windows, and blackout dates for Providers.
- `provider`: ObjectId (Ref: `User`, required, indexed)
- `providerProfile`: ObjectId (Ref: `ProviderProfile`, required, indexed)
- `dayOfWeek`: Enum [`MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY`] (Required)
- `startTime`: String (Required, 24-hr `HH:mm` format, e.g. `"09:00"`)
- `endTime`: String (Required, 24-hr `HH:mm` format, e.g. `"17:00"`, strictly `> startTime`)
- `isAvailable`: Boolean (Default: `true`)
- `isBlocked`: Boolean (Default: `false`)
- `blockedDate`: Date (Optional)
- `createdAt`, `updatedAt`: Timestamps
- **Indexes**:
  - `{ provider: 1, dayOfWeek: 1 }` (Compound index)
  - `{ providerProfile: 1, dayOfWeek: 1 }` (Compound index)
- **Overlap Validation**: Service layer strictly enforces non-overlapping shift intervals for any given provider on the same day.

### 8. `jobs`
Real-time fulfillment tracking, check-ins, service evidence, and job notes.
- `booking`: ObjectId (Ref: `Booking`, unique indexed)
- `provider`: ObjectId (Ref: `User`, indexed)
- `customer`: ObjectId (Ref: `User`, indexed)
- `status`: Enum [`ASSIGNED`, `ON_THE_WAY`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`]
- `startedAt`, `completedAt`: Date
- `serviceEvidence`: Array of `{ url, description, uploadedAt }`
- `notes`: String
- **Indexes**: `{ booking: 1 }` (unique), `{ provider: 1, status: 1 }`, `{ customer: 1, status: 1 }`

### 9. `invoices`
Financial accounting, payment records, and fee breakdowns.
- `invoiceNumber`: String (Unique index, e.g. `INV-2026-0001`)
- `booking`: ObjectId (Ref: `Booking`, indexed)
- `customer`: ObjectId (Ref: `User`)
- `provider`: ObjectId (Ref: `User`)
- `subtotal`: Number
- `platformFee`: Number
- `tax`: Number
- `totalAmount`: Number
- `status`: Enum [`ISSUED`, `PAID`, `REFUNDED`, `VOID`]
- `paidAt`: Date
- **Indexes**: `{ invoiceNumber: 1 }` (unique), `{ booking: 1 }`

### 10. `reviews`
Verified feedback submitted by customers after job completion.
- `booking`: ObjectId (Ref: `Booking`, unique index)
- `customer`: ObjectId (Ref: `User`, indexed)
- `provider`: ObjectId (Ref: `User`, indexed)
- `providerProfile`: ObjectId (Ref: `ProviderProfile`, indexed)
- `rating`: Number (1 to 5)
- `comment`: String
- **Indexes**: `{ booking: 1 }` (unique), `{ provider: 1, rating: -1 }`, `{ providerProfile: 1, rating: -1 }`

### 11. `disputes`
Conflict mediation and escrow refund claims.
- `booking`: ObjectId (Ref: `Booking`, indexed)
- `raisedBy`: ObjectId (Ref: `User`, indexed)
- `reason`: String
- `description`: String
- `status`: Enum [`OPEN`, `UNDER_REVIEW`, `RESOLVED`, `ESCALATED`, `DISMISSED`]
- `resolution`: `{ resolvedBy, resolvedAt, resolutionNotes, refundApproved, refundAmount }`
- **Indexes**: `{ booking: 1 }`, `{ raisedBy: 1, status: 1 }`

### 12. `notifications`
In-app and push notification event stream.
- `recipient`: ObjectId (Ref: `User`, indexed)
- `title`: String
- `message`: String
- `type`: Enum [`SYSTEM`, `BOOKING`, `QUOTE`, `PAYMENT`, `DISPUTE`]
- `data`: Mixed
- `isRead`: Boolean (Default: false, indexed)
- **Indexes**: `{ recipient: 1, isRead: 1 }`

### 13. `auditlogs`
Append-only immutable audit trail for security compliance and governance.
- `actor`: ObjectId (Ref: `User`, indexed)
- `action`: String (e.g. `PROVIDER_VERIFIED`, `DISPUTE_REFUND_ISSUED`)
- `targetType`: String
- `targetId`: ObjectId (Indexed)
- `details`: Mixed
- `ipAddress`: String
- `userAgent`: String
- `createdAt`: Date (Indexed)
- **Indexes**: `{ actor: 1 }`, `{ targetId: 1 }`, `{ createdAt: -1 }`

---

## 4. Lifecycle State Machine Diagrams

### Service Request Lifecycle
```
[DRAFT] ──> [SUBMITTED] ──> [MATCHING] ──> [QUOTING] ──> [PROVIDER_SELECTED] ──> [BOOKED] ──> [IN_PROGRESS] ──> [COMPLETED]
   │             │              │             │                 │                  │              │                 │
   └─────────────┴──────────────┴─────────────┴─────────────────┴──────────────────┴──────────────┴──────> [CANCELLED]
                                                                                                   │
                                                                                                   └──────> [DISPUTED]
```

### Booking Lifecycle
```
[PENDING] ──> [CONFIRMED] ──> [IN_PROGRESS] ──> [COMPLETED]
    │              │                │                │
    └──────────────┴────────────────┴────────> [CANCELLED]
                                    │                │
                                    └────────> [DISPUTED]
```

### Job Execution Lifecycle
```
[ASSIGNED] ──> [ON_THE_WAY] ──> [CHECKED_IN] ──> [IN_PROGRESS] ──> [COMPLETED]
    │               │                 │                 │
    └───────────────┴─────────────────┴─────────────────┴──────> [CANCELLED]
```
