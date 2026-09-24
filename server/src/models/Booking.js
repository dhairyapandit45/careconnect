/**
 * Booking Model
 * Confirmed appointments and agreements between Customer and Provider.
 */

const mongoose = require('mongoose');
const { BOOKING_STATUS } = require('../constants/status');

const bookingSchema = new mongoose.Schema(
  {
    serviceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
    quote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      index: true,
    },
    scheduledStart: {
      type: Date,
      required: true,
      index: true,
    },
    scheduledEnd: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.CONFIRMED,
      index: true,
    },
    cancellationReason: {
      type: String,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    cancellation: {
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      cancelledAt: Date,
      reason: String,
      refundAmount: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Synchronization hook for cancellation fields
bookingSchema.pre('validate', function (next) {
  if (this.cancellationReason && !this.cancellation?.reason) {
    if (!this.cancellation) this.cancellation = {};
    this.cancellation.reason = this.cancellationReason;
  } else if (this.cancellation?.reason && !this.cancellationReason) {
    this.cancellationReason = this.cancellation.reason;
  }

  if (this.cancelledBy && !this.cancellation?.cancelledBy) {
    if (!this.cancellation) this.cancellation = {};
    this.cancellation.cancelledBy = this.cancelledBy;
  } else if (this.cancellation?.cancelledBy && !this.cancelledBy) {
    this.cancelledBy = this.cancellation.cancelledBy;
  }

  if (this.cancelledAt && !this.cancellation?.cancelledAt) {
    if (!this.cancellation) this.cancellation = {};
    this.cancellation.cancelledAt = this.cancelledAt;
  } else if (this.cancellation?.cancelledAt && !this.cancelledAt) {
    this.cancelledAt = this.cancellation.cancelledAt;
  }

  next();
});

// Performance compound indexes
bookingSchema.index({ provider: 1, scheduledStart: 1, scheduledEnd: 1 });
bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ scheduledStart: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
