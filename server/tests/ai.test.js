/**
 * Integration Test Suite: Milestone 10 - AI Classification & Provider Matching
 * Tests category classification heuristics, domain taxonomy matching, confidence calculations,
 * deterministic fallback, explainability metadata, multi-criteria provider matching,
 * verified/active provider filtering, location bonuses, and strict RBAC enforcement.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

const User = require('../src/models/User');
const ServiceCategory = require('../src/models/ServiceCategory');
const ProviderProfile = require('../src/models/ProviderProfile');
const Booking = require('../src/models/Booking');
const Job = require('../src/models/Job');

const { ROLES } = require('../src/constants/roles');
const {
  USER_STATUS,
  PROVIDER_VERIFICATION_STATUS,
  BOOKING_STATUS,
  JOB_STATUS,
} = require('../src/constants/status');

let mongoServer;

// Authentication Tokens
let customerToken;
let providerToken;
let adminToken;
let opsToken;

// Categories
let plumbingCat;
let electricalCat;
let cleaningCat;
let applianceCat;
let maintenanceCat;
let emptyCat;

// Provider Users & Profiles
let providerUserApprovedBangalore;
let providerUserApprovedBangaloreLowRating;
let providerUserApprovedMumbai;
let providerUserPending;
let providerUserUnavailable;
let providerUserInactive;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Create Roles & Users
  const customerRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Carlos Customer',
    email: 'carlos.ai@careconnect.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customerToken = customerRes.body.data.token;

  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Ada Admin',
    email: 'ada.ai@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = adminRes.body.data.token;

  const opsRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Oliver Ops',
    email: 'oliver.ai@careconnect.local',
    password: 'Password123!',
    role: ROLES.OPERATIONS_MANAGER,
  });
  opsToken = opsRes.body.data.token;

  const providerRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Paul Provider',
    email: 'paul.ai@careconnect.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  providerToken = providerRes.body.data.token;

  // 2. Create Service Categories
  plumbingCat = await ServiceCategory.create({
    name: 'Plumbing',
    slug: 'plumbing',
    description: 'Leak detection, pipe repairs, drain cleaning, and faucet installations.',
    startingPrice: 75,
    pricingUnit: 'STARTING_FROM',
    requiredSkills: ['Master Plumber', 'Pipe Soldering', 'Drain Snaking'],
    isActive: true,
  });

  electricalCat = await ServiceCategory.create({
    name: 'Electrical',
    slug: 'electrical',
    description: 'Certified electrical work, breaker panels, wiring, and outlets.',
    startingPrice: 85,
    pricingUnit: 'HOURLY',
    requiredSkills: ['Licensed Electrician', 'Circuit Breaker Repair'],
    isActive: true,
  });

  cleaningCat = await ServiceCategory.create({
    name: 'Cleaning',
    slug: 'cleaning',
    description: 'Deep residential cleaning, sanitization, and disinfection.',
    startingPrice: 40,
    pricingUnit: 'HOURLY',
    requiredSkills: ['Deep Cleaning', 'Sanitization'],
    isActive: true,
  });

  applianceCat = await ServiceCategory.create({
    name: 'Appliance Repair',
    slug: 'appliance-repair',
    description: 'Repair for washing machines, refrigerators, microwaves, and dryers.',
    startingPrice: 65,
    pricingUnit: 'STARTING_FROM',
    requiredSkills: ['Refrigeration', 'Electrical Diagnostics'],
    isActive: true,
  });

  maintenanceCat = await ServiceCategory.create({
    name: 'Home Maintenance',
    slug: 'home-maintenance',
    description: 'General handyman repairs, drywall patching, door fitting, and carpentry.',
    startingPrice: 50,
    pricingUnit: 'HOURLY',
    requiredSkills: ['Drywall Patching', 'Carpentry'],
    isActive: true,
  });

  emptyCat = await ServiceCategory.create({
    name: 'HVAC Specialists',
    slug: 'hvac-specialists',
    description: 'Central air conditioning and heating duct servicing.',
    startingPrice: 100,
    pricingUnit: 'HOURLY',
    requiredSkills: ['HVAC Certification'],
    isActive: true,
  });

  const customerUser = await User.findOne({ email: 'carlos.ai@careconnect.local' });

  // 3. Create Providers with diverse attributes for matching tests
  // Provider 1: Top Rated, 5.0★, Bangalore, 2 Completed Jobs, 6y experience, Approved & Available
  providerUserApprovedBangalore = await User.create({
    name: 'Aarav Sharma',
    email: 'aarav.plumber@careconnect.local',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz12345',
    role: ROLES.SERVICE_PROVIDER,
    status: USER_STATUS.ACTIVE,
  });
  const profile1 = await ProviderProfile.create({
    user: providerUserApprovedBangalore._id,
    businessName: 'Aarav Rapid Plumbing',
    serviceCategories: [plumbingCat._id],
    serviceAreas: [{ city: 'Bangalore', areas: ['Indiranagar', 'Koramangala'] }],
    experienceYears: 6,
    rating: 5.0,
    reviewCount: 15,
    isAvailable: true,
    verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
    pricing: { model: 'HOURLY', hourlyRate: 90, minimumCharge: 50 },
  });

  // Create completed jobs for Provider 1
  const booking1 = await Booking.create({
    customer: customerUser._id,
    provider: providerUserApprovedBangalore._id,
    providerProfile: profile1._id,
    serviceRequest: new mongoose.Types.ObjectId(),
    scheduledStart: new Date('2026-03-01T10:00:00Z'),
    scheduledEnd: new Date('2026-03-01T12:00:00Z'),
    price: 18000,
    status: BOOKING_STATUS.COMPLETED,
  });
  await Job.create({
    booking: booking1._id,
    provider: providerUserApprovedBangalore._id,
    customer: customerUser._id,
    status: JOB_STATUS.COMPLETED,
    completedAt: new Date('2026-03-01T12:00:00Z'),
  });

  const booking2 = await Booking.create({
    customer: customerUser._id,
    provider: providerUserApprovedBangalore._id,
    providerProfile: profile1._id,
    serviceRequest: new mongoose.Types.ObjectId(),
    scheduledStart: new Date('2026-03-05T10:00:00Z'),
    scheduledEnd: new Date('2026-03-05T12:00:00Z'),
    price: 22000,
    status: BOOKING_STATUS.COMPLETED,
  });
  await Job.create({
    booking: booking2._id,
    provider: providerUserApprovedBangalore._id,
    customer: customerUser._id,
    status: JOB_STATUS.COMPLETED,
    completedAt: new Date('2026-03-05T12:00:00Z'),
  });

  // Provider 2: Moderate Rated, 3.8★, Bangalore, 0 Completed Jobs, 2y experience, Approved & Available
  providerUserApprovedBangaloreLowRating = await User.create({
    name: 'Bhavin Patel',
    email: 'bhavin.plumber@careconnect.local',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz12345',
    role: ROLES.SERVICE_PROVIDER,
    status: USER_STATUS.ACTIVE,
  });
  await ProviderProfile.create({
    user: providerUserApprovedBangaloreLowRating._id,
    businessName: 'Bhavin Plumbing Works',
    serviceCategories: [plumbingCat._id],
    serviceAreas: [{ city: 'Bangalore', areas: ['Whitefield'] }],
    experienceYears: 2,
    rating: 3.8,
    reviewCount: 4,
    isAvailable: true,
    verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
    pricing: { model: 'HOURLY', hourlyRate: 60, minimumCharge: 30 },
  });

  // Provider 3: High Rated, 4.9★, Mumbai (different city), Approved & Available
  providerUserApprovedMumbai = await User.create({
    name: 'Chetan Desai',
    email: 'chetan.mumbai@careconnect.local',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz12345',
    role: ROLES.SERVICE_PROVIDER,
    status: USER_STATUS.ACTIVE,
  });
  await ProviderProfile.create({
    user: providerUserApprovedMumbai._id,
    businessName: 'Chetan Marine Plumbing',
    serviceCategories: [plumbingCat._id],
    serviceAreas: [{ city: 'Mumbai', areas: ['Bandra', 'Andheri'] }],
    experienceYears: 8,
    rating: 4.9,
    reviewCount: 20,
    isAvailable: true,
    verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
    pricing: { model: 'HOURLY', hourlyRate: 110, minimumCharge: 60 },
  });

  // Provider 4: PENDING verification -> MUST BE EXCLUDED
  providerUserPending = await User.create({
    name: 'Dinesh Pending',
    email: 'dinesh.pending@careconnect.local',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz12345',
    role: ROLES.SERVICE_PROVIDER,
    status: USER_STATUS.ACTIVE,
  });
  await ProviderProfile.create({
    user: providerUserPending._id,
    businessName: 'Dinesh Express Plumbing',
    serviceCategories: [plumbingCat._id],
    serviceAreas: [{ city: 'Bangalore', areas: ['Indiranagar'] }],
    experienceYears: 4,
    rating: 4.5,
    isAvailable: true,
    verificationStatus: PROVIDER_VERIFICATION_STATUS.PENDING,
  });

  // Provider 5: UNAVAILABLE (isAvailable: false) -> MUST BE EXCLUDED
  providerUserUnavailable = await User.create({
    name: 'Esha Unavailable',
    email: 'esha.busy@careconnect.local',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz12345',
    role: ROLES.SERVICE_PROVIDER,
    status: USER_STATUS.ACTIVE,
  });
  await ProviderProfile.create({
    user: providerUserUnavailable._id,
    businessName: 'Esha 24/7 Pipes',
    serviceCategories: [plumbingCat._id],
    serviceAreas: [{ city: 'Bangalore', areas: ['Indiranagar'] }],
    experienceYears: 5,
    rating: 4.8,
    isAvailable: false,
    verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
  });

  // Provider 6: INACTIVE User Account -> MUST BE EXCLUDED
  providerUserInactive = await User.create({
    name: 'Farhan Inactive',
    email: 'farhan.inactive@careconnect.local',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz12345',
    role: ROLES.SERVICE_PROVIDER,
    status: USER_STATUS.INACTIVE,
  });
  await ProviderProfile.create({
    user: providerUserInactive._id,
    businessName: 'Farhan Suspended Services',
    serviceCategories: [plumbingCat._id],
    serviceAreas: [{ city: 'Bangalore', areas: ['Indiranagar'] }],
    experienceYears: 5,
    rating: 4.9,
    isAvailable: true,
    verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Milestone 10: AI Classification & Provider Matching Test Suite', () => {
  // =========================================================================
  // 1. CATEGORY CLASSIFICATION TESTS
  // =========================================================================
  describe('POST /api/v1/ai/classify — Request Category Classification', () => {
    it('1. should classify a plumbing request with HIGH confidence and explainable terms', async () => {
      const res = await request(app)
        .post('/api/v1/ai/classify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Kitchen sink pipe leaking continuously',
          description: 'Water is dripping from the drain pipe under the sink and creating a puddle in the kitchen.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categoryName).toBe('Plumbing');
      expect(res.body.data.categorySlug).toBe('plumbing');
      expect(res.body.data.confidence).toBeGreaterThanOrEqual(0.8);
      expect(res.body.data.confidenceLevel).toBe('HIGH');
      expect(res.body.data.isFallback).toBe(false);
      expect(res.body.data.explanation).toMatch(/Plumbing/);
      expect(res.body.data.matchedKeywords.length).toBeGreaterThan(0);
      expect(res.body.data.suggestedSkills).toContain('Master Plumber');
    });

    it('2. should classify an electrical request accurately', async () => {
      const res = await request(app)
        .post('/api/v1/ai/classify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Circuit breaker tripping constantly',
          description: 'Sparks coming out of the main wall socket outlet when turning on the air conditioner switch.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categoryName).toBe('Electrical');
      expect(res.body.data.categorySlug).toBe('electrical');
      expect(res.body.data.confidence).toBeGreaterThanOrEqual(0.8);
      expect(res.body.data.confidenceLevel).toBe('HIGH');
      expect(res.body.data.isFallback).toBe(false);
      expect(res.body.data.suggestedSkills).toContain('Circuit Breaker Repair');
    });

    it('3. should classify a deep cleaning request accurately', async () => {
      const res = await request(app)
        .post('/api/v1/ai/classify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Move-in deep cleaning service required',
          description: 'Need full apartment sanitization, kitchen disinfection, and carpet vacuuming for a 3BHK flat.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categoryName).toBe('Cleaning');
      expect(res.body.data.confidence).toBeGreaterThanOrEqual(0.7);
      expect(res.body.data.isFallback).toBe(false);
    });

    it('4. should classify an appliance repair request accurately', async () => {
      const res = await request(app)
        .post('/api/v1/ai/classify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Washing machine drum stopped spinning',
          description: 'Front load washer makes a grinding noise during cycle and will not drain or spin clothes.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categoryName).toBe('Appliance Repair');
      expect(res.body.data.confidence).toBeGreaterThanOrEqual(0.75);
      expect(res.body.data.isFallback).toBe(false);
    });

    it('5. should classify a home maintenance / carpentry request accurately', async () => {
      const res = await request(app)
        .post('/api/v1/ai/classify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Broken bedroom door hinge and drywall patch',
          description: 'Need a handyman to rehang bedroom door, fix loose hinges, and patch a hole in the drywall.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categoryName).toBe('Home Maintenance');
      expect(res.body.data.confidence).toBeGreaterThanOrEqual(0.75);
      expect(res.body.data.isFallback).toBe(false);
    });

    it('6. should gracefully fallback with low confidence and clear explanation on ambiguous/gibberish text', async () => {
      const res = await request(app)
        .post('/api/v1/ai/classify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          text: 'qwerty asdfgh 12345678 lorem ipsum dolor sit amet',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isFallback).toBe(true);
      expect(res.body.data.confidenceLevel).toBe('LOW');
      expect(res.body.data.confidence).toBeLessThanOrEqual(0.5);
      expect(res.body.data.explanation).toMatch(/No specific trade keywords were detected/);
    });

    it('7. should reject requests with empty body / missing text with 422 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/ai/classify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('8. should reject unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/v1/ai/classify')
        .send({
          title: 'Leaking pipe under kitchen sink',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. INTELLIGENT PROVIDER MATCHING TESTS
  // =========================================================================
  describe('POST /api/v1/ai/match-providers — Intelligent Provider Matching', () => {
    it('9. should match, score, and rank verified providers giving top rank to highest composite score', async () => {
      const res = await request(app)
        .post('/api/v1/ai/match-providers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          categoryId: plumbingCat._id.toString(),
          city: 'Bangalore',
          preferredDate: '2026-03-15',
          urgency: 'STANDARD',
          limit: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.providers)).toBe(true);

      const providers = res.body.data.providers;
      expect(providers.length).toBe(3); // Aarav (Bangalore), Bhavin (Bangalore), Chetan (Mumbai)

      // Top provider must be Aarav (5.0 rating, 2 completed jobs, Bangalore match)
      const topProvider = providers[0];
      expect(topProvider.name).toBe('Aarav Sharma');
      expect(topProvider.cityMatch).toBe(true);
      expect(topProvider.completedJobsCount).toBe(2);
      expect(topProvider.compositeScore).toBeGreaterThan(providers[1].compositeScore);
      expect(topProvider.explanation).toMatch(/Aarav Rapid Plumbing/);
      expect(topProvider.scoreBreakdown.locationScore).toBe(35); // Full location score
      expect(topProvider.scoreBreakdown.availabilityScore).toBe(15);
    });

    it('10. should award higher location score to matching city than non-matching city', async () => {
      const res = await request(app)
        .post('/api/v1/ai/match-providers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          categoryId: plumbingCat._id.toString(),
          city: 'Bangalore',
        });

      expect(res.status).toBe(200);
      const providers = res.body.data.providers;

      const bangaloreProvider = providers.find((p) => p.name === 'Aarav Sharma');
      const mumbaiProvider = providers.find((p) => p.name === 'Chetan Desai');

      expect(bangaloreProvider.cityMatch).toBe(true);
      expect(mumbaiProvider.cityMatch).toBe(false);
      expect(bangaloreProvider.scoreBreakdown.locationScore).toBe(35);
      expect(mumbaiProvider.scoreBreakdown.locationScore).toBe(10);
    });

    it('11. should strictly exclude unverified providers (PENDING)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/match-providers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          categoryId: plumbingCat._id.toString(),
          city: 'Bangalore',
        });

      expect(res.status).toBe(200);
      const providerIds = res.body.data.providers.map((p) => p.providerId.toString());
      expect(providerIds).not.toContain(providerUserPending._id.toString());
    });

    it('12. should strictly exclude unavailable providers (isAvailable: false)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/match-providers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          categoryId: plumbingCat._id.toString(),
          city: 'Bangalore',
        });

      expect(res.status).toBe(200);
      const providerIds = res.body.data.providers.map((p) => p.providerId.toString());
      expect(providerIds).not.toContain(providerUserUnavailable._id.toString());
    });

    it('13. should strictly exclude providers with inactive user accounts', async () => {
      const res = await request(app)
        .post('/api/v1/ai/match-providers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          categoryId: plumbingCat._id.toString(),
          city: 'Bangalore',
        });

      expect(res.status).toBe(200);
      const providerIds = res.body.data.providers.map((p) => p.providerId.toString());
      expect(providerIds).not.toContain(providerUserInactive._id.toString());
    });

    it('14. should handle empty candidate results gracefully when category has no providers', async () => {
      const res = await request(app)
        .post('/api/v1/ai/match-providers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          categoryId: emptyCat._id.toString(),
          city: 'Bangalore',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.providers).toEqual([]);
      expect(res.body.data.totalEligible).toBe(0);
      expect(res.body.data.message).toMatch(/No verified active providers/);
    });

    it('15. should allow Platform Admin and Operations Manager to execute provider matching', async () => {
      const adminRes = await request(app)
        .post('/api/v1/ai/match-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          categoryId: plumbingCat._id.toString(),
          city: 'Bangalore',
        });
      expect(adminRes.status).toBe(200);

      const opsRes = await request(app)
        .post('/api/v1/ai/match-providers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          categoryId: plumbingCat._id.toString(),
          city: 'Bangalore',
        });
      expect(opsRes.status).toBe(200);
    });

    it('16. should forbid service providers from invoking provider matching (RBAC protection)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/match-providers')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          categoryId: plumbingCat._id.toString(),
          city: 'Bangalore',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('17. should reject provider matching with invalid categoryId format with 422 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/ai/match-providers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          categoryId: 'invalid-id-1234',
          city: 'Bangalore',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('18. should reject unauthenticated provider matching with 401', async () => {
      const res = await request(app)
        .post('/api/v1/ai/match-providers')
        .send({
          categoryId: plumbingCat._id.toString(),
          city: 'Bangalore',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
