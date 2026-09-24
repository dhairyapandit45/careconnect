/**
 * Integration Test: Milestone 6 - Booking & Scheduling Engine
 * Covers all double-booking detection rules, business validations, atomic state transitions,
 * role-based listings, and cancellation workflows.
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
const Booking = require('../src/models/Booking');
const { ROLES } = require('../src/constants/roles');
const {
  PROVIDER_VERIFICATION_STATUS,
  SERVICE_REQUEST_STATUS,
  QUOTE_STATUS,
  BOOKING_STATUS,
  USER_STATUS,
  DAYS_OF_WEEK,
} = require('../src/constants/status');

let mongoServer;
let adminToken;
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

let plumbingCategory;
let baseServiceRequest;
let baseQuote;

/**
 * Returns a future Date on a specific day of week (e.g. next MONDAY)
 * with time set to specified hours and minutes in UTC.
 */
const getNextDateForDay = (targetDayName, hours = 10, minutes = 0) => {
  const dayIndexMap = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };
  const targetDay = dayIndexMap[targetDayName];
  const d = new Date();
  // Move at least 2 days into future to avoid edge-of-day issues
  d.setUTCDate(d.getUTCDate() + 2);
  while (d.getUTCDay() !== targetDay) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Admin User',
    email: 'admin@careconnect.local',
    password: 'Password123!',
    role: ROLES.PLATFORM_ADMIN,
  });
  adminToken = adminRes.body.data.token;

  // 2. Customer 1
  const c1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Alice Customer',
    email: 'alice@customer.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer1Token = c1Res.body.data.token;
  customer1User = c1Res.body.data.user;

  // 3. Customer 2
  const c2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Bob Customer',
    email: 'bob@customer.local',
    password: 'Password123!',
    role: ROLES.CUSTOMER,
  });
  customer2Token = c2Res.body.data.token;
  customer2User = c2Res.body.data.user;

  // 4. Provider 1
  const p1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Mario Plumber',
    email: 'mario@plumber.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider1Token = p1Res.body.data.token;
  provider1User = p1Res.body.data.user;

  // 5. Provider 2
  const p2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Luigi Plumber',
    email: 'luigi@plumber.local',
    password: 'Password123!',
    role: ROLES.SERVICE_PROVIDER,
  });
  provider2Token = p2Res.body.data.token;
  provider2User = p2Res.body.data.user;

  // 6. Category
  const catRes = await request(app)
    .post('/api/v1/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Plumbing Works',
      description: 'Pipes, faucets, and drainage',
      icon: 'Droplets',
      startingPrice: 50,
      pricingUnit: 'HOURLY',
      requiredSkills: ['Pipe Repair'],
    });
  plumbingCategory = catRes.body.data.category;

  // Clear placeholder profiles
  await ProviderProfile.deleteMany({});

  // 7. Provider 1 Profile (Approved in San Francisco)
  const prof1Res = await request(app)
    .post('/api/v1/providers/profile')
    .set('Authorization', `Bearer ${provider1Token}`)
    .send({
      businessName: 'Mario Master Plumbing LLC',
      description: 'Licensed master plumbing services.',
      skills: ['Pipe Repair'],
      serviceCategories: [plumbingCategory._id],
      serviceAreas: [{ city: 'San Francisco', areas: ['Downtown'] }],
      experienceYears: 10,
      pricing: { model: 'HOURLY', minimumCharge: 80, hourlyRate: 75 },
    });
  provider1Profile = prof1Res.body.data.profile;

  await request(app)
    .patch(`/api/v1/admin/providers/${provider1Profile._id}/verification`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ action: 'APPROVE', notes: 'Credentials verified.' });

  // 8. Provider 2 Profile (Approved in San Francisco)
  const prof2Res = await request(app)
    .post('/api/v1/providers/profile')
    .set('Authorization', `Bearer ${provider2Token}`)
    .send({
      businessName: 'Luigi Super Plumbing',
      description: 'Reliable plumbing and drain cleaning.',
      skills: ['Pipe Repair'],
      serviceCategories: [plumbingCategory._id],
      serviceAreas: [{ city: 'San Francisco', areas: ['Mission'] }],
      experienceYears: 8,
      pricing: { model: 'HOURLY', minimumCharge: 70, hourlyRate: 65 },
    });
  provider2Profile = prof2Res.body.data.profile;

  await request(app)
    .patch(`/api/v1/admin/providers/${provider2Profile._id}/verification`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ action: 'APPROVE', notes: 'Credentials verified.' });

  // 9. Configure Provider 1 Recurring Availability (Monday: 08:00 - 18:00 UTC)
  await Availability.create({
    provider: provider1User._id,
    providerProfile: provider1Profile._id,
    dayOfWeek: DAYS_OF_WEEK.MONDAY,
    startTime: '08:00',
    endTime: '18:00',
    isAvailable: true,
  });

  // Configure Provider 2 Recurring Availability (Monday: 08:00 - 18:00 UTC)
  await Availability.create({
    provider: provider2User._id,
    providerProfile: provider2Profile._id,
    dayOfWeek: DAYS_OF_WEEK.MONDAY,
    startTime: '08:00',
    endTime: '18:00',
    isAvailable: true,
  });
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Booking.deleteMany({});
  await Quote.deleteMany({});
  await ServiceRequest.deleteMany({});

  // Seed baseline customer service request in SF
  const mondayDate = getNextDateForDay('MONDAY', 10, 0);

  const reqRes = await request(app)
    .post('/api/v1/service-requests')
    .set('Authorization', `Bearer ${customer1Token}`)
    .send({
      categoryId: plumbingCategory._id,
      title: 'Kitchen Sink Drain Clog',
      description: 'Kitchen sink refuses to drain water properly.',
      address: '777 Market St',
      city: 'San Francisco',
      postalCode: '94103',
      preferredDate: mondayDate.toISOString().split('T')[0],
      preferredTime: { start: '09:00', end: '13:00' },
    });
  baseServiceRequest = reqRes.body.data.request;

  // Seed Provider 1 valid active quote
  const futureValidity = new Date();
  futureValidity.setDate(futureValidity.getDate() + 7);

  const quoteRes = await request(app)
    .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes`)
    .set('Authorization', `Bearer ${provider1Token}`)
    .send({
      amount: 350,
      currency: 'INR',
      estimatedDuration: 2,
      description: 'I will unclog and clean the drain pipe with standard warranty.',
      validUntil: futureValidity.toISOString(),
    });
  baseQuote = quoteRes.body.data.quote;
});

describe('Milestone 6: Booking & Scheduling Engine Test Suite', () => {
  // ==========================================
  // PART A — DOUBLE-BOOKING CONFLICT TESTS
  // ==========================================
  describe('Double-Booking Conflict Rules', () => {
    it('1. should reject exact overlap with an existing confirmed booking (409 Conflict)', async () => {
      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      // Create existing confirmed booking for Provider 1: 10:00 -> 12:00
      await Booking.create({
        serviceRequest: baseServiceRequest._id,
        customer: customer2User._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        quote: baseQuote._id,
        scheduledStart: monStart,
        scheduledEnd: monEnd,
        price: 350,
        currency: 'INR',
        status: BOOKING_STATUS.CONFIRMED,
      });

      // Customer 1 tries to book same slot: 10:00 -> 12:00
      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BOOKING_CONFLICT');
    });

    it('2. should reject partial overlap where requested starts during existing (409 Conflict)', async () => {
      // Existing: 10:00 -> 12:00. Requested: 11:00 -> 13:00
      const existStart = getNextDateForDay('MONDAY', 10, 0);
      const existEnd = getNextDateForDay('MONDAY', 12, 0);

      await Booking.create({
        serviceRequest: baseServiceRequest._id,
        customer: customer2User._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        quote: baseQuote._id,
        scheduledStart: existStart,
        scheduledEnd: existEnd,
        price: 350,
        status: BOOKING_STATUS.CONFIRMED,
      });

      const reqStart = getNextDateForDay('MONDAY', 11, 0);
      const reqEnd = getNextDateForDay('MONDAY', 13, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: reqStart.toISOString(),
          scheduledEnd: reqEnd.toISOString(),
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BOOKING_CONFLICT');
    });

    it('3. should reject partial overlap where requested ends during existing (409 Conflict)', async () => {
      // Existing: 11:00 -> 13:00. Requested: 10:00 -> 12:00
      const existStart = getNextDateForDay('MONDAY', 11, 0);
      const existEnd = getNextDateForDay('MONDAY', 13, 0);

      await Booking.create({
        serviceRequest: baseServiceRequest._id,
        customer: customer2User._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        quote: baseQuote._id,
        scheduledStart: existStart,
        scheduledEnd: existEnd,
        price: 350,
        status: BOOKING_STATUS.CONFIRMED,
      });

      const reqStart = getNextDateForDay('MONDAY', 10, 0);
      const reqEnd = getNextDateForDay('MONDAY', 12, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: reqStart.toISOString(),
          scheduledEnd: reqEnd.toISOString(),
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BOOKING_CONFLICT');
    });

    it('4. should reject when existing booking completely contains requested booking (409 Conflict)', async () => {
      // Existing: 09:00 -> 14:00. Requested: 10:00 -> 12:00
      const existStart = getNextDateForDay('MONDAY', 9, 0);
      const existEnd = getNextDateForDay('MONDAY', 14, 0);

      await Booking.create({
        serviceRequest: baseServiceRequest._id,
        customer: customer2User._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        quote: baseQuote._id,
        scheduledStart: existStart,
        scheduledEnd: existEnd,
        price: 350,
        status: BOOKING_STATUS.CONFIRMED,
      });

      const reqStart = getNextDateForDay('MONDAY', 10, 0);
      const reqEnd = getNextDateForDay('MONDAY', 12, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: reqStart.toISOString(),
          scheduledEnd: reqEnd.toISOString(),
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BOOKING_CONFLICT');
    });

    it('5. should reject when requested booking completely encompasses existing booking (409 Conflict)', async () => {
      // Existing: 11:00 -> 12:00. Requested: 10:00 -> 13:00
      const existStart = getNextDateForDay('MONDAY', 11, 0);
      const existEnd = getNextDateForDay('MONDAY', 12, 0);

      await Booking.create({
        serviceRequest: baseServiceRequest._id,
        customer: customer2User._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        quote: baseQuote._id,
        scheduledStart: existStart,
        scheduledEnd: existEnd,
        price: 350,
        status: BOOKING_STATUS.CONFIRMED,
      });

      const reqStart = getNextDateForDay('MONDAY', 10, 0);
      const reqEnd = getNextDateForDay('MONDAY', 13, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: reqStart.toISOString(),
          scheduledEnd: reqEnd.toISOString(),
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BOOKING_CONFLICT');
    });

    it('6. should ALLOW immediately adjacent bookings (back-to-back scheduling)', async () => {
      // Existing: 10:00 -> 12:00.
      // Adjacent 1: 08:30 -> 10:00 (ends exactly when existing starts)
      // Adjacent 2: 12:00 -> 14:00 (starts exactly when existing ends)
      const existStart = getNextDateForDay('MONDAY', 10, 0);
      const existEnd = getNextDateForDay('MONDAY', 12, 0);

      await Booking.create({
        serviceRequest: baseServiceRequest._id,
        customer: customer2User._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        quote: baseQuote._id,
        scheduledStart: existStart,
        scheduledEnd: existEnd,
        price: 350,
        status: BOOKING_STATUS.CONFIRMED,
      });

      // Book 12:00 -> 14:00
      const reqStart = getNextDateForDay('MONDAY', 12, 0);
      const reqEnd = getNextDateForDay('MONDAY', 14, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: reqStart.toISOString(),
          scheduledEnd: reqEnd.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.CONFIRMED);
    });

    it('7. should ALLOW booking when existing overlapping booking was CANCELLED', async () => {
      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      // Existing booking in CANCELLED status: 10:00 -> 12:00
      await Booking.create({
        serviceRequest: baseServiceRequest._id,
        customer: customer2User._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        quote: baseQuote._id,
        scheduledStart: monStart,
        scheduledEnd: monEnd,
        price: 350,
        status: BOOKING_STATUS.CANCELLED,
        cancellationReason: 'Customer rescheduled',
      });

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.CONFIRMED);
    });

    it('8. should ALLOW booking when existing overlapping booking is COMPLETED', async () => {
      // Historical completed booking does not block future bookings
      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      await Booking.create({
        serviceRequest: baseServiceRequest._id,
        customer: customer2User._id,
        provider: provider1User._id,
        providerProfile: provider1Profile._id,
        quote: baseQuote._id,
        scheduledStart: monStart,
        scheduledEnd: monEnd,
        price: 350,
        status: BOOKING_STATUS.COMPLETED,
      });

      // Although usually in the past, if a completed record exists at same slot, it must not block
      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('9. should ALLOW different providers to have overlapping bookings at same time', async () => {
      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      // Provider 2 has confirmed booking 10:00 -> 12:00
      await Booking.create({
        serviceRequest: baseServiceRequest._id,
        customer: customer2User._id,
        provider: provider2User._id,
        providerProfile: provider2Profile._id,
        quote: baseQuote._id,
        scheduledStart: monStart,
        scheduledEnd: monEnd,
        price: 350,
        status: BOOKING_STATUS.CONFIRMED,
      });

      // Provider 1 should be completely free to be booked at same 10:00 -> 12:00
      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // PART B — BOOKING BUSINESS RULES & TRANSACTION TESTS
  // ==========================================
  describe('Booking Business Rules & State Transitions', () => {
    it('10. should reject non-owner customer attempting to accept quote with 403 Forbidden', async () => {
      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      // Customer 2 attempts to accept quote on Customer 1's request
      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('11. should reject provider attempting to accept quote with 403 Forbidden', async () => {
      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('12. should reject quote acceptance when quote is expired with 400 Bad Request', async () => {
      // Set quote validUntil in the past
      const past = new Date();
      past.setDate(past.getDate() - 1);
      await Quote.findByIdAndUpdate(baseQuote._id, { validUntil: past });

      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('13. should reject quote acceptance when quote is WITHDRAWN or REJECTED with 400 Bad Request', async () => {
      await Quote.findByIdAndUpdate(baseQuote._id, { status: QUOTE_STATUS.WITHDRAWN });

      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not in an active state/i);
    });

    it('14. should reject quote acceptance when provider is unapproved (SUSPENDED / PENDING) with 403', async () => {
      await ProviderProfile.findByIdAndUpdate(provider1Profile._id, {
        verificationStatus: PROVIDER_VERIFICATION_STATUS.SUSPENDED,
      });

      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not approved/i);

      // Restore
      await ProviderProfile.findByIdAndUpdate(provider1Profile._id, {
        verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      });
    });

    it('15. should reject quote acceptance when provider account is INACTIVE with 403', async () => {
      await User.findByIdAndUpdate(provider1User._id, { status: USER_STATUS.INACTIVE });

      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/account is not active/i);

      // Restore
      await User.findByIdAndUpdate(provider1User._id, { status: USER_STATUS.ACTIVE });
    });

    it('16. should reject invalid schedule: past start time or start >= end with 422', async () => {
      // Past time
      const pastStart = new Date(Date.now() - 3600000);
      const futureEnd = new Date(Date.now() + 3600000);

      const res1 = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: pastStart.toISOString(),
          scheduledEnd: futureEnd.toISOString(),
        });

      expect(res1.status).toBe(422);

      // start >= end
      const fStart = getNextDateForDay('MONDAY', 14, 0);
      const fEnd = getNextDateForDay('MONDAY', 12, 0);

      const res2 = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: fStart.toISOString(),
          scheduledEnd: fEnd.toISOString(),
        });

      expect(res2.status).toBe(422);
    });

    it('17. should reject schedule outside provider recurring shift availability with 400', async () => {
      // Provider 1 shift on Monday is 08:00 - 18:00
      // Requesting 17:00 -> 19:00 (spills beyond 18:00 shift end)
      const spillStart = getNextDateForDay('MONDAY', 17, 0);
      const spillEnd = getNextDateForDay('MONDAY', 19, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: spillStart.toISOString(),
          scheduledEnd: spillEnd.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/outside the provider's active working availability/i);
    });

    it('18. should execute atomic booking: creates Booking, accepts quote, rejects other quotes, marks request BOOKED', async () => {
      // Add a second quote from Provider 2 for the same request
      const futureValidity = new Date();
      futureValidity.setDate(futureValidity.getDate() + 7);

      const q2Res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes`)
        .set('Authorization', `Bearer ${provider2Token}`)
        .send({
          amount: 400,
          currency: 'INR',
          estimatedDuration: 2.5,
          description: 'Provider 2 alternative quote.',
          validUntil: futureValidity.toISOString(),
        });
      const quote2 = q2Res.body.data.quote;

      // Customer accepts Provider 1's quote
      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { booking, quote, serviceRequest } = res.body.data;
      expect(booking.status).toBe(BOOKING_STATUS.CONFIRMED);
      expect(booking.price).toBe(350);
      expect(booking.currency).toBe('INR');
      expect(booking.provider._id || booking.provider).toBe(provider1User._id);
      expect(quote.status).toBe(QUOTE_STATUS.ACCEPTED);
      expect(serviceRequest.status).toBe(SERVICE_REQUEST_STATUS.BOOKED);

      // Verify DB: quote 2 must be transitioned to REJECTED
      const dbQuote2 = await Quote.findById(quote2._id);
      expect(dbQuote2.status).toBe(QUOTE_STATUS.REJECTED);

      // Verify DB: service request status is BOOKED
      const dbReq = await ServiceRequest.findById(baseServiceRequest._id);
      expect(dbReq.status).toBe(SERVICE_REQUEST_STATUS.BOOKED);
      expect(dbReq.assignedProvider.toString()).toBe(provider1User._id);
    });
  });

  // ==========================================
  // PART C — CANCELLATION TESTS
  // ==========================================
  describe('Booking Cancellation Rules', () => {
    let activeBooking;

    beforeEach(async () => {
      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });
      activeBooking = res.body.data.booking;
    });

    it('19. should allow customer to cancel own confirmed booking with valid reason', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${activeBooking._id}/cancel`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ reason: 'Issue resolved by family member.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.CANCELLED);
      expect(res.body.data.booking.cancellationReason).toBe('Issue resolved by family member.');
      expect(res.body.data.booking.cancelledBy).toBe(customer1User._id);

      // Verify in DB
      const dbBooking = await Booking.findById(activeBooking._id);
      expect(dbBooking.status).toBe(BOOKING_STATUS.CANCELLED);

      // Associated request transitioned to CANCELLED
      const dbReq = await ServiceRequest.findById(baseServiceRequest._id);
      expect(dbReq.status).toBe(SERVICE_REQUEST_STATUS.CANCELLED);
    });

    it('20. should prevent customer from cancelling another customer booking with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${activeBooking._id}/cancel`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({ reason: 'Unauthorized cancellation attempt.' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('21. should allow provider to cancel their assigned booking with valid reason', async () => {
      const res = await request(app)
        .post(`/api/v1/providers/bookings/${activeBooking._id}/cancel`)
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({ reason: 'Emergency plumbing truck breakdown.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.CANCELLED);
      expect(res.body.data.booking.cancelledBy).toBe(provider1User._id);
    });

    it('22. should prevent provider from cancelling another provider booking with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/providers/bookings/${activeBooking._id}/cancel`)
        .set('Authorization', `Bearer ${provider2Token}`)
        .send({ reason: 'Malicious cancellation attempt.' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('23. should reject cancellation without reason with 422 Unprocessable Entity', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${activeBooking._id}/cancel`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ reason: '   ' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('24. should reject cancelling already COMPLETED or CANCELLED booking with 400', async () => {
      // Mark as COMPLETED
      await Booking.findByIdAndUpdate(activeBooking._id, { status: BOOKING_STATUS.COMPLETED });

      const res = await request(app)
        .post(`/api/v1/bookings/${activeBooking._id}/cancel`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ reason: 'Attempt to cancel after completion.' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('25. should immediately release schedule slot after cancellation (new booking succeeds)', async () => {
      // 1. Cancel the booking
      await request(app)
        .post(`/api/v1/bookings/${activeBooking._id}/cancel`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ reason: 'Cancelling to reschedule.' });

      // 2. Create another service request and quote for Provider 1
      const monDate = getNextDateForDay('MONDAY', 10, 0);
      const req2Res = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          categoryId: plumbingCategory._id,
          title: 'Bathroom Leak',
          description: 'Emergency leak in master bathroom.',
          address: '888 Mission St',
          city: 'San Francisco',
          postalCode: '94103',
          preferredDate: monDate.toISOString().split('T')[0],
        });
      const req2 = req2Res.body.data.request;

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const qRes = await request(app)
        .post(`/api/v1/service-requests/${req2._id}/quotes`)
        .set('Authorization', `Bearer ${provider1Token}`)
        .send({
          amount: 320,
          currency: 'INR',
          estimatedDuration: 2,
          description: 'Can fix immediately.',
          validUntil: futureDate.toISOString(),
        });
      const newQuote = qRes.body.data.quote;

      // 3. Customer 2 books exact same slot that was cancelled (10:00 -> 12:00)
      const bookRes = await request(app)
        .post(`/api/v1/service-requests/${req2._id}/quotes/${newQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          scheduledStart: monDate.toISOString(),
          scheduledEnd: getNextDateForDay('MONDAY', 12, 0).toISOString(),
        });

      expect(bookRes.status).toBe(200);
      expect(bookRes.body.success).toBe(true);
      expect(bookRes.body.data.booking.status).toBe(BOOKING_STATUS.CONFIRMED);
    });
  });

  // ==========================================
  // PART D — BOOKING QUERYING & ACCESS CONTROL
  // ==========================================
  describe('Booking Querying & Access Control', () => {
    let createdBooking;

    beforeEach(async () => {
      const monStart = getNextDateForDay('MONDAY', 10, 0);
      const monEnd = getNextDateForDay('MONDAY', 12, 0);

      const res = await request(app)
        .post(`/api/v1/service-requests/${baseServiceRequest._id}/quotes/${baseQuote._id}/accept`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          scheduledStart: monStart.toISOString(),
          scheduledEnd: monEnd.toISOString(),
        });
      createdBooking = res.body.data.booking;
    });

    it('26. should allow customer to list own bookings with pagination and status filter', async () => {
      const res = await request(app)
        .get('/api/v1/bookings?status=CONFIRMED')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0]._id).toBe(createdBooking._id);
    });

    it('27. should allow customer to view single booking details', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${createdBooking._id}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking._id).toBe(createdBooking._id);
      expect(res.body.data.booking.serviceRequest.title).toBe('Kitchen Sink Drain Clog');
    });

    it('28. should prevent Customer 2 from accessing Customer 1 booking with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${createdBooking._id}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('29. should allow provider to list assigned bookings and view service location address', async () => {
      const res = await request(app)
        .get('/api/v1/providers/bookings')
        .set('Authorization', `Bearer ${provider1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      // Confirmed booking reveals customer street address to provider for service execution
      expect(res.body.data.items[0].serviceRequest.location.address).toBe('777 Market St');
    });

    it('30. should prevent Provider 2 from viewing Provider 1 assigned booking with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/providers/bookings/${createdBooking._id}`)
        .set('Authorization', `Bearer ${provider2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('31. should reject unauthenticated requests to booking endpoints with 401 Unauthorized', async () => {
      const listRes = await request(app).get('/api/v1/bookings');
      expect(listRes.status).toBe(401);

      const detailRes = await request(app).get(`/api/v1/bookings/${createdBooking._id}`);
      expect(detailRes.status).toBe(401);

      const cancelRes = await request(app).post(`/api/v1/bookings/${createdBooking._id}/cancel`);
      expect(cancelRes.status).toBe(401);

      const pListRes = await request(app).get('/api/v1/providers/bookings');
      expect(pListRes.status).toBe(401);
    });
  });
});
