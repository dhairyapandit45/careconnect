# CareConnect Milestone 6 Walkthrough: Booking & Scheduling Engine

## 1. Executive Summary
Milestone 6 operationalizes the CareConnect marketplace transaction by implementing an end-to-end **Booking & Scheduling Engine**. Building directly upon Milestone 5 (Provider Availability & Quotes), this milestone allows customers to select a quote, specify an exact appointment window, validate shift availability, prevent provider double-booking collisions, atomically transition quote and request states, and provide full appointment lifecycle management (viewing, details, and cancellation) for both Customers and Service Providers.

---

## 2. Core Functional Capabilities Delivered

### A. Quote Acceptance & Appointment Scheduling
- **Schedule Window Selection**: Customers pick an appointment date and time slot (`scheduledStart` and `scheduledEnd` in UTC ISO format).
- **Shift Availability Verification**: The server verifies that the requested window falls completely within an active recurring shift (`Availability`) configured for that day of week by the provider.
- **Double-Booking Collision Prevention**: The engine evaluates active bookings (`CONFIRMED`, `IN_PROGRESS`, `PENDING`) using the non-overlapping invariant:
  $$\text{existingStart} < \text{requestedEnd} \quad \land \quad \text{existingEnd} > \text{requestedStart}$$
  Collisions are rejected with HTTP `409 Conflict` (`BOOKING_CONFLICT`).
  Cancelled and completed bookings immediately release the schedule slot. Adjacent back-to-back bookings are explicitly allowed.
- **Atomic Multi-Entity State Transitions**:
  - `Booking`: Created with status `CONFIRMED`, currency `INR`.
  - Selected `Quote`: Transitions to `ACCEPTED`.
  - Competitor `Quotes`: Transition to `REJECTED`.
  - `ServiceRequest`: Transitions to `BOOKED` with `assignedProvider` set.

### B. Customer Booking Management
- **List Bookings**: `GET /api/v1/bookings` with pagination and status filtering (`ALL`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- **Booking Details**: `GET /api/v1/bookings/:id` displaying full service information, scheduled slot, provider credentials, agreed price in INR, and cancellation history.
- **Cancellation**: `POST /api/v1/bookings/:id/cancel` with mandatory cancellation reason ($\ge 5$ chars), transitioning status to `CANCELLED` and releasing the schedule slot immediately.

### C. Provider Booking Management
- **Assigned Job Feed**: `GET /api/v1/providers/bookings` with table list view and chronological agenda view.
- **Customer Address Unlocked**: Upon booking confirmation, the customer's street address and contact info are revealed to the assigned provider for on-site dispatch.
- **Provider Details**: `GET /api/v1/providers/bookings/:id`.
- **Provider Cancellation**: `POST /api/v1/providers/bookings/:id/cancel` with mandatory reason.

---

## 3. Test Verification Results

### Backend Integration Tests (Jest + Supertest + In-Memory MongoDB)
- **All 7 Test Suites Passing**:
  1. `tests/health.test.js` (2/2 passing)
  2. `tests/auth.test.js` (14/14 passing)
  3. `tests/rbac.test.js` (16/16 passing)
  4. `tests/categoryRequest.test.js` (18/18 passing)
  5. `tests/provider.test.js` (15/15 passing)
  6. `tests/marketplace.test.js` (18/18 passing)
  7. `tests/booking.test.js` (**31/31 passing**)
- **Total Backend Tests**: **114 Passed, 0 Failed, 0 Skipped**
- **ESLint Server**: **0 errors, 0 warnings**

### Frontend Component & Integration Tests (Vitest + React Testing Library)
- **All 6 Test Suites Passing**:
  1. `src/tests/components.test.jsx` (5/5 passing)
  2. `src/tests/authFlow.test.jsx` (6/6 passing)
  3. `src/tests/categoryAndRequest.test.jsx` (4/4 passing)
  4. `src/tests/providerWorkflow.test.jsx` (5/5 passing)
  5. `src/tests/marketplaceWorkflow.test.jsx` (9/9 passing)
  6. `src/tests/bookingWorkflow.test.jsx` (**7/7 passing**)
- **Total Frontend Tests**: **36 Passed, 0 Failed**
- **ESLint Client**: **0 errors, 0 warnings**
- **Vite Production Build**: **Successful (0 errors, 0 warnings)**
