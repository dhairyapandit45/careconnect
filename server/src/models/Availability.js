/**
 * Availability Model
 * Provider working shifts, weekly recurrence schedules, and blocked days.
 */

const mongoose = require('mongoose');
const { DAYS_OF_WEEK } = require('../constants/status');

const DAY_MAP_FROM_NUM = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

const availabilitySchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    providerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProviderProfile',
      required: true,
      index: true,
    },
    dayOfWeek: {
      type: String,
      enum: Object.values(DAYS_OF_WEEK),
      required: true,
      uppercase: true,
      set: (val) => {
        if (typeof val === 'number' && DAY_MAP_FROM_NUM[val]) {
          return DAY_MAP_FROM_NUM[val];
        }
        return typeof val === 'string' ? val.toUpperCase() : val;
      },
    },
    startTime: {
      type: String, // 24-hr "09:00"
      required: true,
      trim: true,
    },
    endTime: {
      type: String, // 24-hr "17:00"
      required: true,
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedDate: {
      type: Date, // For specific calendar override dates
    },
  },
  {
    timestamps: true,
  }
);

// Strategic compound indexes for weekly schedule queries
availabilitySchema.index({ providerProfile: 1, dayOfWeek: 1 });
availabilitySchema.index({ provider: 1, dayOfWeek: 1 });

const Availability = mongoose.model('Availability', availabilitySchema);

module.exports = Availability;
