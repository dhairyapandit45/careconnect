/**
 * Provider Availability Service
 * Manages provider weekly schedules, shift windows, and overlap prevention.
 */

const Availability = require('../models/Availability');
const ProviderProfile = require('../models/ProviderProfile');
const { ApiError } = require('../utils/apiError');

/**
 * Checks if two time intervals overlap (assuming both on same day, in HH:mm 24-hr format)
 * Interval 1: [start1, end1], Interval 2: [start2, end2]
 * Overlap condition: start1 < end2 && end1 > start2
 */
const isTimeOverlapping = (start1, end1, start2, end2) => {
  return start1 < end2 && end1 > start2;
};

/**
 * Retrieves all availability shifts for authenticated provider
 * @param {string} userId
 */
const getProviderAvailability = async (userId) => {
  const profile = await ProviderProfile.findOne({ user: userId });
  if (!profile) {
    return [];
  }

  const shifts = await Availability.find({ providerProfile: profile._id })
    .sort({ dayOfWeek: 1, startTime: 1 });

  return shifts;
};

/**
 * Creates new availability slot for provider with overlap checking
 * @param {string} userId
 * @param {Object} data - { dayOfWeek, startTime, endTime, isAvailable, isBlocked, blockedDate }
 */
const createAvailability = async (userId, data) => {
  const profile = await ProviderProfile.findOne({ user: userId });
  if (!profile) {
    throw ApiError.notFound('Provider profile not found. Please complete profile onboarding first.');
  }

  const dayOfWeek = (data.dayOfWeek || '').toUpperCase();
  const startTime = data.startTime.trim();
  const endTime = data.endTime.trim();

  // Check for overlapping shifts on the same day for this provider
  const existingShifts = await Availability.find({
    providerProfile: profile._id,
    dayOfWeek,
    isBlocked: false,
  });

  for (const shift of existingShifts) {
    if (isTimeOverlapping(startTime, endTime, shift.startTime, shift.endTime)) {
      throw new ApiError(
        400,
        `Availability overlaps with an existing shift (${shift.startTime} - ${shift.endTime}) on ${dayOfWeek}`,
        'OVERLAPPING_AVAILABILITY'
      );
    }
  }

  const newShift = await Availability.create({
    provider: userId,
    providerProfile: profile._id,
    dayOfWeek,
    startTime,
    endTime,
    isAvailable: data.isAvailable !== false,
    isBlocked: Boolean(data.isBlocked),
    blockedDate: data.blockedDate || null,
  });

  return newShift;
};

/**
 * Updates an existing availability shift with ownership and overlap validation
 * @param {string} userId
 * @param {string} availabilityId
 * @param {Object} data
 */
const updateAvailability = async (userId, availabilityId, data) => {
  const shift = await Availability.findById(availabilityId);
  if (!shift) {
    throw ApiError.notFound('Availability schedule record not found');
  }

  // Enforce strict ownership
  if (!shift.provider.equals(userId)) {
    throw ApiError.forbidden('Access denied: You do not have permission to modify another provider\'s availability');
  }

  const targetDay = (data.dayOfWeek || shift.dayOfWeek).toUpperCase();
  const targetStart = data.startTime ? data.startTime.trim() : shift.startTime;
  const targetEnd = data.endTime ? data.endTime.trim() : shift.endTime;

  if (targetStart >= targetEnd) {
    throw ApiError.badRequest('End time must be strictly after start time');
  }

  // Check overlaps against all other shifts of this provider on targetDay
  const otherShifts = await Availability.find({
    _id: { $ne: availabilityId },
    providerProfile: shift.providerProfile,
    dayOfWeek: targetDay,
    isBlocked: false,
  });

  for (const other of otherShifts) {
    if (isTimeOverlapping(targetStart, targetEnd, other.startTime, other.endTime)) {
      throw new ApiError(
        400,
        `Availability overlaps with an existing shift (${other.startTime} - ${other.endTime}) on ${targetDay}`,
        'OVERLAPPING_AVAILABILITY'
      );
    }
  }

  shift.dayOfWeek = targetDay;
  shift.startTime = targetStart;
  shift.endTime = targetEnd;
  if (data.isAvailable !== undefined) shift.isAvailable = Boolean(data.isAvailable);
  if (data.isBlocked !== undefined) shift.isBlocked = Boolean(data.isBlocked);
  if (data.blockedDate !== undefined) shift.blockedDate = data.blockedDate;

  await shift.save();
  return shift;
};

/**
 * Deletes an availability record with ownership enforcement
 * @param {string} userId
 * @param {string} availabilityId
 */
const deleteAvailability = async (userId, availabilityId) => {
  const shift = await Availability.findById(availabilityId);
  if (!shift) {
    throw ApiError.notFound('Availability schedule record not found');
  }

  // Enforce ownership
  if (!shift.provider.equals(userId)) {
    throw ApiError.forbidden('Access denied: You do not have permission to delete another provider\'s availability');
  }

  await shift.deleteOne();
  return { id: availabilityId, deleted: true };
};

module.exports = {
  getProviderAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
};
