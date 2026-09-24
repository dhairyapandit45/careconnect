/**
 * Integration Test: Milestone 5 - Provider Availability, Provider Discovery & Quote Workflow
 * Exercises all 28 required scenarios across Availability, Deterministic Eligibility, Quoting, and Security.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const ServiceCategory = require('../src/models/ServiceCategory');
const ProviderProfile = require('../src/models/ProviderProfile');
const ServiceRequest = require('../src/models/ServiceRequest');
const Availability = require('../src/models/Availability');
const Quote = require('../src/models/Quote');
const { ROLES } = require('../src/constants/roles');
const {
  PROVIDER_VERIFICATION_STATUS,
  SERVICE_REQUEST_STATUS,
  QUOTE_STATUS,
  USER_STATUS,
} = require('../src/constants/status');

let mongoServer;
let provider1Token;
let provider1User;
let provider1Profile;
let provider2Token;
let provider2User;
let provider2Profile;
let customer1Token;
let customer1User;
let customer2Token;
let customer2User;
let adminToken;

let plumbingCategory;
let electricalCategory;

let sfPlumbingRequest;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Register Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Admin User',
    email: 'admin@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = adminRes.body.data.token;

  // 2. Register Customer 1
  const c1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Alice Customer',
    email: 'alice@customer.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer1Token = c1Res.body.data.token;
  customer1User = c1Res.body.data.user;

  // 3. Register Customer 2
  const c2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Bob Customer',
    email: 'bob@customer.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer2Token = c2Res.body.data.token;
  customer2User = c2Res.body.data.user;

  // 4. Register Provider 1 (Plumber in San Francisco)
  const p1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Mario Plumber',
    email: 'mario@plumber.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider1Token = p1Res.body.data.token;
  provider1User = p1Res.body.data.user;

  // 5. Register Provider 2 (Electrician in Oakland)
  const p2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Luigi Electrician',
    email: 'luigi@electric.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider2Token = p2Res.body.data.token;
  provider2User = p2Res.body.data.user;

  // 6. Create Categories
  const cat1Res = await request(app)
    .post('/api/v1/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Plumbing Services',
      description: 'Pipes, leaks, and fixture repairs',
      icon: 'Droplets',
      startingPrice: 50,
      pricingUnit: 'HOURLY',
      requiredSkills: ['Pipe Fitting', 'Leak Repair'],
    });
  plumbingCategory = cat1Res.body.data.category;

  const cat2Res = await request(app)
    .post('/api/v1/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Electrical Repairs',
      description: 'Breakers, wiring, and panel repairs',
      icon: 'Zap',
      startingPrice: 65,
      pricingUnit: 'HOURLY',
      requiredSkills: ['Wiring', 'Breaker Replacement'],
    });
  electricalCategory = cat2Res.body.data.category;

  // Clear auto-created placeholder provider profiles so POST /api/v1/providers/profile works cleanly
  await ProviderProfile.deleteMany({});

  // 7. Setup Provider 1 Profile (Approved Plumber in San Francisco)
  const prof1Res = await request(app)
    .post('/api/v1/providers/profile')
    .set('Authorization', `Bearer ${provider1Token}`)
    .send({
      businessName: 'Mario Master Plumbing LLC',
      description: 'Licensed residential and commercial master plumbing specialist.',
      skills: ['Pipe Fitting', 'Drain Clearing'],
      serviceCategories: [plumbingCategory._id],
      serviceAreas: [{ city: 'San Francisco', areas: ['Downtown', 'Mission'] }],
      experienceYears: 12,
      pricing: { model: 'HOURLY', minimumCharge: 100, hourlyRate: 75 },
    });
  provider1Profile = prof1Res.body.data.profile;

  // Approve Provider 1
  await request(app)
    .patch(`/api/v1/admin/providers/${provider1Profile._id}/verification`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ action: 'APPROVE', notes: 'Credentials verified.' });

  // 8. Setup Provider 2 Profile (Approved Electrician in Oakland)
  const prof2Res = await request(app)
    .post('/api/v1/providers/profile')
    .set('Authorization', `Bearer ${provider2Token}`)
    .send({
      businessName: 'Luigi Power & Electric',
      description: 'High voltage electrical repairs and smart home installations.',
      skills: ['Wiring', 'Breaker Replacement'],
      serviceCategories: [electricalCategory._id],
      serviceAreas: [{ city: 'Oakland', areas: ['Uptown', 'Rockridge'] }],
      experienceYears: 8,
      pricing: { model: 'HOURLY', minimumCharge: 120, hourlyRate: 85 },
    });
  provider2Profile = prof2Res.body.data.profile;

  // Approve Provider 2
  await request(app)
    .patch(`/api/v1/admin/providers/${provider2Profile._id}/verification`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ action: 'APPROVE', notes: 'Credentials verified.' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear Service Requests, Quotes, and Availabilities before each test if needed
  await Quote.deleteMany({});
  await Availability.deleteMany({});
  await ServiceRequest.deleteMany({});

  // Seed baseline customer service request in SF for Plumbing
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 2);

  const reqRes = await request(app)
    .post('/api/v1/service-requests')
    .set('Authorization', `Bearer ${customer1Token}`)
    .send({
      categoryId: plumbingCategory._id,
      title: 'Kitchen Sink Leaking Under Cabinet',
      description: 'Continuous leaking from the P-trap whenever faucet runs.',
      address: '100 Market St',
      city: 'San Francisco',
      postalCode: '94105',
      state: 'CA',
      preferredDate: futureDate.toISOString().split('T')[0],
      preferredTime: { start: '09:00', end: '12:00' },
      requiredSkills: ['Pipe Fitting'],
    });

  sfPlumbingRequest = reqRes.body.data.request;
});

describe('Milestone 5: Provider Availability, Discovery & Quote Test Suite', () => {
  // ==========================================
  // PART A — AVAILABILITY TESTS
  // ==========================================

  it('1. should allow SERVICE_PROVIDER to create weekly availability', async () => {
    const res = await request(app)
      .post('/api/v1/providers/availability')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shift.dayOfWeek).toBe('MONDAY');
    expect(res.body.data.shift.startTime).toBe('09:00');
    expect(res.body.data.shift.endTime).toBe('17:00');
    expect(res.body.data.shift.isAvailable).toBe(true);
  });

  it('2. should reject CUSTOMER attempting to create availability with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/providers/availability')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '17:00',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. should reject Provider 2 attempting to modify Provider 1 availability with 403 Forbidden', async () => {
    // Provider 1 creates shift
    const createRes = await request(app)
      .post('/api/v1/providers/availability')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        dayOfWeek: 'TUESDAY',
        startTime: '08:00',
        endTime: '16:00',
      });

    const shiftId = createRes.body.data.shift._id;

    // Provider 2 attempts to patch
    const patchRes = await request(app)
      .patch(`/api/v1/providers/availability/${shiftId}`)
      .set('Authorization', `Bearer ${provider2Token}`)
      .send({
        startTime: '10:00',
        endTime: '18:00',
      });

    expect(patchRes.status).toBe(403);
    expect(patchRes.body.success).toBe(false);
  });

  it('4. should reject invalid time format (e.g. 25:00 or morning) with 422 Unprocessable Entity', async () => {
    const res = await request(app)
      .post('/api/v1/providers/availability')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        dayOfWeek: 'WEDNESDAY',
        startTime: '25:00',
        endTime: '17:00',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('5. should reject availability when endTime is before or equal to startTime with 422', async () => {
    const res = await request(app)
      .post('/api/v1/providers/availability')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        dayOfWeek: 'WEDNESDAY',
        startTime: '17:00',
        endTime: '09:00',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('6. should reject overlapping recurring availability for the same provider on the same day with 400', async () => {
    // First slot: MONDAY 09:00 - 12:00
    await request(app)
      .post('/api/v1/providers/availability')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '12:00',
      });

    // Overlapping slot: MONDAY 11:00 - 15:00
    const overlapRes = await request(app)
      .post('/api/v1/providers/availability')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        dayOfWeek: 'MONDAY',
        startTime: '11:00',
        endTime: '15:00',
      });

    expect(overlapRes.status).toBe(400);
    expect(overlapRes.body.success).toBe(false);
    expect(overlapRes.body.message).toMatch(/overlap/i);
  });

  it('7. should allow provider to delete their own availability slot', async () => {
    const createRes = await request(app)
      .post('/api/v1/providers/availability')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        dayOfWeek: 'FRIDAY',
        startTime: '10:00',
        endTime: '18:00',
      });

    const shiftId = createRes.body.data.shift._id;

    const delRes = await request(app)
      .delete(`/api/v1/providers/availability/${shiftId}`)
      .set('Authorization', `Bearer ${provider1Token}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const check = await Availability.findById(shiftId);
    expect(check).toBeNull();
  });

  // ==========================================
  // PART B — ELIGIBILITY & DISCOVERY TESTS
  // ==========================================

  it('8. should allow APPROVED provider to discover eligible service requests in their category and city', async () => {
    // Provider 1 is Approved Plumber in San Francisco
    const res = await request(app)
      .get('/api/v1/provider-requests')
      .set('Authorization', `Bearer ${provider1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]._id).toBe(sfPlumbingRequest._id);
    expect(res.body.data.items[0].title).toBe('Kitchen Sink Leaking Under Cabinet');
    // Ensure customer address is sanitized (not present)
    expect(res.body.data.items[0].location.address).toBeUndefined();
    expect(res.body.data.items[0].location.city).toBe('San Francisco');
  });

  it('9. should return empty/exclude requests for unverified (PENDING) provider', async () => {
    // Temporarily set Provider 1 to PENDING
    await ProviderProfile.findByIdAndUpdate(provider1Profile._id, {
      verificationStatus: PROVIDER_VERIFICATION_STATUS.PENDING,
    });

    const res = await request(app)
      .get('/api/v1/provider-requests')
      .set('Authorization', `Bearer ${provider1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);

    // Restore to APPROVED
    await ProviderProfile.findByIdAndUpdate(provider1Profile._id, {
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
    });
  });

  it('10. should exclude requests belonging to a service category provider does not support', async () => {
    // Provider 2 is Electrician. Should NOT see SF plumbing request
    const res = await request(app)
      .get('/api/v1/provider-requests')
      .set('Authorization', `Bearer ${provider2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it('11. should exclude requests located in a city outside provider service territory', async () => {
    // Create an electrical request in Oakland (Provider 2 matches) vs San Francisco (Provider 2 does not match)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const sfElecRes = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        categoryId: electricalCategory._id,
        title: 'Circuit Breaker Tripping in SF',
        description: 'Breaker box keeps buzzing and trips randomly.',
        address: '500 Howard St',
        city: 'San Francisco', // Outside Oakland!
        postalCode: '94105',
        preferredDate: futureDate.toISOString().split('T')[0],
      });

    // Provider 2 serves Oakland, not SF
    const p2Res = await request(app)
      .get('/api/v1/provider-requests')
      .set('Authorization', `Bearer ${provider2Token}`);

    const sfElecId = sfElecRes.body.data.request._id;
    const found = p2Res.body.data.items.find((it) => it._id === sfElecId);
    expect(found).toBeUndefined();
  });

  it('12. should exclude requests for suspended provider', async () => {
    // Suspend Provider 1
    await ProviderProfile.findByIdAndUpdate(provider1Profile._id, {
      verificationStatus: PROVIDER_VERIFICATION_STATUS.SUSPENDED,
    });

    const res = await request(app)
      .get('/api/v1/provider-requests')
      .set('Authorization', `Bearer ${provider1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);

    // Restore Provider 1
    await ProviderProfile.findByIdAndUpdate(provider1Profile._id, {
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
    });
  });

  // ==========================================
  // PART C — QUOTE CREATION & VALIDATION TESTS
  // ==========================================

  it('13. should allow eligible provider to submit a valid quote', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const res = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        amount: 250,
        currency: 'INR',
        estimatedDuration: 2.5,
        description: 'I can replace the damaged P-trap with PVC pipes and guarantee no leaks.',
        validUntil: futureDate.toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quote.amount).toBe(250);
    expect(res.body.data.quote.currency).toBe('INR');
    expect(res.body.data.quote.status).toBe(QUOTE_STATUS.SUBMITTED);
    expect(res.body.data.quote.provider._id).toBe(provider1User._id);

    // Verify service request transitioned to QUOTING
    const updatedReq = await ServiceRequest.findById(sfPlumbingRequest._id);
    expect(updatedReq.status).toBe(SERVICE_REQUEST_STATUS.QUOTING);
  });

  it('14. should reject ineligible provider attempting to submit quote with 403 Forbidden', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    // Provider 2 is Electrician in Oakland, ineligible for Plumbing in SF
    const res = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider2Token}`)
      .send({
        amount: 300,
        currency: 'INR',
        estimatedDuration: 3,
        description: 'I want to quote on this plumbing job.',
        validUntil: futureDate.toISOString(),
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not eligible/i);
  });

  it('15. should reject CUSTOMER attempting to submit quote with 403 Forbidden', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const res = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        amount: 200,
        currency: 'INR',
        estimatedDuration: 2,
        description: 'Customer quote',
        validUntil: futureDate.toISOString(),
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('16. should reject duplicate active quote from same provider on same request with 409 Conflict', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const payload = {
      amount: 250,
      currency: 'INR',
      estimatedDuration: 2.5,
      description: 'First quote submission.',
      validUntil: futureDate.toISOString(),
    };

    // First quote
    const firstRes = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send(payload);

    expect(firstRes.status).toBe(201);

    // Duplicate quote
    const duplicateRes = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send(payload);

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.error.code).toBe('DUPLICATE_ACTIVE_QUOTE');
  });

  it('17. should reject negative or zero quote amount with 422 Unprocessable Entity', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const res = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        amount: -50,
        currency: 'INR',
        estimatedDuration: 2,
        description: 'Negative amount quote',
        validUntil: futureDate.toISOString(),
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('18. should reject negative or zero estimated duration with 422 Unprocessable Entity', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const res = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        amount: 200,
        currency: 'INR',
        estimatedDuration: -1,
        description: 'Negative duration quote',
        validUntil: futureDate.toISOString(),
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('19. should reject quote with past validUntil with 422 Unprocessable Entity', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const res = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        amount: 200,
        currency: 'INR',
        estimatedDuration: 2,
        description: 'Past validity quote',
        validUntil: pastDate.toISOString(),
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  // ==========================================
  // PART D — QUOTE OWNERSHIP & QUERYING TESTS
  // ==========================================

  it('20. should allow provider to list their own submitted quotes', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        amount: 275,
        currency: 'INR',
        estimatedDuration: 2,
        description: 'Professional plumbing diagnostic and fix.',
        validUntil: futureDate.toISOString(),
      });

    const res = await request(app)
      .get('/api/v1/providers/quotes')
      .set('Authorization', `Bearer ${provider1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].amount).toBe(275);
  });

  it('21. should prevent Provider 2 from viewing Provider 1 private quote with 403 or 404', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const createRes = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        amount: 275,
        currency: 'INR',
        estimatedDuration: 2,
        description: 'Provider 1 quote',
        validUntil: futureDate.toISOString(),
      });

    const quoteId = createRes.body.data.quote._id;

    // Provider 2 queries quote
    const p2Res = await request(app)
      .get(`/api/v1/providers/quotes/${quoteId}`)
      .set('Authorization', `Bearer ${provider2Token}`);

    expect([403, 404]).toContain(p2Res.status);
    expect(p2Res.body.success).toBe(false);
  });

  it('22. should allow customer to view quotes submitted for their own service request', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        amount: 275,
        currency: 'INR',
        estimatedDuration: 2,
        description: 'Professional plumbing diagnostic and fix.',
        validUntil: futureDate.toISOString(),
      });

    const res = await request(app)
      .get(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].amount).toBe(275);
    // Inspection automatically marks quote as VIEWED
    expect(res.body.data.items[0].status).toBe(QUOTE_STATUS.VIEWED);
    // Provider summary contains safe details
    expect(res.body.data.items[0].providerProfile.businessName).toBe('Mario Master Plumbing LLC');
    // Does NOT contain internal docs or notes
    expect(res.body.data.items[0].providerProfile.documents).toBeUndefined();
  });

  it('23. should prevent Customer 2 from accessing Customer 1 request quotes with 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${customer2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('24. should allow provider to withdraw a submitted quote before acceptance', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const createRes = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        amount: 275,
        currency: 'INR',
        estimatedDuration: 2,
        description: 'Quote to be withdrawn.',
        validUntil: futureDate.toISOString(),
      });

    const quoteId = createRes.body.data.quote._id;

    const withdrawRes = await request(app)
      .patch(`/api/v1/providers/quotes/${quoteId}/withdraw`)
      .set('Authorization', `Bearer ${provider1Token}`);

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.success).toBe(true);
    expect(withdrawRes.body.data.quote.status).toBe(QUOTE_STATUS.WITHDRAWN);

    // Verify in database
    const dbQuote = await Quote.findById(quoteId);
    expect(dbQuote.status).toBe(QUOTE_STATUS.WITHDRAWN);
  });

  it('25. should reject invalid quote state transitions with 400 Bad Request', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const createRes = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        amount: 275,
        currency: 'INR',
        estimatedDuration: 2,
        description: 'Quote for transition test.',
        validUntil: futureDate.toISOString(),
      });

    const quoteId = createRes.body.data.quote._id;

    // Customer accepts quote
    const acceptRes = await request(app)
      .patch(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes/${quoteId}/accept`)
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.quote.status).toBe(QUOTE_STATUS.ACCEPTED);

    // Attempt to withdraw after acceptance must be rejected
    const invalidWithdraw = await request(app)
      .patch(`/api/v1/providers/quotes/${quoteId}/withdraw`)
      .set('Authorization', `Bearer ${provider1Token}`);

    expect(invalidWithdraw.status).toBe(400);
    expect(invalidWithdraw.body.success).toBe(false);
  });

  // ==========================================
  // PART E — SECURITY & SPOOFING TESTS
  // ==========================================

  it('26. should prevent provider ID spoofing by ignoring body provider field and using token principal', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    // Provider 1 tries to pass Provider 2's user ID in request body
    const res = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        provider: provider2User._id,
        amount: 220,
        currency: 'INR',
        estimatedDuration: 2,
        description: 'Spoof attempt',
        validUntil: futureDate.toISOString(),
      });

    expect(res.status).toBe(201);
    // Saved quote MUST belong to Provider 1 (from token)
    expect(res.body.data.quote.provider._id).toBe(provider1User._id);
  });

  it('27. should prevent customer ID spoofing on request quote acceptance', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const createRes = await request(app)
      .post(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        amount: 220,
        currency: 'INR',
        estimatedDuration: 2,
        description: 'Quote to accept',
        validUntil: futureDate.toISOString(),
      });

    const quoteId = createRes.body.data.quote._id;

    // Customer 2 tries to accept Customer 1's quote
    const res = await request(app)
      .patch(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes/${quoteId}/accept`)
      .set('Authorization', `Bearer ${customer2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('28. should reject unauthenticated requests to protected endpoints with 401 Unauthorized', async () => {
    const availRes = await request(app).get('/api/v1/providers/availability');
    expect(availRes.status).toBe(401);

    const feedRes = await request(app).get('/api/v1/provider-requests');
    expect(feedRes.status).toBe(401);

    const quotesRes = await request(app).get('/api/v1/providers/quotes');
    expect(quotesRes.status).toBe(401);

    const reqQuotesRes = await request(app).get(`/api/v1/service-requests/${sfPlumbingRequest._id}/quotes`);
    expect(reqQuotesRes.status).toBe(401);
  });
});
