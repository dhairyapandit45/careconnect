/**
 * Integration Test: Milestone 9A - Admin & Operations Backend Foundation
 * Tests server-side RBAC across all 5 roles, user management, provider review,
 * operational inspection of bookings/jobs, dispute & support oversight,
 * platform analytics with MongoDB aggregations, date-range validation,
 * response credential sanitization, and tenant boundary protection.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

const User = require('../src/models/User');
const ServiceCategory = require('../src/models/ServiceCategory');
const ProviderProfile = require('../src/models/ProviderProfile');
const ServiceRequest = require('../src/models/ServiceRequest');
const Quote = require('../src/models/Quote');
const Booking = require('../src/models/Booking');
const Job = require('../src/models/Job');
const Dispute = require('../src/models/Dispute');
const SupportTicket = require('../src/models/SupportTicket');
const Invoice = require('../src/models/Invoice');

const { ROLES } = require('../src/constants/roles');
const {
  USER_STATUS,
  PROVIDER_VERIFICATION_STATUS,
  SERVICE_REQUEST_STATUS,
  QUOTE_STATUS,
  BOOKING_STATUS,
  JOB_STATUS,
  DISPUTE_STATUS,
  SUPPORT_TICKET_STATUS,
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_CATEGORY,
  INVOICE_STATUS,
} = require('../src/constants/status');

let mongoServer;

// Tokens & user references
let adminToken;
let adminUser;

let opsToken;
let opsUser;

let supportToken;
let supportUser;

let customer1Token;
let customer1User;

let customer2Token;
let customer2User;

let provider1Token;
let provider1User;
let provider1Profile;

let provider2Token;
let provider2User;
let provider2Profile;

let testCategory;
let testBooking1;
let testBooking2;
let testBooking3;
let testJob1;
let testJob2;
let testInvoice1;
let testDispute1;
let testTicket1;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Create Platform Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Platform Admin Alice',
    email: 'admin@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = adminRes.body.data.token;
  adminUser = adminRes.body.data.user;

  // 2. Create Operations Manager
  const opsRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Ops Manager Jack',
    email: 'ops@careconnect.local',
    password: 'Password123!',
    role: ROLES.OPERATIONS_MANAGER,
  });
  opsToken = opsRes.body.data.token;
  opsUser = opsRes.body.data.user;

  // 3. Create Support Agent
  const supRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Support Agent Sam',
    email: 'support@careconnect.local',
    password: 'Password123!',
    role: ROLES.SUPPORT_AGENT,
  });
  supportToken = supRes.body.data.token;
  supportUser = supRes.body.data.user;

  // 4. Create Customers
  const c1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Alice Customer',
    email: 'alice.customer@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer1Token = c1Res.body.data.token;
  customer1User = c1Res.body.data.user;

  const c2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Bob Customer',
    email: 'bob.customer@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer2Token = c2Res.body.data.token;
  customer2User = c2Res.body.data.user;

  // 5. Create Service Providers
  const p1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Dave Plumber',
    email: 'dave.provider@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider1Token = p1Res.body.data.token;
  provider1User = p1Res.body.data.user;

  const p2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Eve Electrician',
    email: 'eve.provider@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider2Token = p2Res.body.data.token;
  provider2User = p2Res.body.data.user;

  // Create Category
  testCategory = await ServiceCategory.create({
    name: 'Plumbing Operations',
    slug: 'plumbing-operations',
    description: 'Plumbing services for testing',
    isActive: true,
  });

  // Update Provider Profiles created on registration
  provider1Profile = await ProviderProfile.findOneAndUpdate(
    { user: provider1User._id },
    {
      businessName: 'Dave Plumbing Services',
      description: 'Expert residential plumbing',
      skills: ['Pipe Fitting', 'Leak Repair'],
      serviceCategories: [testCategory._id],
      serviceAreas: [{ city: 'Metropolis', areas: ['Downtown'] }],
      experienceYears: 7,
      hourlyRate: 50,
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      isAvailable: true,
    },
    { new: true, upsert: true }
  );

  provider2Profile = await ProviderProfile.findOneAndUpdate(
    { user: provider2User._id },
    {
      businessName: 'Eve Electric Pro',
      description: 'Electrical and lighting installations',
      skills: ['Wiring', 'Lighting'],
      serviceCategories: [testCategory._id],
      serviceAreas: [{ city: 'Gotham', areas: ['Uptown'] }],
      experienceYears: 4,
      hourlyRate: 65,
      verificationStatus: PROVIDER_VERIFICATION_STATUS.PENDING,
      isAvailable: false,
    },
    { new: true, upsert: true }
  );

  // Create Service Request & Booking 1 (Completed with Job & Paid Invoice)
  const req1 = await ServiceRequest.create({
    customer: customer1User._id,
    category: testCategory._id,
    title: 'Leaking pipe under kitchen sink',
    description: 'Water dripping continuously from pipe connection under sink.',
    status: SERVICE_REQUEST_STATUS.COMPLETED,
    location: { address: '123 Main St', city: 'Metropolis', postalCode: '10001' },
    preferredDate: new Date(),
  });

  const quote1 = await Quote.create({
    serviceRequest: req1._id,
    provider: provider1User._id,
    providerProfile: provider1Profile._id,
    amount: 100,
    estimatedDuration: 2,
    description: 'Standard diagnostic and leak repair service',
    status: QUOTE_STATUS.ACCEPTED,
    validUntil: new Date(Date.now() + 86400000),
  });

  testBooking1 = await Booking.create({
    customer: customer1User._id,
    provider: provider1User._id,
    providerProfile: provider1Profile._id,
    serviceRequest: req1._id,
    quote: quote1._id,
    scheduledStart: new Date(),
    scheduledEnd: new Date(Date.now() + 3600000),
    status: BOOKING_STATUS.COMPLETED,
    price: 100,
  });

  testJob1 = await Job.create({
    booking: testBooking1._id,
    provider: provider1User._id,
    customer: customer1User._id,
    status: JOB_STATUS.COMPLETED,
    completedAt: new Date(),
  });

  testInvoice1 = await Invoice.create({
    invoiceNumber: 'CC-INV-2026-000001',
    booking: testBooking1._id,
    quote: quote1._id,
    customer: customer1User._id,
    provider: provider1User._id,
    job: testJob1._id,
    subtotal: 9000,
    platformFee: 1000,
    tax: 0,
    totalAmount: 10000, // $100.00
    status: INVOICE_STATUS.PAID,
    paidAt: new Date(),
  });

  // Create Booking 2 & Job 2 (In Progress)
  const req2 = await ServiceRequest.create({
    customer: customer2User._id,
    category: testCategory._id,
    title: 'Faucet replacement and fixture upgrade',
    description: 'New faucet installation needed in the guest bathroom.',
    status: SERVICE_REQUEST_STATUS.BOOKED,
    location: { address: '456 Oak Ave', city: 'Metropolis', postalCode: '10002' },
    preferredDate: new Date(),
  });

  const quote2 = await Quote.create({
    serviceRequest: req2._id,
    provider: provider1User._id,
    providerProfile: provider1Profile._id,
    amount: 75,
    estimatedDuration: 1.5,
    description: 'Replacement of single hole faucet with seal test',
    status: QUOTE_STATUS.ACCEPTED,
    validUntil: new Date(Date.now() + 86400000),
  });

  testBooking2 = await Booking.create({
    customer: customer2User._id,
    provider: provider1User._id,
    providerProfile: provider1Profile._id,
    serviceRequest: req2._id,
    quote: quote2._id,
    scheduledStart: new Date(),
    scheduledEnd: new Date(Date.now() + 3600000),
    status: BOOKING_STATUS.IN_PROGRESS,
    price: 75,
  });

  testJob2 = await Job.create({
    booking: testBooking2._id,
    provider: provider1User._id,
    customer: customer2User._id,
    status: JOB_STATUS.IN_PROGRESS,
  });

  // Create Booking 3 (Cancelled)
  const req3 = await ServiceRequest.create({
    customer: customer1User._id,
    category: testCategory._id,
    title: 'Water pressure inspection and valve check',
    description: 'Low pressure in bathroom sink needs proper diagnosis.',
    status: SERVICE_REQUEST_STATUS.CANCELLED,
    location: { address: '123 Main St', city: 'Metropolis', postalCode: '10001' },
    preferredDate: new Date(),
  });

  testBooking3 = await Booking.create({
    customer: customer1User._id,
    provider: provider1User._id,
    providerProfile: provider1Profile._id,
    serviceRequest: req3._id,
    scheduledStart: new Date(),
    scheduledEnd: new Date(Date.now() + 3600000),
    status: BOOKING_STATUS.CANCELLED,
    cancellationReason: 'Customer changed schedule',
    price: 50,
  });

  // Create Dispute 1 (Open)
  testDispute1 = await Dispute.create({
    booking: testBooking2._id,
    job: testJob2._id,
    raisedBy: customer2User._id,
    customer: customer2User._id,
    provider: provider1User._id,
    reason: 'QUALITY_OF_WORK',
    description: 'Job delayed and not satisfactory',
    status: DISPUTE_STATUS.OPEN,
  });

  // Create Support Ticket 1 (Open, High priority)
  testTicket1 = await SupportTicket.create({
    ticketNumber: 'CC-TKT-2026-000001',
    createdBy: customer1User._id,
    customer: customer1User._id,
    subject: 'Billing inquiry regarding invoice',
    description: 'I would like a breakdown of the platform fee',
    category: SUPPORT_TICKET_CATEGORY.PAYMENT,
    priority: SUPPORT_TICKET_PRIORITY.HIGH,
    status: SUPPORT_TICKET_STATUS.OPEN,
    messages: [
      {
        sender: customer1User._id,
        senderRole: ROLES.CUSTOMER,
        message: 'Could you please explain the fee?',
        isInternal: false,
      },
    ],
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Milestone 9A: Admin & Operations Backend Foundation', () => {
  // -------------------------------------------------------------
  // Test 1: Unauthenticated user rejected
  // -------------------------------------------------------------
  test('1. Unauthenticated request to administrative endpoints is rejected with 401', async () => {
    const res1 = await request(app).get('/api/v1/admin/users');
    expect(res1.status).toBe(401);

    const res2 = await request(app).get('/api/v1/admin/stats');
    expect(res2.status).toBe(401);

    const res3 = await request(app).get('/api/v1/operations/bookings');
    expect(res3.status).toBe(401);
  });

  // -------------------------------------------------------------
  // Test 2: CUSTOMER rejected
  // -------------------------------------------------------------
  test('2. CUSTOMER role is rejected with 403 Forbidden across admin & operations routes', async () => {
    const res1 = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(res1.status).toBe(403);

    const res2 = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(res2.status).toBe(403);

    const res3 = await request(app)
      .get('/api/v1/operations/providers')
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(res3.status).toBe(403);
  });

  // -------------------------------------------------------------
  // Test 3: SERVICE_PROVIDER rejected
  // -------------------------------------------------------------
  test('3. SERVICE_PROVIDER role is rejected with 403 Forbidden across admin & operations routes', async () => {
    const res1 = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${provider1Token}`);
    expect(res1.status).toBe(403);

    const res2 = await request(app)
      .get('/api/v1/operations/jobs')
      .set('Authorization', `Bearer ${provider1Token}`);
    expect(res2.status).toBe(403);

    const res3 = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${provider1Token}`);
    expect(res3.status).toBe(403);
  });

  // -------------------------------------------------------------
  // Test 4: SUPPORT_AGENT receives only explicitly permitted access
  // -------------------------------------------------------------
  test('4. SUPPORT_AGENT is permitted for disputes/tickets, but rejected (403) for user mgmt, bookings, jobs, and stats', async () => {
    // Permitted: disputes & tickets
    const disputeRes = await request(app)
      .get('/api/v1/operations/disputes')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(disputeRes.status).toBe(200);

    const ticketRes = await request(app)
      .get('/api/v1/operations/tickets')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(ticketRes.status).toBe(200);

    // Forbidden: users, bookings, jobs, stats, provider verification
    const usersRes = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(usersRes.status).toBe(403);

    const bookingsRes = await request(app)
      .get('/api/v1/operations/bookings')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(bookingsRes.status).toBe(403);

    const jobsRes = await request(app)
      .get('/api/v1/operations/jobs')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(jobsRes.status).toBe(403);

    const statsRes = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(statsRes.status).toBe(403);
  });

  // -------------------------------------------------------------
  // Test 5: OPERATIONS_MANAGER receives appropriate access & restrictions
  // -------------------------------------------------------------
  test('5. OPERATIONS_MANAGER can inspect users/bookings/jobs/stats, but cannot alter PLATFORM_ADMIN account', async () => {
    // Allowed: stats
    const statsRes = await request(app)
      .get('/api/v1/operations/stats')
      .set('Authorization', `Bearer ${opsToken}`);
    expect(statsRes.status).toBe(200);

    // Allowed: list users
    const usersRes = await request(app)
      .get('/api/v1/operations/users')
      .set('Authorization', `Bearer ${opsToken}`);
    expect(usersRes.status).toBe(200);

    // Allowed: update non-admin user status
    const updateCustomerRes = await request(app)
      .patch(`/api/v1/operations/users/${customer2User._id}/status`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ status: USER_STATUS.SUSPENDED, reason: 'Temporary suspension for review' });
    expect(updateCustomerRes.status).toBe(200);
    expect(updateCustomerRes.body.data.user.status).toBe(USER_STATUS.SUSPENDED);

    // Revert status for clean state in subsequent tests
    await User.findByIdAndUpdate(customer2User._id, { status: USER_STATUS.ACTIVE });

    // FORBIDDEN: Cannot alter PLATFORM_ADMIN account status
    const updateAdminRes = await request(app)
      .patch(`/api/v1/operations/users/${adminUser._id}/status`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ status: USER_STATUS.SUSPENDED, reason: 'Unauthorized attempt' });
    expect(updateAdminRes.status).toBe(403);
    expect(updateAdminRes.body.message).toMatch(/cannot modify platform administrator/i);
  });

  // -------------------------------------------------------------
  // Test 6: PLATFORM_ADMIN receives full permitted access
  // -------------------------------------------------------------
  test('6. PLATFORM_ADMIN receives full permitted access across all modules', async () => {
    const resStats = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resStats.status).toBe(200);

    const resUsers = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resUsers.status).toBe(200);

    const resProviders = await request(app)
      .get('/api/v1/admin/providers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resProviders.status).toBe(200);

    const resBookings = await request(app)
      .get('/api/v1/admin/bookings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resBookings.status).toBe(200);

    const resJobs = await request(app)
      .get('/api/v1/admin/jobs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resJobs.status).toBe(200);

    // PLATFORM_ADMIN can modify user status
    const patchRes = await request(app)
      .patch(`/api/v1/admin/users/${customer2User._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: USER_STATUS.ACTIVE, reason: 'Verified account' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.user.status).toBe(USER_STATUS.ACTIVE);
  });

  // -------------------------------------------------------------
  // Test 7: User listing pagination works
  // -------------------------------------------------------------
  test('7. User listing pagination properly limits and calculates metadata', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(2);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(2);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(7);
    expect(res.body.data.pagination.totalPages).toBeGreaterThanOrEqual(4);
  });

  // -------------------------------------------------------------
  // Test 8: Role filtering works
  // -------------------------------------------------------------
  test('8. Role filtering returns only users matching the requested role', async () => {
    const resCustomer = await request(app)
      .get(`/api/v1/admin/users?role=${ROLES.CUSTOMER}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resCustomer.status).toBe(200);
    expect(resCustomer.body.data.items.length).toBe(2);
    resCustomer.body.data.items.forEach((u) => {
      expect(u.role).toBe(ROLES.CUSTOMER);
    });

    const resProvider = await request(app)
      .get(`/api/v1/admin/users?role=${ROLES.SERVICE_PROVIDER}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resProvider.status).toBe(200);
    expect(resProvider.body.data.items.length).toBe(2);
    resProvider.body.data.items.forEach((u) => {
      expect(u.role).toBe(ROLES.SERVICE_PROVIDER);
    });
  });

  // -------------------------------------------------------------
  // Test 9: User search works
  // -------------------------------------------------------------
  test('9. User search matches name and email case-insensitively', async () => {
    const resSearchName = await request(app)
      .get('/api/v1/admin/users?search=Plumber')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resSearchName.status).toBe(200);
    expect(resSearchName.body.data.items.length).toBe(1);
    expect(resSearchName.body.data.items[0].email).toBe('dave.provider@careconnect.local');

    const resSearchEmail = await request(app)
      .get('/api/v1/admin/users?search=ops@careconnect')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resSearchEmail.status).toBe(200);
    expect(resSearchEmail.body.data.items.length).toBe(1);
    expect(resSearchEmail.body.data.items[0].name).toBe('Ops Manager Jack');
  });

  // -------------------------------------------------------------
  // Test 10: Provider operational listing works
  // -------------------------------------------------------------
  test('10. Provider operational listing filters by verificationStatus and supports pagination', async () => {
    const resPending = await request(app)
      .get('/api/v1/operations/providers?verificationStatus=PENDING')
      .set('Authorization', `Bearer ${opsToken}`);

    expect(resPending.status).toBe(200);
    expect(resPending.body.data.items.length).toBe(1);
    expect(resPending.body.data.items[0].businessName).toBe('Eve Electric Pro');

    const resApproved = await request(app)
      .get('/api/v1/operations/providers?verificationStatus=APPROVED')
      .set('Authorization', `Bearer ${opsToken}`);

    expect(resApproved.status).toBe(200);
    expect(resApproved.body.data.items.length).toBe(1);
    expect(resApproved.body.data.items[0].businessName).toBe('Dave Plumbing Services');
  });

  // -------------------------------------------------------------
  // Test 11: Booking operational filtering works
  // -------------------------------------------------------------
  test('11. Booking operational filtering filters by status and participant references', async () => {
    const resCompleted = await request(app)
      .get(`/api/v1/operations/bookings?status=${BOOKING_STATUS.COMPLETED}`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(resCompleted.status).toBe(200);
    expect(resCompleted.body.data.items.length).toBe(1);
    expect(resCompleted.body.data.items[0]._id).toBe(String(testBooking1._id));

    const resCustomer = await request(app)
      .get(`/api/v1/operations/bookings?customer=${customer2User._id}`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(resCustomer.status).toBe(200);
    expect(resCustomer.body.data.items.length).toBe(1);
    expect(resCustomer.body.data.items[0]._id).toBe(String(testBooking2._id));
  });

  // -------------------------------------------------------------
  // Test 12: Job operational filtering works
  // -------------------------------------------------------------
  test('12. Job operational filtering filters by status and participant references', async () => {
    const resInProgress = await request(app)
      .get(`/api/v1/operations/jobs?status=${JOB_STATUS.IN_PROGRESS}`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(resInProgress.status).toBe(200);
    expect(resInProgress.body.data.items.length).toBe(1);
    expect(resInProgress.body.data.items[0]._id).toBe(String(testJob2._id));

    const resProvider = await request(app)
      .get(`/api/v1/operations/jobs?provider=${provider1User._id}`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(resProvider.status).toBe(200);
    expect(resProvider.body.data.items.length).toBe(2);
  });

  // -------------------------------------------------------------
  // Test 13: Dispute operational listing works
  // -------------------------------------------------------------
  test('13. Dispute operational listing returns disputes for staff review', async () => {
    const res = await request(app)
      .get(`/api/v1/operations/disputes?status=${DISPUTE_STATUS.OPEN}`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0]._id).toBe(String(testDispute1._id));
    expect(res.body.data.items[0].reason).toBe('QUALITY_OF_WORK');
  });

  // -------------------------------------------------------------
  // Test 14: Support ticket operational listing works
  // -------------------------------------------------------------
  test('14. Support ticket operational listing returns tickets with priority filter', async () => {
    const res = await request(app)
      .get(`/api/v1/operations/tickets?priority=${SUPPORT_TICKET_PRIORITY.HIGH}`)
      .set('Authorization', `Bearer ${supportToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].ticketNumber).toBe('CC-TKT-2026-000001');
    expect(res.body.data.items[0].priority).toBe(SUPPORT_TICKET_PRIORITY.HIGH);
  });

  // -------------------------------------------------------------
  // Test 15: Statistics endpoint returns correct aggregates
  // -------------------------------------------------------------
  test('15. Platform statistics endpoint accurately aggregates user, job, dispute, and revenue metrics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const stats = res.body.data;

    // Users
    expect(stats.totalUsers).toBeGreaterThanOrEqual(7);
    expect(stats.customers).toBe(2);
    expect(stats.serviceProviders).toBe(2);
    expect(stats.supportAgents).toBe(1);

    // Providers
    expect(stats.activeProviders).toBe(1); // Dave is APPROVED & isAvailable: true
    expect(stats.pendingProviderVerification).toBe(1); // Eve is PENDING

    // Bookings
    expect(stats.totalBookings).toBe(3);
    expect(stats.completedBookings).toBe(1);
    expect(stats.cancelledBookings).toBe(1);

    // Jobs
    expect(stats.activeJobs).toBe(1); // testJob2 is IN_PROGRESS

    // Disputes & Tickets
    expect(stats.openDisputes).toBe(1); // testDispute1 is OPEN
    expect(stats.unresolvedSupportTickets).toBe(1); // testTicket1 is OPEN

    // Invoices & Revenue
    expect(stats.totalInvoices).toBe(1);
    expect(stats.paidInvoices).toBe(1);
    expect(stats.totalRevenueCents).toBe(10000);
    expect(stats.totalRevenue).toBe(100.0);
  });

  // -------------------------------------------------------------
  // Test 16: Date range validation works
  // -------------------------------------------------------------
  test('16. Date range query parameters are validated strictly', async () => {
    // Valid date range
    const validRes = await request(app)
      .get('/api/v1/admin/stats?startDate=2026-01-01&endDate=2026-12-31')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(validRes.status).toBe(200);
    expect(validRes.body.data.dateRange.startDate).toBe('2026-01-01');

    // Invalid date string
    const invalidDateRes = await request(app)
      .get('/api/v1/admin/stats?startDate=not-a-valid-date')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(invalidDateRes.status).toBe(422);

    // startDate greater than endDate
    const invertedRes = await request(app)
      .get('/api/v1/admin/stats?startDate=2026-12-31&endDate=2026-01-01')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(invertedRes.status).toBe(422);
    expect(invertedRes.body.message).toMatch(/validation failed/i);
  });

  // -------------------------------------------------------------
  // Test 17: Sensitive fields are not exposed
  // -------------------------------------------------------------
  test('17. User responses and populated models never expose passwordHash or internal security keys', async () => {
    const listRes = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    listRes.body.data.items.forEach((user) => {
      expect(user.passwordHash).toBeUndefined();
      expect(user.password).toBeUndefined();
      expect(user.__v).toBeUndefined();
    });

    const singleRes = await request(app)
      .get(`/api/v1/admin/users/${customer1User._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(singleRes.status).toBe(200);
    expect(singleRes.body.data.user.passwordHash).toBeUndefined();
    expect(singleRes.body.data.user.password).toBeUndefined();
    expect(singleRes.body.data.user.__v).toBeUndefined();
  });

  // -------------------------------------------------------------
  // Test 18: Cross-tenant / private data boundaries remain protected
  // -------------------------------------------------------------
  test('18. Customer cannot access operations endpoints to inspect cross-tenant bookings or jobs', async () => {
    // Attempting to list all bookings through operations API
    const bookingRes = await request(app)
      .get('/api/v1/operations/bookings')
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(bookingRes.status).toBe(403);

    // Attempting to list all jobs through operations API
    const jobRes = await request(app)
      .get('/api/v1/operations/jobs')
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(jobRes.status).toBe(403);

    // Attempting to view another customer's ticket through operations API
    const ticketRes = await request(app)
      .get(`/api/v1/operations/tickets/${testTicket1._id}`)
      .set('Authorization', `Bearer ${customer2Token}`);
    expect(ticketRes.status).toBe(403);
  });
});
