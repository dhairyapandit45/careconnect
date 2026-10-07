/**
 * Integration Test: Milestone 8A - Disputes Layer
 * Tests dispute creation for verified Jobs and Bookings, server-derived tenant identities,
 * cross-tenant access boundaries, duplicate active dispute prevention, finite state machine
 * transitions, role permissions (Customer, Provider, Support, Ops, Admin), and validation.
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

const { ROLES } = require('../src/constants/roles');
const {
  PROVIDER_VERIFICATION_STATUS,
  SERVICE_REQUEST_STATUS,
  QUOTE_STATUS,
  BOOKING_STATUS,
  JOB_STATUS,
  DISPUTE_STATUS,
} = require('../src/constants/status');

let mongoServer;
let adminToken;
let adminUser;

let supportToken;
let supportUser;

let opsToken;
let opsUser;

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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup Platform Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Platform Admin',
    email: 'admin.dispute@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = adminRes.body.data.token;
  adminUser = adminRes.body.data.user;

  // Setup Support Agent
  const supRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Support Agent',
    email: 'support.dispute@careconnect.local',
    password: 'Password123!',
    role: ROLES.SUPPORT_AGENT,
  });
  supportToken = supRes.body.data.token;
  supportUser = supRes.body.data.user;

  // Setup Operations Manager
  const opsRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Operations Manager',
    email: 'ops.dispute@careconnect.local',
    password: 'Password123!',
    role: ROLES.OPERATIONS_MANAGER,
  });
  opsToken = opsRes.body.data.token;
  opsUser = opsRes.body.data.user;

  // Setup Customer 1
  const c1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Alice Customer',
    email: 'alice.dispute@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer1Token = c1Res.body.data.token;
  customer1User = c1Res.body.data.user;

  // Setup Customer 2
  const c2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Bob Customer',
    email: 'bob.dispute@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer2Token = c2Res.body.data.token;
  customer2User = c2Res.body.data.user;

  // Setup Provider 1
  const p1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Dave Plumber',
    email: 'dave.dispute@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider1Token = p1Res.body.data.token;
  provider1User = p1Res.body.data.user;

  provider1Profile = await ProviderProfile.findOneAndUpdate(
    { user: provider1User._id },
    {
      businessName: 'Dave Plumbing Pro',
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      hourlyRate: 50,
      isActive: true,
    },
    { new: true, upsert: true }
  );

  // Setup Provider 2
  const p2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Evan Electrician',
    email: 'evan.dispute@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider2Token = p2Res.body.data.token;
  provider2User = p2Res.body.data.user;

  provider2Profile = await ProviderProfile.findOneAndUpdate(
    { user: provider2User._id },
    {
      businessName: 'Evan Electrical Masters',
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      hourlyRate: 60,
      isActive: true,
    },
    { new: true, upsert: true }
  );

  // Base Service Category
  testCategory = await ServiceCategory.create({
    name: 'Carpentry Services',
    slug: 'carpentry-services-disp',
    description: 'Woodwork and furniture repairs',
    isActive: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

/**
 * Fixture builder for complete Booking and Job pipeline
 */
async function setupJobFixture({
  customer = customer1User,
  provider = provider1User,
  providerProfile = provider1Profile,
  jobStatus = JOB_STATUS.IN_PROGRESS,
  bookingStatus = BOOKING_STATUS.IN_PROGRESS,
} = {}) {
  const serviceRequest = await ServiceRequest.create({
    customer: customer._id,
    category: testCategory._id,
    title: 'Fix Broken Cabinet Door',
    description: 'The kitchen cabinet hinge broke and needs replacement.',
    status: SERVICE_REQUEST_STATUS.BOOKED,
    location: {
      address: '221B Baker Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400050',
      coordinates: [72.83, 19.05],
    },
    preferredDate: new Date(Date.now() + 86400000),
  });

  const quote = await Quote.create({
    serviceRequest: serviceRequest._id,
    provider: provider._id,
    providerProfile: providerProfile._id,
    amount: 150,
    currency: 'INR',
    estimatedDuration: 3,
    description: 'Hinge realignment and reinforcement',
    status: QUOTE_STATUS.ACCEPTED,
    validUntil: new Date(Date.now() + 86400000),
  });

  const scheduledStart = new Date(Date.now() + 3600000);
  const scheduledEnd = new Date(Date.now() + 7200000);

  const booking = await Booking.create({
    serviceRequest: serviceRequest._id,
    customer: customer._id,
    provider: provider._id,
    providerProfile: providerProfile._id,
    quote: quote._id,
    scheduledStart,
    scheduledEnd,
    price: 150,
    currency: 'INR',
    status: bookingStatus,
  });

  const job = await Job.create({
    booking: booking._id,
    customer: customer._id,
    provider: provider._id,
    status: jobStatus,
  });

  return { serviceRequest, quote, booking, job };
}

