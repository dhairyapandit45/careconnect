/**
 * Integration Test: Milestone 7 - Reviews & Ratings Layer
 * Tests review submission for verified completed jobs, server-derived provider relations,
 * strict rating validation, customer ownership, duplicate prevention, RBAC access boundaries,
 * review updates, admin moderation, and provider profile rating/reviewCount aggregation.
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
const Review = require('../src/models/Review');

const { ROLES } = require('../src/constants/roles');
const {
  PROVIDER_VERIFICATION_STATUS,
  SERVICE_REQUEST_STATUS,
  QUOTE_STATUS,
  BOOKING_STATUS,
  JOB_STATUS,
} = require('../src/constants/status');

let mongoServer;
let adminToken;
let adminUser;

let customer1Token;
let customer1User;

let customer2Token;
let customer2User;

let customer3Token;
let customer3User;

let provider1Token;
let provider1User;
let provider1Profile;

let provider2Token;
let provider2User;
let provider2Profile;

let supportToken;
let supportUser;

let testCategory;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup Platform Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Platform Admin',
    email: 'admin.review@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = adminRes.body.data.token;
  adminUser = adminRes.body.data.user;

  // Setup Customer 1
  const c1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Alice Customer',
    email: 'alice.review@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer1Token = c1Res.body.data.token;
  customer1User = c1Res.body.data.user;

  // Setup Customer 2
  const c2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Bob Customer',
    email: 'bob.review@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer2Token = c2Res.body.data.token;
  customer2User = c2Res.body.data.user;

  // Setup Customer 3
  const c3Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Charlie Customer',
    email: 'charlie.review@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer3Token = c3Res.body.data.token;
  customer3User = c3Res.body.data.user;

  // Setup Provider 1
  const p1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Dave Plumber',
    email: 'dave.provider@careconnect.local',
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
      rating: 0,
      reviewCount: 0,
      isActive: true,
    },
    { new: true, upsert: true }
  );

  // Setup Provider 2
  const p2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Evan Electrician',
    email: 'evan.provider@careconnect.local',
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
      rating: 0,
      reviewCount: 0,
      isActive: true,
    },
    { new: true, upsert: true }
  );

  // Setup Support Agent
  const supRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Support Agent',
    email: 'support.review@careconnect.local',
    password: 'Password123!',
    role: ROLES.SUPPORT_AGENT,
  });
  supportToken = supRes.body.data.token;
  supportUser = supRes.body.data.user;

  // Setup Base Category
  testCategory = await ServiceCategory.create({
    name: 'Home Repairs',
    slug: 'home-repairs-rev',
    description: 'General domestic maintenance and repairs',
    isActive: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

/**
 * Fixture helper to create a Job with associated Booking, Quote, and ServiceRequest
 */
async function setupJobFixture({
  customer = customer1User,
  provider = provider1User,
  providerProfile = provider1Profile,
  status = JOB_STATUS.COMPLETED,
} = {}) {
  const serviceRequest = await ServiceRequest.create({
    customer: customer._id,
    category: testCategory._id,
    title: 'Repair Pipe Leak',
    description: 'Kitchen sink pipe has a significant leakage.',
    status: SERVICE_REQUEST_STATUS.BOOKED,
    location: {
      address: '101 Marine Lines',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400020',
      coordinates: [72.82, 18.94],
    },
    preferredDate: new Date(Date.now() + 86400000),
  });

  const quote = await Quote.create({
    serviceRequest: serviceRequest._id,
    provider: provider._id,
    providerProfile: providerProfile._id,
    amount: 120,
    currency: 'INR',
    estimatedDuration: 2,
    description: 'Fix sink pipe connection and seal joints',
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
    price: 120,
    currency: 'INR',
    status: BOOKING_STATUS.CONFIRMED,
  });

  const job = await Job.create({
    booking: booking._id,
    customer: customer._id,
    provider: provider._id,
    status,
    completedAt: status === JOB_STATUS.COMPLETED ? new Date() : undefined,
  });

  return { serviceRequest, quote, booking, job };
}

