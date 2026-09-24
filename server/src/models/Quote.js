/**
 * Quote Model
 * Formal price estimates submitted by Service Providers for customer Service Requests.
 */

const mongoose = require('mongoose');
const { QUOTE_STATUS } = require('../constants/status');

const quoteSchema = new mongoose.Schema(
  {
    serviceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
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
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Quote amount must be greater than zero'],
    },
    // Backward compatibility alias for estimatedPrice
    estimatedPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
      enum: {
        values: ['INR'],
        message: 'Currency must be INR',
      },
    },
    estimatedDuration: {
      type: Number,
      required: true,
      min: [0.1, 'Estimated duration must be positive'],
    },
    // Backward compatibility alias for estimatedDurationHours
    estimatedDurationHours: {
      type: Number,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: [5, 'Description must be at least 5 characters long'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    // Backward compatibility alias for message
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(QUOTE_STATUS),
      default: QUOTE_STATUS.SUBMITTED,
      index: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    // Backward compatibility alias for expiresAt
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Keep legacy and canonical fields synchronized before validation/save
quoteSchema.pre('validate', function (next) {
  if (this.amount !== undefined && this.estimatedPrice === undefined) {
    this.estimatedPrice = this.amount;
  } else if (this.estimatedPrice !== undefined && this.amount === undefined) {
    this.amount = this.estimatedPrice;
  }

  if (this.estimatedDuration !== undefined && this.estimatedDurationHours === undefined) {
    this.estimatedDurationHours = this.estimatedDuration;
  } else if (this.estimatedDurationHours !== undefined && this.estimatedDuration === undefined) {
    this.estimatedDuration = this.estimatedDurationHours;
  }

  if (this.description !== undefined && !this.message) {
    this.message = this.description;
  } else if (this.message !== undefined && !this.description) {
    this.description = this.message;
  }

  if (this.validUntil !== undefined && !this.expiresAt) {
    this.expiresAt = this.validUntil;
  } else if (this.expiresAt !== undefined && !this.validUntil) {
    this.validUntil = this.expiresAt;
  }

  next();
});

// Compound indexes for provider quote lookups, status filtering, and duplicate prevention
quoteSchema.index({ serviceRequest: 1, provider: 1 });
quoteSchema.index({ provider: 1, status: 1 });
quoteSchema.index({ serviceRequest: 1, status: 1 });

const Quote = mongoose.model('Quote', quoteSchema);

module.exports = Quote;
