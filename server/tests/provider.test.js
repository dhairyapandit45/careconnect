/**
 * Integration Test: Service Provider Onboarding, Profile Management & Verification
 * Exercises all 20 required verification scenarios against an in-memory MongoDB database.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const ServiceCategory = require('../src/models/ServiceCategory');
const ProviderProfile = require('../src/models/ProviderProfile');
const { ROLES } = require('../src/constants/roles');
const { PROVIDER_VERIFICATION_STATUS } = require('../src/constants/status');

let mongoServer;
let provider1Token;
let provider1User;
let provider2Token;
let provider2User;
let customerToken;
let adminToken;
let activeCategory1;
let activeCategory2;
let inactiveCategory;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Register Provider 1
  const p1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Mario Plumber',
    email: 'mario@plumbing.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider1Token = p1Res.body.data.token;
  provider1User = p1Res.body.data.user;

  // Register Provider 2
  const p2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Luigi Electrician',
    email: 'luigi@electric.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider2Token = p2Res.body.data.token;
  provider2User = p2Res.body.data.user;

  // Register Customer
  const cRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Princess Peach',
    email: 'peach@castle.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customerToken = cRes.body.data.token;

  // Register Admin
  const aRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Platform Overseer',
    email: 'admin@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = aRes.body.data.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await ProviderProfile.deleteMany({});
  await ServiceCategory.deleteMany({});

  activeCategory1 = await ServiceCategory.create({
    name: 'Plumbing Works',
    slug: 'plumbing-works',
    description: 'All residential plumbing',
    icon: 'Droplets',
    startingPrice: 60,
    pricingUnit: 'HOURLY',
    isActive: true,
  });

  activeCategory2 = await ServiceCategory.create({
    name: 'Appliance Repair',
    slug: 'appliance-repair',
    description: 'Major appliance repair',
    icon: 'Wrench',
    startingPrice: 75,
    pricingUnit: 'HOURLY',
    isActive: true,
  });

  inactiveCategory = await ServiceCategory.create({
    name: 'Discontinued Roofing',
    slug: 'discontinued-roofing',
    description: 'Archived roofing trade',
    icon: 'Hammer',
    startingPrice: 100,
    pricingUnit: 'HOURLY',
    isActive: false,
  });
});

describe('Milestone 4: Provider Onboarding, Profile & Verification Test Suite', () => {
  const sampleProfilePayload = {
    businessName: 'Mario Master Plumbing LLC',
    description: 'Over 15 years of certified experience solving complex leaks and fixture installs.',
    skills: ['Plumbing', 'Pipe Leak Repair', 'Drain Cleaning'],
    serviceAreas: [
      {
        city: 'Hyderabad',
        areas: ['Gachibowli', 'Kondapur', 'Madhapur', 'Hitec City'],
      },
    ],
    experienceYears: 15,
    pricing: {
      model: 'HOURLY',
      minimumCharge: 300,
      hourlyRate: 750,
    },
    documents: [
      {
        type: 'CERTIFICATION',
        name: 'Master Plumber License 2026',
        url: 'https://docs.careconnect.local/lic_98234.pdf',
      },
      {
        type: 'IDENTITY',
        name: 'Government ID',
        url: 'https://docs.careconnect.local/id_5543.pdf',
      },
    ],
  };

  // 1. Provider can create profile
  it('1. should allow SERVICE_PROVIDER to create a profile with valid details', async () => {
    const res = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.businessName).toBe('Mario Master Plumbing LLC');
    expect(res.body.data.profile.user._id).toBe(provider1User._id);
    expect(res.body.data.profile.verificationStatus).toBe(PROVIDER_VERIFICATION_STATUS.PENDING);
    expect(res.body.data.profile.serviceCategories).toHaveLength(1);
    expect(res.body.data.profile.serviceAreas[0].city).toBe('Hyderabad');
    expect(res.body.data.profile.pricing.hourlyRate).toBe(750);
  });

  // 2. Customer cannot create provider profile
  it('2. should reject CUSTOMER attempting to create a provider profile with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 3. Provider can update own profile
  it('3. should allow provider to update their own business name, skills, and pricing', async () => {
    await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    const updateRes = await request(app)
      .patch('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        businessName: 'Super Mario Plumbing & Gas',
        experienceYears: 16,
        pricing: {
          model: 'HOURLY',
          minimumCharge: 350,
          hourlyRate: 800,
        },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.profile.businessName).toBe('Super Mario Plumbing & Gas');
    expect(updateRes.body.data.profile.experienceYears).toBe(16);
    expect(updateRes.body.data.profile.pricing.hourlyRate).toBe(800);
  });

  // 4. Provider cannot update another provider
  it('4. should ensure provider updates only target their own authenticated account', async () => {
    // Provider 1 creates profile
    await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    // Provider 2 updates profile (without creating one first, should return 404 for Provider 2)
    const p2Res = await request(app)
      .patch('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider2Token}`)
      .send({
        businessName: 'Hacked By Luigi',
      });

    expect(p2Res.status).toBe(404);

    // Verify Provider 1 was untouched
    const p1Fetch = await request(app)
      .get('/api/v1/providers/me')
      .set('Authorization', `Bearer ${provider1Token}`);

    expect(p1Fetch.body.data.profile.businessName).toBe('Mario Master Plumbing LLC');
  });

  // 5. Provider cannot set verificationStatus to APPROVED
  it('5. should reject or override any attempt by provider to self-approve verificationStatus', async () => {
    const res = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
        verificationStatus: 'APPROVED', // Malicious attempt to self-approve
      });

    expect(res.status).toBe(201);
    expect(res.body.data.profile.verificationStatus).toBe(PROVIDER_VERIFICATION_STATUS.PENDING);

    // Also attempt via PATCH
    const patchRes = await request(app)
      .patch('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        verificationStatus: 'APPROVED',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.profile.verificationStatus).toBe(PROVIDER_VERIFICATION_STATUS.PENDING);
  });

  // 6. Provider cannot modify rating or reviewCount
  it('6. should ignore any client attempts to modify rating or reviewCount', async () => {
    const res = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
        rating: 5.0,
        reviewCount: 999,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.profile.rating).toBe(0);
    expect(res.body.data.profile.reviewCount).toBe(0);
  });

  // 7. Invalid category IDs rejected
  it('7. should reject invalid category ID formats with 422', async () => {
    const res = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: ['not-a-valid-object-id'],
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  // 8. Inactive categories rejected
  it('8. should reject creation when category is inactive with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [inactiveCategory._id.toString()],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/inactive/i);
  });

  // 9. Negative pricing rejected
  it('9. should reject negative hourly rate or minimum charge with 422', async () => {
    const res = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
        pricing: {
          model: 'HOURLY',
          minimumCharge: -50,
          hourlyRate: -100,
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  // 10. Invalid experience rejected
  it('10. should reject negative experienceYears with 422', async () => {
    const res = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
        experienceYears: -5,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  // 11. Admin can list providers
  it('11. should allow PLATFORM_ADMIN to list providers with filters and pagination', async () => {
    // Create profiles for both providers
    await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider2Token}`)
      .send({
        ...sampleProfilePayload,
        businessName: 'Luigi Power Electric',
        serviceCategories: [activeCategory2._id.toString()],
        serviceAreas: [{ city: 'Bangalore', areas: ['Whitefield'] }],
      });

    const res = await request(app)
      .get('/api/v1/admin/providers?verificationStatus=PENDING&city=Hyderabad')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].businessName).toBe('Mario Master Plumbing LLC');
    expect(res.body.data.pagination.total).toBe(1);
  });

  // 12. Non-admin cannot list admin providers
  it('12. should reject non-admin users attempting to access admin provider list with 403', async () => {
    const custRes = await request(app)
      .get('/api/v1/admin/providers')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(custRes.status).toBe(403);

    const provRes = await request(app)
      .get('/api/v1/admin/providers')
      .set('Authorization', `Bearer ${provider1Token}`);

    expect(provRes.status).toBe(403);
  });

  // 13. Admin can approve provider
  it('13. should allow PLATFORM_ADMIN to transition provider from PENDING to APPROVED', async () => {
    const createRes = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    const profileId = createRes.body.data.profile._id;

    const verifyRes = await request(app)
      .patch(`/api/v1/admin/providers/${profileId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'APPROVE',
        reason: 'All trade licenses and government identity documents successfully verified.',
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.profile.verificationStatus).toBe(PROVIDER_VERIFICATION_STATUS.APPROVED);
    expect(verifyRes.body.data.profile.verificationNotes).toBe(
      'All trade licenses and government identity documents successfully verified.'
    );
  });

  // 14. Admin can reject provider
  it('14. should allow PLATFORM_ADMIN to reject provider verification with reason', async () => {
    const createRes = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    const profileId = createRes.body.data.profile._id;

    const verifyRes = await request(app)
      .patch(`/api/v1/admin/providers/${profileId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'REJECT',
        reason: 'Required master trade license copy is expired.',
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.profile.verificationStatus).toBe(PROVIDER_VERIFICATION_STATUS.REJECTED);
    expect(verifyRes.body.data.profile.verificationNotes).toBe(
      'Required master trade license copy is expired.'
    );
  });

  // 15. Admin can suspend approved provider
  it('15. should allow PLATFORM_ADMIN to suspend an APPROVED provider', async () => {
    const createRes = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    const profileId = createRes.body.data.profile._id;

    // First approve
    await request(app)
      .patch(`/api/v1/admin/providers/${profileId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE' });

    // Then suspend
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/providers/${profileId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'SUSPEND',
        reason: 'Multiple policy violations reported by consumers.',
      });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.profile.verificationStatus).toBe(PROVIDER_VERIFICATION_STATUS.SUSPENDED);
    expect(suspendRes.body.data.profile.verificationNotes).toBe(
      'Multiple policy violations reported by consumers.'
    );
  });

  // 16. Invalid status transition rejected
  it('16. should reject invalid status transitions (e.g. PENDING -> SUSPENDED) with 400', async () => {
    const createRes = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    const profileId = createRes.body.data.profile._id;

    // Direct PENDING -> SUSPENDED is not an allowed transition
    const invalidRes = await request(app)
      .patch(`/api/v1/admin/providers/${profileId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'SUSPEND',
        reason: 'Direct suspension of pending provider',
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);
  });

  // 17. Verification reason stored correctly
  it('17. should store verification notes when review is requested', async () => {
    const createRes = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    const profileId = createRes.body.data.profile._id;

    const res = await request(app)
      .patch(`/api/v1/admin/providers/${profileId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'REQUEST_REVIEW',
        reason: 'Please upload a clearer picture of your government ID.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.profile.verificationStatus).toBe(PROVIDER_VERIFICATION_STATUS.UNDER_REVIEW);
    expect(res.body.data.profile.verificationNotes).toBe(
      'Please upload a clearer picture of your government ID.'
    );
  });

  // 18. Sensitive document information is not exposed in public provider summaries
  it('18. should sanitize sensitive documents and verification notes in public provider summary', async () => {
    const createRes = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    const profileId = createRes.body.data.profile._id;

    // Customer requests provider summary
    const publicRes = await request(app)
      .get(`/api/v1/providers/${profileId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.profile.businessName).toBe('Mario Master Plumbing LLC');
    // Strictly verify omission of sensitive data
    expect(publicRes.body.data.profile.documents).toBeUndefined();
    expect(publicRes.body.data.profile.verificationNotes).toBeUndefined();
    expect(publicRes.body.data.profile.user).toBeUndefined();
  });

  // 19. Provider cannot access another provider's private profile
  it('19. should protect full private profile so Provider 2 only sees safe public view of Provider 1', async () => {
    const createRes = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        ...sampleProfilePayload,
        serviceCategories: [activeCategory1._id.toString()],
      });

    const p1ProfileId = createRes.body.data.profile._id;

    // Provider 2 queries Provider 1's profile
    const p2View = await request(app)
      .get(`/api/v1/providers/${p1ProfileId}`)
      .set('Authorization', `Bearer ${provider2Token}`);

    expect(p2View.status).toBe(200);
    expect(p2View.body.data.profile.documents).toBeUndefined();
    expect(p2View.body.data.profile.verificationNotes).toBeUndefined();
  });

  // 20. Customer cannot modify provider profile
  it('20. should block CUSTOMER from patching provider profile with 403 Forbidden', async () => {
    const res = await request(app)
      .patch('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        businessName: 'Customer Pretending To Be Provider',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
