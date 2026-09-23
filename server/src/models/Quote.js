/**
 * Quote Model
 * Quotes submitted by Service Providers for customer Service Requests.
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
      index: true,
    },
    estimatedPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDurationHours: {
      type: Number,
      default: 1,
      min: 0.5,
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(QUOTE_STATUS),
      default: QUOTE_STATUS.SUBMITTED,
      index: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for provider quote lookups and duplicate prevention
quoteSchema.index({ serviceRequest: 1, provider: 1 });
quoteSchema.index({ provider: 1, status: 1 });

const Quote = mongoose.model('Quote', quoteSchema);

module.exports = Quote;
