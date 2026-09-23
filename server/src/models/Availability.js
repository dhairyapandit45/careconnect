/**
 * Availability Model
 * Provider working shifts, blocked days, and recurrence schedules.
 */

const mongoose = require('mongoose');

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
      index: true,
    },
    dayOfWeek: {
      type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      min: 0,
      max: 6,
    },
    startTime: {
      type: String, // "09:00"
      required: true,
    },
    endTime: {
      type: String, // "17:00"
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedDate: {
      type: Date, // For specific override dates
    },
  },
  {
    timestamps: true,
  }
);

availabilitySchema.index({ provider: 1, dayOfWeek: 1 });
availabilitySchema.index({ providerProfile: 1, dayOfWeek: 1 });

const Availability = mongoose.model('Availability', availabilitySchema);

module.exports = Availability;
