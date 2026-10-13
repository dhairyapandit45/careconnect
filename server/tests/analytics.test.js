/**
 * Integration Test: Milestone 9C - Analytics Backend
 * Tests MongoDB aggregation pipelines for booking trends, revenue trends,
 * completion/cancellation rates, provider performance, category demand,
 * dispute/support ticket trends, zero-data boundaries, and server-side RBAC.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

const User = require('../src/models/User');
const ServiceCategory = require('../src/models/ServiceCategory');
const ProviderProfile = require('../src/models/ProviderProfile');
const ServiceRequest = require('../src/models/ServiceRequest');
const Booking = require('../src/models/Booking');
const Job = require('../src/models/Job');
const Dispute = require('../src/models/Dispute');
const SupportTicket = require('../src/models/SupportTicket');
const Invoice = require('../src/models/Invoice');

const { ROLES } = require('../src/constants/roles');
const {
  BOOKING_STATUS,
  JOB_STATUS,
  DISPUTE_STATUS,
  SUPPORT_TICKET_STATUS,
  SUPPORT_TICKET_PRIORITY,
  INVOICE_STATUS,
  PROVIDER_VERIFICATION_STATUS,
} = require('../src/constants/status');

let mongoServer;

// Tokens
let adminToken;
let opsToken;
let supportToken;
let customerToken;
let providerToken;

// Seeded entities
let plumbingCat;
let electricCat;
let providerUser1;
let providerUser2;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Create Platform Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Alice Admin',
    email: 'admin.analytics@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = adminRes.body.data.token;

  // 2. Create Operations Manager
  const opsRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Oliver Ops',
    email: 'ops.analytics@careconnect.local',
    password: 'Password123!',
    role: ROLES.OPERATIONS_MANAGER,
  });
  opsToken = opsRes.body.data.token;

  // 3. Create Support Agent
  const supportRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Sam Support',
    email: 'support.analytics@careconnect.local',
    password: 'Password123!',
    role: ROLES.SUPPORT_AGENT,
  });
  supportToken = supportRes.body.data.token;

  // 4. Create Customer
  const custRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Charlie Customer',
    email: 'customer.analytics@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customerToken = custRes.body.data.token;
  const customerUser = custRes.body.data.user;

  // 5. Create Service Provider 1
  const prov1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Dave Plumber',
    email: 'dave.analytics@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  providerToken = prov1Res.body.data.token;
  providerUser1 = prov1Res.body.data.user;

  // 6. Create Service Provider 2
  const prov2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Eve Electric',
    email: 'eve.analytics@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  providerUser2 = prov2Res.body.data.user;

  // Seed Categories
  plumbingCat = await ServiceCategory.create({
    name: 'Plumbing Analytics',
    slug: 'plumbing-analytics',
    description: 'Expert plumbing services',
    startingPrice: 50,
  });

  electricCat = await ServiceCategory.create({
    name: 'Electrical Analytics',
    slug: 'electrical-analytics',
    description: 'Certified electrical repairs',
    startingPrice: 60,
  });

  // Update Provider Profiles created automatically during registration
  const profile1 = await ProviderProfile.findOneAndUpdate(
    { user: providerUser1._id },
    {
      businessName: 'Dave Fast Plumbing',
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      serviceCategories: [plumbingCat._id],
      serviceAreas: [{ city: 'New York', areas: ['Manhattan'] }],
      rating: 4.8,
      reviewCount: 15,
    },
    { new: true }
  );

  const profile2 = await ProviderProfile.findOneAndUpdate(
    { user: providerUser2._id },
    {
      businessName: 'Eve Wiring & Lights',
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      serviceCategories: [electricCat._id],
      serviceAreas: [{ city: 'New York', areas: ['Brooklyn'] }],
      rating: 4.5,
      reviewCount: 8,
    },
    { new: true }
  );

  // Seed Service Requests
  const dateDay1 = new Date('2026-10-01T10:00:00Z');
  const dateDay2 = new Date('2026-10-02T10:00:00Z');

  const req1 = await ServiceRequest.create({
    customer: customerUser._id,
    category: plumbingCat._id,
    title: 'Fix kitchen sink leak',
    description: 'Water leaking steadily under kitchen sink',
    location: { address: '123 Main St', city: 'New York', postalCode: '10001' },
    preferredDate: dateDay1,
    createdAt: dateDay1,
  });

  const req2 = await ServiceRequest.create({
    customer: customerUser._id,
    category: plumbingCat._id,
    title: 'Toilet valve replacement',
    description: 'Toilet tank constantly refilling and running',
    location: { address: '123 Main St', city: 'New York', postalCode: '10001' },
    preferredDate: dateDay1,
    createdAt: dateDay1,
  });

  const req3 = await ServiceRequest.create({
    customer: customerUser._id,
    category: electricCat._id,
    title: 'Install ceiling lamp fixture',
    description: 'Need new dining room ceiling light installed',
    location: { address: '456 Elm St', city: 'New York', postalCode: '10002' },
    preferredDate: dateDay2,
    createdAt: dateDay2,
  });

  // Seed Bookings
  // Booking 1: COMPLETED, price: 10000 (100.00), Day 1
  const booking1 = await Booking.create({
    serviceRequest: req1._id,
    customer: customerUser._id,
    provider: providerUser1._id,
    providerProfile: profile1._id,
    scheduledStart: dateDay1,
    scheduledEnd: new Date('2026-10-01T12:00:00Z'),
    price: 10000,
    status: BOOKING_STATUS.COMPLETED,
    createdAt: dateDay1,
  });

  // Booking 2: CANCELLED, price: 5000 (50.00), Day 1
  const booking2 = await Booking.create({
    serviceRequest: req2._id,
    customer: customerUser._id,
    provider: providerUser1._id,
    providerProfile: profile1._id,
    scheduledStart: dateDay1,
    scheduledEnd: new Date('2026-10-01T12:00:00Z'),
    price: 5000,
    status: BOOKING_STATUS.CANCELLED,
    cancellationReason: 'Customer rescheduled',
    createdAt: dateDay1,
  });

  // Booking 3: CONFIRMED, price: 8000 (80.00), Day 2
  const booking3 = await Booking.create({
    serviceRequest: req3._id,
    customer: customerUser._id,
    provider: providerUser2._id,
    providerProfile: profile2._id,
    scheduledStart: dateDay2,
    scheduledEnd: new Date('2026-10-02T12:00:00Z'),
    price: 8000,
    status: BOOKING_STATUS.CONFIRMED,
    createdAt: dateDay2,
  });

  // Seed Jobs
  // Job 1: COMPLETED
  const job1 = await Job.create({
    booking: booking1._id,
    provider: providerUser1._id,
    customer: customerUser._id,
    status: JOB_STATUS.COMPLETED,
    completedAt: dateDay1,
    createdAt: dateDay1,
  });

  // Job 2: CANCELLED
  const job2 = await Job.create({
    booking: booking2._id,
    provider: providerUser1._id,
    customer: customerUser._id,
    status: JOB_STATUS.CANCELLED,
    createdAt: dateDay1,
  });

  // Job 3: IN_PROGRESS
  const job3 = await Job.create({
    booking: booking3._id,
    provider: providerUser2._id,
    customer: customerUser._id,
    status: JOB_STATUS.IN_PROGRESS,
    createdAt: dateDay2,
  });

  // Seed Invoices
  // Invoice 1: PAID (10000 cents = $100.00), Day 1
  await Invoice.create({
    invoiceNumber: 'INV-2026-000101',
    booking: booking1._id,
    job: job1._id,
    customer: customerUser._id,
    provider: providerUser1._id,
    subtotal: 9000,
    platformFee: 1000,
    totalAmount: 10000,
    status: INVOICE_STATUS.PAID,
    paidAt: dateDay1,
    createdAt: dateDay1,
  });

  // Invoice 2: ISSUED / UNPAID (8000 cents = $80.00), Day 2
  await Invoice.create({
    invoiceNumber: 'INV-2026-000102',
    booking: booking3._id,
    job: job3._id,
    customer: customerUser._id,
    provider: providerUser2._id,
    subtotal: 7200,
    platformFee: 800,
    totalAmount: 8000,
    status: INVOICE_STATUS.ISSUED,
    createdAt: dateDay2,
  });

  // Seed Disputes
  // Dispute 1: OPEN
  await Dispute.create({
    booking: booking1._id,
    job: job1._id,
    customer: customerUser._id,
    provider: providerUser1._id,
    raisedBy: customerUser._id,
    reason: 'Leak returned after repair',
    category: 'QUALITY_OF_WORK',
    description: 'The kitchen pipe started dripping again within 24 hours',
    status: DISPUTE_STATUS.OPEN,
    createdAt: dateDay1,
  });

  // Dispute 2: RESOLVED with refund
  await Dispute.create({
    booking: booking2._id,
    job: job2._id,
    customer: customerUser._id,
    provider: providerUser1._id,
    raisedBy: customerUser._id,
    reason: 'Deposit refund requested',
    category: 'BILLING',
    description: 'Cancelled in advance and request deposit return',
    status: DISPUTE_STATUS.RESOLVED,
    resolution: {
      resolvedBy: adminRes.body.data.user._id,
      resolvedAt: dateDay2,
      refundApproved: true,
      refundAmount: 5000,
    },
    createdAt: dateDay2,
  });

  // Seed Support Tickets
  // Ticket 1: OPEN, HIGH priority
  await SupportTicket.create({
    ticketNumber: 'CC-TKT-2026-90001',
    createdBy: customerUser._id,
    customer: customerUser._id,
    subject: 'Emergency plumbing inquiry',
    description: 'Need urgent confirmation on booking schedule',
    category: 'BOOKING',
    priority: SUPPORT_TICKET_PRIORITY.HIGH,
    status: SUPPORT_TICKET_STATUS.OPEN,
    createdAt: dateDay1,
  });

  // Ticket 2: RESOLVED, MEDIUM priority
  await SupportTicket.create({
    ticketNumber: 'CC-TKT-2026-90002',
    createdBy: customerUser._id,
    customer: customerUser._id,
    subject: 'Invoice receipt copy',
    description: 'Requesting PDF download link for invoice receipt',
    category: 'PAYMENT',
    priority: SUPPORT_TICKET_PRIORITY.MEDIUM,
    status: SUPPORT_TICKET_STATUS.RESOLVED,
    closedAt: dateDay2,
    createdAt: dateDay2,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Milestone 9C: Analytics Backend Integration Tests', () => {
  // --------------------------------------------------------------------------
  // 1. RBAC Tests: PLATFORM_ADMIN and OPERATIONS_MANAGER allowed
  // --------------------------------------------------------------------------
  test('1. PLATFORM_ADMIN can access admin analytics overview', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.bookings).toBeDefined();
    expect(res.body.data.revenue).toBeDefined();
  });

  test('2. OPERATIONS_MANAGER can access operations analytics overview', async () => {
    const res = await request(app)
      .get('/api/v1/operations/analytics/overview')
      .set('Authorization', `Bearer ${opsToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.bookings).toBeDefined();
  });

  test('3. OPERATIONS_MANAGER can access admin analytics routes (shared access)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/bookings')
      .set('Authorization', `Bearer ${opsToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 2. RBAC Tests: CUSTOMER, SERVICE_PROVIDER, SUPPORT_AGENT denied
  // --------------------------------------------------------------------------
  test('4. CUSTOMER is denied from accessing analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('5. SERVICE_PROVIDER is denied from accessing analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/operations/analytics/revenue')
      .set('Authorization', `Bearer ${providerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('6. SUPPORT_AGENT is denied from accessing analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${supportToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('7. Unauthenticated request is rejected (401 Unauthorized)', async () => {
    const res = await request(app).get('/api/v1/admin/analytics/overview');
    expect(res.status).toBe(401);
  });

  // --------------------------------------------------------------------------
  // 3. Date Validation Tests
  // --------------------------------------------------------------------------
  test('8. Valid date range returns filtered analytics results', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/bookings?startDate=2026-10-01&endDate=2026-10-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.totalBookings).toBe(2);
    expect(res.body.data.summary.completedBookings).toBe(1);
    expect(res.body.data.summary.cancelledBookings).toBe(1);
    expect(res.body.data.timeline.length).toBe(1);
    expect(res.body.data.timeline[0].date).toBe('2026-10-01');
  });

  test('9. Invalid date string is rejected with 422 Validation Error', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/bookings?startDate=invalid-date-string')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/validation failed/i);
  });

  test('10. startDate > endDate is rejected with 422 Validation Error', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/bookings?startDate=2026-10-15&endDate=2026-10-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/validation failed/i);
  });

  // --------------------------------------------------------------------------
  // 4. Booking Trends & Rate Calculations
  // --------------------------------------------------------------------------
  test('11. Booking trends accurately aggregates day-grouped metrics and rates', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/bookings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { summary, timeline } = res.body.data;

    expect(summary.totalBookings).toBe(3);
    expect(summary.completedBookings).toBe(1);
    expect(summary.cancelledBookings).toBe(1);
    expect(summary.confirmedBookings).toBe(1);

    // Completion rate: 1/3 = 33.33%
    expect(summary.completionRate).toBe(33.33);
    // Cancellation rate: 1/3 = 33.33%
    expect(summary.cancellationRate).toBe(33.33);

    // Timeline has 2 dates
    expect(timeline.length).toBe(2);
    const day1 = timeline.find((t) => t.date === '2026-10-01');
    expect(day1).toBeDefined();
    expect(day1.total).toBe(2);
    expect(day1.completed).toBe(1);
    expect(day1.cancelled).toBe(1);

    const day2 = timeline.find((t) => t.date === '2026-10-02');
    expect(day2).toBeDefined();
    expect(day2.total).toBe(1);
    expect(day2.confirmed).toBe(1);
  });

  // --------------------------------------------------------------------------
  // 5. Revenue Trends: Distinguishing Paid vs Issued
  // --------------------------------------------------------------------------
  test('12. Revenue trends clearly distinguishes paid revenue from merely issued invoices', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/revenue')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { summary, timeline } = res.body.data;

    // Total invoices = 2 (INV-1: $100 paid, INV-2: $80 issued)
    expect(summary.totalInvoices).toBe(2);
    expect(summary.paidInvoices).toBe(1);
    expect(summary.totalInvoicedCents).toBe(18000);
    expect(summary.totalInvoiced).toBe(180.0);
    expect(summary.paidRevenueCents).toBe(10000);
    expect(summary.paidRevenue).toBe(100.0);
    expect(summary.paidRate).toBe(50.0);

    // Day 1 has paid revenue
    const day1 = timeline.find((t) => t.date === '2026-10-01');
    expect(day1).toBeDefined();
    expect(day1.totalInvoices).toBe(1);
    expect(day1.paidInvoices).toBe(1);
    expect(day1.paidRevenue).toBe(100.0);

    // Day 2 has issued invoice but 0 paid revenue
    const day2 = timeline.find((t) => t.date === '2026-10-02');
    expect(day2).toBeDefined();
    expect(day2.totalInvoices).toBe(1);
    expect(day2.paidInvoices).toBe(0);
    expect(day2.paidRevenue).toBe(0);
    expect(day2.totalInvoiced).toBe(80.0);
  });

  // --------------------------------------------------------------------------
  // 6. Zero-Data Boundaries & Divide-By-Zero Protection
  // --------------------------------------------------------------------------
  test('13. Zero-data date range produces safe zeros and empty arrays without NaN or Infinity', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/overview?startDate=2020-01-01&endDate=2020-01-02')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { bookings, revenue, disputes, support, topCategories, topProviders } =
      res.body.data;

    // Bookings safe zeros
    expect(bookings.totalBookings).toBe(0);
    expect(bookings.completedBookings).toBe(0);
    expect(bookings.completionRate).toBe(0);
    expect(bookings.cancellationRate).toBe(0);
    expect(Number.isNaN(bookings.completionRate)).toBe(false);
    expect(Number.isFinite(bookings.completionRate)).toBe(true);

    // Revenue safe zeros
    expect(revenue.totalInvoices).toBe(0);
    expect(revenue.paidRevenue).toBe(0);
    expect(revenue.paidRate).toBe(0);
    expect(Number.isNaN(revenue.paidRate)).toBe(false);

    // Disputes & Support safe zeros
    expect(disputes.totalDisputes).toBe(0);
    expect(disputes.resolutionRate).toBe(0);
    expect(support.totalTickets).toBe(0);
    expect(support.resolutionRate).toBe(0);

    // Collections
    expect(topCategories).toEqual([]);
    expect(topProviders).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // 7. Provider Performance Aggregation
  // --------------------------------------------------------------------------
  test('14. Provider performance returns job completion counts, rates, and revenue', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/providers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { providers } = res.body.data;
    expect(providers.length).toBeGreaterThanOrEqual(2);

    // Dave Plumber: 2 jobs (1 completed, 1 cancelled), $100 paid revenue
    const dave = providers.find((p) => p.name === 'Dave Plumber');
    expect(dave).toBeDefined();
    expect(dave.totalJobs).toBe(2);
    expect(dave.completedJobs).toBe(1);
    expect(dave.cancelledJobs).toBe(1);
    expect(dave.completionRate).toBe(50.0);
    expect(dave.revenue).toBe(100.0);
    expect(dave.rating).toBe(4.8);

    // Eve Electric: 1 job (0 completed, 1 in progress), $0 paid revenue
    const eve = providers.find((p) => p.name === 'Eve Electric');
    expect(eve).toBeDefined();
    expect(eve.totalJobs).toBe(1);
    expect(eve.completedJobs).toBe(0);
    expect(eve.completionRate).toBe(0);
    expect(eve.revenue).toBe(0);
  });

  // --------------------------------------------------------------------------
  // 8. Category Demand Aggregation
  // --------------------------------------------------------------------------
  test('15. Category demand groups by service category and sorts descending by demand', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/categories')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { categories } = res.body.data;
    expect(categories.length).toBeGreaterThanOrEqual(2);

    // Plumbing has 2 bookings, Electrical has 1 booking
    expect(categories[0].name).toBe('Plumbing Analytics');
    expect(categories[0].bookingCount).toBe(2);
    expect(categories[0].requestCount).toBe(2);
    expect(categories[0].totalRevenue).toBe(100.0);

    expect(categories[1].name).toBe('Electrical Analytics');
    expect(categories[1].bookingCount).toBe(1);
    expect(categories[1].requestCount).toBe(1);
  });

  // --------------------------------------------------------------------------
  // 9. Dispute Trends Aggregation
  // --------------------------------------------------------------------------
  test('16. Dispute analytics returns status breakdown and resolution metrics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/disputes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data.totalDisputes).toBe(2);
    expect(data.byStatus[DISPUTE_STATUS.OPEN]).toBe(1);
    expect(data.byStatus[DISPUTE_STATUS.RESOLVED]).toBe(1);
    expect(data.resolvedCount).toBe(1);
    expect(data.resolutionRate).toBe(50.0);
    expect(data.refundApprovedCount).toBe(1);
    expect(data.refundAmountTotal).toBe(5000);
  });

  // --------------------------------------------------------------------------
  // 10. Support Ticket Trends Aggregation
  // --------------------------------------------------------------------------
  test('17. Support ticket analytics returns status, priority, and category breakdowns', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/support')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data.totalTickets).toBe(2);
    expect(data.byStatus[SUPPORT_TICKET_STATUS.OPEN]).toBe(1);
    expect(data.byStatus[SUPPORT_TICKET_STATUS.RESOLVED]).toBe(1);
    expect(data.byPriority[SUPPORT_TICKET_PRIORITY.HIGH]).toBe(1);
    expect(data.byPriority[SUPPORT_TICKET_PRIORITY.MEDIUM]).toBe(1);
    expect(data.resolvedCount).toBe(1);
    expect(data.resolutionRate).toBe(50.0);
  });

  // --------------------------------------------------------------------------
  // 11. Admin & Operations Endpoint Consistency
  // --------------------------------------------------------------------------
  test('18. Admin and Operations analytics endpoints produce consistent response payloads', async () => {
    const adminRes = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    const opsRes = await request(app)
      .get('/api/v1/operations/analytics/overview')
      .set('Authorization', `Bearer ${opsToken}`);

    expect(adminRes.status).toBe(200);
    expect(opsRes.status).toBe(200);

    // Validate identical data structures and metric values
    expect(adminRes.body.data.bookings.totalBookings).toBe(
      opsRes.body.data.bookings.totalBookings
    );
    expect(adminRes.body.data.revenue.totalInvoiced).toBe(
      opsRes.body.data.revenue.totalInvoiced
    );
    expect(adminRes.body.data.revenue.paidRevenue).toBe(
      opsRes.body.data.revenue.paidRevenue
    );
    expect(adminRes.body.data.disputes.totalDisputes).toBe(
      opsRes.body.data.disputes.totalDisputes
    );
    expect(adminRes.body.data.support.totalTickets).toBe(
      opsRes.body.data.support.totalTickets
    );
  });
});