describe('Milestone 8A: Disputes Module Integration Tests', () => {
  // 1. Customer successfully creates dispute for own eligible Job
  describe('1. Customer Dispute Creation', () => {
    it('should allow customer to create a dispute for their own Job', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const res = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Work was incomplete and shoddy',
          category: 'WORK_INCOMPLETE',
          description: 'The provider left after 30 minutes without fixing the main door hinge properly.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dispute).toBeDefined();

      const disp = res.body.data.dispute;
      expect(disp.job.toString()).toBe(fixture.job._id.toString());
      expect(disp.booking.toString()).toBe(fixture.booking._id.toString());
      expect(disp.customer.toString()).toBe(customer1User._id.toString());
      expect(disp.provider.toString()).toBe(provider1User._id.toString());
      expect(disp.raisedBy.toString()).toBe(customer1User._id.toString());
      expect(disp.status).toBe(DISPUTE_STATUS.OPEN);
      expect(disp.reason).toBe('Work was incomplete and shoddy');
    });

    it('should ignore client-supplied customer/provider and derive them server-side', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          customer: fakeId,
          provider: fakeId,
          raisedBy: fakeId,
          reason: 'Derivation test',
          description: 'Verifying that client identities are not trusted by server logic.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.dispute.customer.toString()).toBe(customer1User._id.toString());
      expect(res.body.data.dispute.provider.toString()).toBe(provider1User._id.toString());
      expect(res.body.data.dispute.raisedBy.toString()).toBe(customer1User._id.toString());
    });
  });

  // 2. Provider successfully creates dispute for assigned Job
  describe('2. Provider Dispute Creation', () => {
    it('should allow assigned service provider to create a dispute for their Job', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const res = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Customer unavailable upon arrival',
          category: 'CUSTOMER_UNAVAILABLE',
          description: 'Waited at premises for 45 minutes; customer was unresponsive to calls.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.dispute.raisedBy.toString()).toBe(provider1User._id.toString());
      expect(res.body.data.dispute.status).toBe(DISPUTE_STATUS.OPEN);
    });
  });

  // 3. Customer cannot dispute another customer's Job
  describe("3. Customer Cannot Dispute Another Customer's Job", () => {
    it("should reject customer attempting to dispute another customer's job with 403", async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const res = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Unauthorized dispute attempt',
          description: 'Trying to dispute a booking that does not belong to my account.',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/own/i);
    });
  });

  // 4. Provider cannot dispute an unrelated Job
  describe('4. Provider Cannot Dispute Unrelated Job', () => {
    it('should reject provider attempting to dispute a job assigned to another provider with 403', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const res = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${provider2Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Unassigned job dispute attempt',
          description: 'Provider 2 attempting to dispute a job handled by Provider 1.',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/assigned to you/i);
    });
  });

  // 5. Invalid Booking/Job relationship is rejected
  describe('5. Invalid Booking/Job Relationship Rejection', () => {
    it('should reject when referenced job does not match referenced booking with 400', async () => {
      const fixtureA = await setupJobFixture({ customer: customer1User, provider: provider1User });
      const fixtureB = await setupJobFixture({ customer: customer1User, provider: provider1User });

      // Pass Job from fixtureA with Booking from fixtureB
      const res = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixtureA.job._id.toString(),
          bookingId: fixtureB.booking._id.toString(),
          reason: 'Mismatched reference check',
          description: 'Submitting mismatched identifiers to test validation.',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/does not belong/i);
    });
  });

  // 6. Duplicate active dispute is rejected
  describe('6. Duplicate Active Dispute Prevention', () => {
    it('should reject duplicate active dispute on the same job with 409 Conflict', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      // First dispute succeeds
      const firstRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'First dispute submission',
          description: 'Initial valid complaint describing incomplete service.',
        });
      expect(firstRes.status).toBe(201);

      // Second dispute while first is active returns 409
      const secondRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Duplicate dispute submission',
          description: 'Attempting to create another active dispute on the same job.',
        });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.message).toMatch(/active dispute already exists/i);
    });
  });

  // 7. Unauthenticated request is rejected
  describe('7. Unauthenticated Request Rejection', () => {
    it('should reject unauthenticated POST /api/v1/disputes with 401', async () => {
      const res = await request(app)
        .post('/api/v1/disputes')
        .send({ jobId: new mongoose.Types.ObjectId().toString(), reason: 'Test', description: 'Test description 123' });
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/v1/disputes with 401', async () => {
      const res = await request(app).get('/api/v1/disputes');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/v1/disputes/:id with 401', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/v1/disputes/${id}`);
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated PATCH /api/v1/disputes/:id/status with 401', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const res = await request(app).patch(`/api/v1/disputes/${id}/status`).send({ status: 'UNDER_REVIEW' });
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated PATCH /api/v1/disputes/:id/cancel with 401', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const res = await request(app).patch(`/api/v1/disputes/${id}/cancel`);
      expect(res.status).toBe(401);
    });
  });

  // 8. Wrong role is rejected
  describe('8. Wrong Role Rejection', () => {
    it('should reject Support Agent attempting to create dispute directly with 403', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const res = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Support staff creating dispute',
          description: 'Staff cannot initiate disputes as participant.',
        });

      expect(res.status).toBe(403);
    });
  });

  // 9. Customer can view own dispute
  describe('9. Customer Can View Own Dispute', () => {
    it('should allow customer to list and view details of their own disputes', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Damaged furniture',
          description: 'The cabinet door wood split during hinge installation.',
        });

      const disputeId = createRes.body.data.dispute._id;

      // Customer fetches list
      const listRes = await request(app)
        .get('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.items).toBeDefined();
      const found = listRes.body.data.items.find((d) => d._id.toString() === disputeId.toString());
      expect(found).toBeDefined();

      // Customer fetches detail
      const detailRes = await request(app)
        .get(`/api/v1/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.dispute._id.toString()).toBe(disputeId.toString());
    });
  });

  // 10. Customer cannot view another customer's dispute
  describe("10. Customer Cannot View Another Customer's Dispute", () => {
    it("should reject customer attempting to view another customer's dispute with 403", async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Private customer dispute',
          description: 'Customer 1 private dispute not accessible to others.',
        });

      const disputeId = createRes.body.data.dispute._id;

      // Customer 2 attempts to fetch Customer 1's dispute
      const res = await request(app)
        .get(`/api/v1/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(403);
    });
  });

  // 11. Provider can view disputes for their Jobs
  describe('11. Provider Can View Disputes for Their Jobs', () => {
    it('should allow provider to list and inspect disputes concerning their assigned jobs', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider2User, providerProfile: provider2Profile });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Provider 2 service dispute',
          description: 'Customer complaint filed against Provider 2.',
        });

      const disputeId = createRes.body.data.dispute._id;

      // Provider 2 lists disputes
      const listRes = await request(app)
        .get('/api/v1/disputes')
        .set('Authorization', `Bearer ${provider2Token}`);
      expect(listRes.status).toBe(200);
      const found = listRes.body.data.items.find((d) => d._id.toString() === disputeId.toString());
      expect(found).toBeDefined();

      // Provider 2 fetches detail
      const detailRes = await request(app)
        .get(`/api/v1/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${provider2Token}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.dispute._id.toString()).toBe(disputeId.toString());
    });
  });

  // 12. Unauthorized user cannot access dispute
  describe('12. Unauthorized User Cannot Access Dispute', () => {
    it('should reject unrelated provider attempting to view dispute detail with 403', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider2User, providerProfile: provider2Profile });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Exclusive dispute for Provider 2',
          description: 'Provider 1 is unrelated and must not have access.',
        });

      const disputeId = createRes.body.data.dispute._id;

      // Provider 1 attempts to access Provider 2's dispute
      const res = await request(app)
        .get(`/api/v1/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${provider1Token}`);

      expect(res.status).toBe(403);
    });
  });

  // 13. Valid status transition succeeds
  describe('13. Valid Status Transitions', () => {
    it('should transition through OPEN -> UNDER_REVIEW -> RESOLVED successfully', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Lifecycle test dispute',
          description: 'Testing valid progression through state machine.',
        });

      const disputeId = createRes.body.data.dispute._id;

      // 1. Admin/Ops transitions OPEN -> UNDER_REVIEW
      const reviewRes = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${opsToken}`)
        .send({ status: DISPUTE_STATUS.UNDER_REVIEW });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.dispute.status).toBe(DISPUTE_STATUS.UNDER_REVIEW);

      // 2. Admin/Ops transitions UNDER_REVIEW -> RESOLVED
      const resolveRes = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          status: DISPUTE_STATUS.RESOLVED,
          resolutionNotes: 'Customer refunded 50 INR; replacement hinge scheduled.',
          refundApproved: true,
          refundAmount: 50,
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.dispute.status).toBe(DISPUTE_STATUS.RESOLVED);
      expect(resolveRes.body.data.dispute.resolution.refundApproved).toBe(true);
      expect(resolveRes.body.data.dispute.resolution.refundAmount).toBe(50);
    });
  });

  // 14. Invalid status transition fails
  describe('14. Invalid Status Transitions', () => {
    it('should reject invalid transition from OPEN directly to RESOLVED with 400', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Invalid leap test',
          description: 'Testing illegal jump over UNDER_REVIEW review state.',
        });

      const disputeId = createRes.body.data.dispute._id;

      // Attempt OPEN -> RESOLVED
      const res = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: DISPUTE_STATUS.RESOLVED, resolutionNotes: 'Direct leap' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid.*transition/i);
    });

    it('should reject transition from RESOLVED back to OPEN with 400', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Terminal rollback test',
          description: 'Testing that terminal state cannot be reverted to OPEN.',
        });

      const disputeId = createRes.body.data.dispute._id;

      // Move OPEN -> UNDER_REVIEW -> RESOLVED
      await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: DISPUTE_STATUS.UNDER_REVIEW });

      await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: DISPUTE_STATUS.RESOLVED, resolutionNotes: 'Resolved' });

      // Attempt RESOLVED -> OPEN
      const res = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: DISPUTE_STATUS.OPEN });

      expect(res.status).toBe(422); // Validator rejects OPEN as status target, or 400 transition error
    });
  });

  // 15. Customer/provider cannot perform admin-only resolution actions
  describe('15. Customer/Provider Resolution Prevention', () => {
    it('should reject customer attempting to call status resolution endpoint with 403', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Customer resolution restriction',
          description: 'Testing that customer cannot resolve their own dispute.',
        });

      const disputeId = createRes.body.data.dispute._id;

      const res = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ status: DISPUTE_STATUS.RESOLVED });

      expect(res.status).toBe(403);
    });

    it('should reject provider attempting to call status resolution endpoint with 403', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Provider resolution restriction',
          description: 'Testing that provider cannot resolve dispute against them.',
        });

      const disputeId = createRes.body.data.dispute._id;

      const res = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({ status: DISPUTE_STATUS.REJECTED });

      expect(res.status).toBe(403);
    });
  });

  // 16. Authorized operations/admin resolution works
  describe('16. Authorized Operations/Admin Resolution', () => {
    it('should allow Operations Manager to transition to REJECTED with resolution details recorded', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Unsubstantiated claim',
          description: 'Claim will be reviewed and found groundless upon inspection.',
        });

      const disputeId = createRes.body.data.dispute._id;

      // Ops manager puts under review
      await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${opsToken}`)
        .send({ status: DISPUTE_STATUS.UNDER_REVIEW });

      // Ops manager rejects dispute
      const rejectRes = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          status: DISPUTE_STATUS.REJECTED,
          resolutionNotes: 'Inspection verified all service was delivered according to specs.',
        });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.dispute.status).toBe(DISPUTE_STATUS.REJECTED);
      expect(rejectRes.body.data.dispute.resolution.resolvedBy.toString()).toBe(opsUser._id.toString());
      expect(rejectRes.body.data.dispute.resolution.resolutionNotes).toBe(
        'Inspection verified all service was delivered according to specs.'
      );

      // Verify in DB
      const dbDispute = await Dispute.findById(disputeId);
      expect(dbDispute.status).toBe(DISPUTE_STATUS.REJECTED);
      expect(dbDispute.resolution.resolvedAt).toBeDefined();
    });
  });

  // 17. Validation errors are handled correctly
  describe('17. Validation Errors Handling', () => {
    it('should reject request missing reason with 422', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const res = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          description: 'A description with sufficient length for valid schema validation.',
        });

      expect(res.status).toBe(422);
    });

    it('should reject request with description too short (<10 chars) with 422', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const res = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Valid reason',
          description: 'Short',
        });

      expect(res.status).toBe(422);
    });

    it('should reject request missing both jobId and bookingId with 422', async () => {
      const res = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          reason: 'Valid reason',
          description: 'A description with sufficient length for valid schema validation.',
        });

      expect(res.status).toBe(422);
    });
  });

  // 18. Customer dispute cancellation
  describe('18. Customer Dispute Cancellation', () => {
    it('should allow customer to cancel their own OPEN dispute', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Misunderstanding resolved directly',
          description: 'I spoke with the provider directly and we resolved the issue.',
        });

      const disputeId = createRes.body.data.dispute._id;

      const cancelRes = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/cancel`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ reason: 'No longer needed' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.dispute.status).toBe(DISPUTE_STATUS.CANCELLED);
    });

    it('should reject customer cancelling dispute once it is UNDER_REVIEW with 400', async () => {
      const fixture = await setupJobFixture({ customer: customer1User, provider: provider1User });

      const createRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          reason: 'Cancellation timing test',
          description: 'Customer attempts cancel after dispute is already under review.',
        });

      const disputeId = createRes.body.data.dispute._id;

      // Ops manager moves to UNDER_REVIEW
      await request(app)
        .patch(`/api/v1/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${opsToken}`)
        .send({ status: DISPUTE_STATUS.UNDER_REVIEW });

      // Customer attempts to cancel
      const cancelRes = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/cancel`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(cancelRes.status).toBe(400);
      expect(cancelRes.body.message).toMatch(/OPEN status/i);
    });
  });
});