describe('Milestone 7: Reviews & Ratings Integration Tests', () => {
  // Scenario 1: Successful review creation on completed job
  describe('1. Successful Review Creation on Completed Job', () => {
    it('should successfully submit a review for a completed job', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider1User,
        providerProfile: provider1Profile,
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 5,
          comment: 'Outstanding plumbing work! Arrived on time and solved the issue quickly.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.review).toBeDefined();

      const rev = res.body.data.review;
      expect(rev.job.toString()).toBe(fixture.job._id.toString());
      expect(rev.booking.toString()).toBe(fixture.booking._id.toString());
      expect(rev.customer.toString()).toBe(customer1User._id.toString());
      expect(rev.provider.toString()).toBe(provider1User._id.toString());
      expect(rev.providerProfile.toString()).toBe(provider1Profile._id.toString());
      expect(rev.rating).toBe(5);
      expect(rev.comment).toBe(
        'Outstanding plumbing work! Arrived on time and solved the issue quickly.'
      );
    });

    it('should correctly derive provider and providerProfile from Job and Booking, ignoring untrusted client input', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider1User,
        providerProfile: provider1Profile,
      });

      const fakeProviderId = new mongoose.Types.ObjectId().toString();
      const fakeProviderProfileId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          provider: fakeProviderId,
          providerProfile: fakeProviderProfileId,
          rating: 4,
          comment: 'Derivation verification test',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.review.provider.toString()).toBe(provider1User._id.toString());
      expect(res.body.data.review.provider.toString()).not.toBe(fakeProviderId);
      expect(res.body.data.review.providerProfile.toString()).toBe(
        provider1Profile._id.toString()
      );
    });

    it('should allow review submission referencing bookingId instead of jobId', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider1User,
        providerProfile: provider1Profile,
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          bookingId: fixture.booking._id.toString(),
          rating: 4,
          comment: 'Submitted via booking reference',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.review.job.toString()).toBe(fixture.job._id.toString());
    });
  });

  // Scenario 2: Rating validation
  describe('2. Rating Validation (Strictly Integers 1–5)', () => {
    it('should reject a rating less than 1 (0)', async () => {
      const fixture = await setupJobFixture({ customer: customer1User });
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 0,
        });

      expect(res.status).toBe(422);
    });

    it('should reject a rating greater than 5 (6)', async () => {
      const fixture = await setupJobFixture({ customer: customer1User });
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 6,
        });

      expect(res.status).toBe(422);
    });

    it('should reject a floating-point rating (4.5)', async () => {
      const fixture = await setupJobFixture({ customer: customer1User });
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 4.5,
        });

      expect(res.status).toBe(422);
    });

    it('should reject a string rating ("5")', async () => {
      const fixture = await setupJobFixture({ customer: customer1User });
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: '5',
        });

      expect(res.status).toBe(422);
    });

    it('should reject request missing rating', async () => {
      const fixture = await setupJobFixture({ customer: customer1User });
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          comment: 'Good work',
        });

      expect(res.status).toBe(422);
    });
  });

  // Scenario 3: Optional comment support
  describe('3. Optional Comment Support', () => {
    it('should accept review without a comment field', async () => {
      const fixture = await setupJobFixture({ customer: customer1User });
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.review.comment).toBe('');
    });

    it('should accept review with empty string comment', async () => {
      const fixture = await setupJobFixture({ customer: customer1User });
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 4,
          comment: '',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.review.comment).toBe('');
    });

    it('should reject review with comment exceeding 1000 characters', async () => {
      const fixture = await setupJobFixture({ customer: customer1User });
      const longComment = 'A'.repeat(1001);
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 4,
          comment: longComment,
        });

      expect(res.status).toBe(422);
    });
  });

  // Scenario 4: Completed job requirement
  describe('4. Completed Job Requirement', () => {
    it('should reject review for a job with status ASSIGNED', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        status: JOB_STATUS.ASSIGNED,
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/completed/i);
    });

    it('should reject review for a job with status IN_PROGRESS', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        status: JOB_STATUS.IN_PROGRESS,
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/completed/i);
    });

    it('should reject review for a job with status CANCELLED', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        status: JOB_STATUS.CANCELLED,
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/completed/i);
    });
  });

  // Scenario 5: Customer ownership requirement
  describe('5. Customer Ownership Requirement', () => {
    it("should reject customer attempting to review another customer's completed job", async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        status: JOB_STATUS.COMPLETED,
      });

      // Customer 2 attempts to review Customer 1's job
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 5,
          comment: 'Trying to review someone else job',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/own/i);
    });
  });

  // Scenario 6: Duplicate review prevention
  describe('6. Duplicate Review Prevention (Idempotency)', () => {
    it('should reject duplicate review for the same job with 409 Conflict', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        status: JOB_STATUS.COMPLETED,
      });

      // First submission succeeds
      const firstRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 4,
          comment: 'First review',
        });
      expect(firstRes.status).toBe(201);

      // Second submission must return 409 Conflict
      const secondRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 5,
          comment: 'Duplicate review attempt',
        });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.message).toMatch(/already.*submitted/i);
    });
  });

  // Scenario 7: Unauthorized and unauthenticated access
  describe('7. Unauthorized and Unauthenticated Rejection', () => {
    it('should reject unauthenticated POST /api/v1/reviews with 401', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .send({ jobId: new mongoose.Types.ObjectId().toString(), rating: 5 });
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/v1/reviews with 401', async () => {
      const res = await request(app).get('/api/v1/reviews');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/v1/reviews/:id with 401', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/v1/reviews/${id}`);
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated PATCH /api/v1/reviews/:id with 401', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const res = await request(app).patch(`/api/v1/reviews/${id}`).send({ rating: 4 });
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated DELETE /api/v1/reviews/:id with 401', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const res = await request(app).delete(`/api/v1/reviews/${id}`);
      expect(res.status).toBe(401);
    });
  });

  // Scenario 8: Provider cannot create reviews
  describe('8. Provider Cannot Create Reviews', () => {
    it('should reject a service provider attempting to create a review', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider1User,
        status: JOB_STATUS.COMPLETED,
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 5,
          comment: 'Provider reviewing own job',
        });

      expect(res.status).toBe(403);
    });
  });

  // Scenario 9: Provider can view reviews belonging to them
  describe('9. Provider Can View Reviews Received For Them', () => {
    it('should allow provider to list received reviews', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider2User,
        providerProfile: provider2Profile,
        status: JOB_STATUS.COMPLETED,
      });

      await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 5,
          comment: 'Great work from Provider 2',
        });

      const res = await request(app)
        .get('/api/v1/reviews/provider')
        .set('Authorization', `Bearer ${provider2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);

      const found = res.body.data.items.find(
        (r) => r.job.toString() === fixture.job._id.toString() || r.job._id?.toString() === fixture.job._id.toString()
      );
      expect(found).toBeDefined();
      expect(found.rating).toBe(5);
    });

    it('should allow provider to fetch detail of a review belonging to them', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider2User,
        providerProfile: provider2Profile,
        status: JOB_STATUS.COMPLETED,
      });

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 4,
          comment: 'Very professional',
        });

      const reviewId = createRes.body.data.review._id;

      const res = await request(app)
        .get(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${provider2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.review._id.toString()).toBe(reviewId.toString());
      expect(res.body.data.review.rating).toBe(4);
    });

    it("should reject a provider attempting to access another provider's review detail", async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider2User,
        providerProfile: provider2Profile,
        status: JOB_STATUS.COMPLETED,
      });

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 5,
          comment: 'Provider 2 exclusive review',
        });

      const reviewId = createRes.body.data.review._id;

      // Provider 1 tries to access Provider 2's review
      const res = await request(app)
        .get(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${provider1Token}`);

      expect(res.status).toBe(403);
    });
  });

  // Scenario 10: Customer can view their own reviews
  describe('10. Customer Can View Their Own Reviews', () => {
    it('should allow customer to list reviews submitted by them', async () => {
      const fixture = await setupJobFixture({
        customer: customer2User,
        provider: provider1User,
        providerProfile: provider1Profile,
        status: JOB_STATUS.COMPLETED,
      });

      await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 4,
          comment: 'Good effort by Dave',
        });

      const res = await request(app)
        .get('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);

      const found = res.body.data.items.find(
        (r) => r.job.toString() === fixture.job._id.toString() || r.job._id?.toString() === fixture.job._id.toString()
      );
      expect(found).toBeDefined();
      expect(found.rating).toBe(4);
    });

    it('should allow customer to view detail of their own submitted review', async () => {
      const fixture = await setupJobFixture({
        customer: customer2User,
        provider: provider1User,
        providerProfile: provider1Profile,
        status: JOB_STATUS.COMPLETED,
      });

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 5,
          comment: 'Excellent plumbing fix',
        });

      const reviewId = createRes.body.data.review._id;

      const res = await request(app)
        .get(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.review._id.toString()).toBe(reviewId.toString());
    });
  });

  // Scenario 11: Cross-customer isolation
  describe("11. Customer Cannot Access Another Customer's Review", () => {
    it("should reject customer attempting to view another customer's review detail", async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider1User,
        providerProfile: provider1Profile,
        status: JOB_STATUS.COMPLETED,
      });

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 4,
          comment: 'Private review',
        });

      const reviewId = createRes.body.data.review._id;

      // Customer 2 attempts to get Customer 1's review
      const res = await request(app)
        .get(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(403);
    });

    it("should reject customer attempting to update another customer's review", async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider1User,
        providerProfile: provider1Profile,
        status: JOB_STATUS.COMPLETED,
      });

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 4,
          comment: 'Customer 1 original review',
        });

      const reviewId = createRes.body.data.review._id;

      // Customer 2 attempts to update Customer 1's review
      const res = await request(app)
        .patch(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          rating: 1,
          comment: 'Malicious update attempt',
        });

      expect(res.status).toBe(403);
    });
  });

  // Scenario 12: Customer review update behavior
  describe('12. Customer Review Update Behavior', () => {
    it('should allow customer to update rating and comment on their own review', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider1User,
        providerProfile: provider1Profile,
        status: JOB_STATUS.COMPLETED,
      });

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 4,
          comment: 'Good service initially',
        });

      const reviewId = createRes.body.data.review._id;

      // Customer updates review
      const updateRes = await request(app)
        .patch(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          rating: 5,
          comment: 'Updated to 5 stars: Everything held up perfectly!',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.review.rating).toBe(5);
      expect(updateRes.body.data.review.comment).toBe(
        'Updated to 5 stars: Everything held up perfectly!'
      );
    });

    it('should reject update with invalid rating value', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider1User,
        providerProfile: provider1Profile,
        status: JOB_STATUS.COMPLETED,
      });

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 4,
        });

      const reviewId = createRes.body.data.review._id;

      const updateRes = await request(app)
        .patch(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          rating: 7,
        });

      expect(updateRes.status).toBe(422);
    });
  });

  // Scenario 13: Admin view and delete moderation behavior
  describe('13. Admin View and Delete Moderation Behavior', () => {
    it('should allow admin to list all reviews across the platform', async () => {
      const res = await request(app)
        .get('/api/v1/reviews/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
    });

    it('should allow admin to view any specific review by ID', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider1User,
        providerProfile: provider1Profile,
        status: JOB_STATUS.COMPLETED,
      });

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 3,
          comment: 'Mediocre review',
        });

      const reviewId = createRes.body.data.review._id;

      const res = await request(app)
        .get(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.review._id.toString()).toBe(reviewId.toString());
    });

    it('should reject non-admin users attempting to delete reviews', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider1User,
        providerProfile: provider1Profile,
        status: JOB_STATUS.COMPLETED,
      });

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 4,
          comment: 'To be protected',
        });

      const reviewId = createRes.body.data.review._id;

      // Customer attempts delete
      const custDelRes = await request(app)
        .delete(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(custDelRes.status).toBe(403);

      // Provider attempts delete
      const provDelRes = await request(app)
        .delete(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${provider1Token}`);
      expect(provDelRes.status).toBe(403);
    });

    it('should allow admin to delete a review and confirm removal from DB', async () => {
      const fixture = await setupJobFixture({
        customer: customer1User,
        provider: provider1User,
        providerProfile: provider1Profile,
        status: JOB_STATUS.COMPLETED,
      });

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          jobId: fixture.job._id.toString(),
          rating: 1,
          comment: 'Inappropriate content to moderate',
        });

      const reviewId = createRes.body.data.review._id;

      const delRes = await request(app)
        .delete(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const checkDb = await Review.findById(reviewId);
      expect(checkDb).toBeNull();
    });
  });

  // Scenario 14: Provider rating & review count consistency on ProviderProfile
  describe('14. Provider Rating & Review Count Consistency on ProviderProfile', () => {
    it('should accurately maintain rating average (rounded to 1 decimal) and count across creates, updates, and deletes', async () => {
      // Create isolated provider for clean mathematical aggregation verification
      const pCleanRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Math Provider',
        email: 'math.provider@careconnect.local',
        password: 'Password123!',
        role: ROLES.SERVICE_PROVIDER,
      });
      const mathProviderUser = pCleanRes.body.data.user;
      const mathProfile = await ProviderProfile.findOneAndUpdate(
        { user: mathProviderUser._id },
        {
          businessName: 'Math Verified Services',
          verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
          rating: 0,
          reviewCount: 0,
          isActive: true,
        },
        { new: true, upsert: true }
      );

      // Verify baseline: 0 rating, 0 reviewCount
      let currentProfile = await ProviderProfile.findById(mathProfile._id);
      expect(currentProfile.rating).toBe(0);
      expect(currentProfile.reviewCount).toBe(0);

      // Step 1: Customer 1 creates review with rating 5
      const f1 = await setupJobFixture({
        customer: customer1User,
        provider: mathProviderUser,
        providerProfile: mathProfile,
        status: JOB_STATUS.COMPLETED,
      });
      const r1Res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ jobId: f1.job._id.toString(), rating: 5, comment: 'First review' });
      expect(r1Res.status).toBe(201);
      const r1Id = r1Res.body.data.review._id;

      currentProfile = await ProviderProfile.findById(mathProfile._id);
      expect(currentProfile.reviewCount).toBe(1);
      expect(currentProfile.rating).toBe(5);

      // Step 2: Customer 2 creates review with rating 4 -> Average (5 + 4) / 2 = 4.5
      const f2 = await setupJobFixture({
        customer: customer2User,
        provider: mathProviderUser,
        providerProfile: mathProfile,
        status: JOB_STATUS.COMPLETED,
      });
      const r2Res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({ jobId: f2.job._id.toString(), rating: 4, comment: 'Second review' });
      expect(r2Res.status).toBe(201);
      const r2Id = r2Res.body.data.review._id;

      currentProfile = await ProviderProfile.findById(mathProfile._id);
      expect(currentProfile.reviewCount).toBe(2);
      expect(currentProfile.rating).toBe(4.5);

      // Step 3: Customer 3 creates review with rating 4 -> Average (5 + 4 + 4) / 3 = 13 / 3 = 4.333... -> 4.3
      const f3 = await setupJobFixture({
        customer: customer3User,
        provider: mathProviderUser,
        providerProfile: mathProfile,
        status: JOB_STATUS.COMPLETED,
      });
      const r3Res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customer3Token}`)
        .send({ jobId: f3.job._id.toString(), rating: 4, comment: 'Third review' });
      expect(r3Res.status).toBe(201);
      const r3Id = r3Res.body.data.review._id;

      currentProfile = await ProviderProfile.findById(mathProfile._id);
      expect(currentProfile.reviewCount).toBe(3);
      expect(currentProfile.rating).toBe(4.3);

      // Step 4: Customer 1 updates review from 5 to 2 -> Average (2 + 4 + 4) / 3 = 10 / 3 = 3.333... -> 3.3
      const updateRes = await request(app)
        .patch(`/api/v1/reviews/${r1Id}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ rating: 2, comment: 'Updated to lower rating' });
      expect(updateRes.status).toBe(200);

      currentProfile = await ProviderProfile.findById(mathProfile._id);
      expect(currentProfile.reviewCount).toBe(3);
      expect(currentProfile.rating).toBe(3.3);

      // Step 5: Admin deletes Customer 1's review -> Remaining (4 + 4) / 2 = 8 / 2 = 4.0
      const del1Res = await request(app)
        .delete(`/api/v1/reviews/${r1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(del1Res.status).toBe(200);

      currentProfile = await ProviderProfile.findById(mathProfile._id);
      expect(currentProfile.reviewCount).toBe(2);
      expect(currentProfile.rating).toBe(4);

      // Step 6: Admin deletes remaining reviews -> Remaining 0 -> rating: 0, count: 0
      await request(app)
        .delete(`/api/v1/reviews/${r2Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      await request(app)
        .delete(`/api/v1/reviews/${r3Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      currentProfile = await ProviderProfile.findById(mathProfile._id);
      expect(currentProfile.reviewCount).toBe(0);
      expect(currentProfile.rating).toBe(0);
    });
  });
});
