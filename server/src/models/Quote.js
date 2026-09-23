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
    estimatedPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDurationHours: {
      type: Number,
      default: 1,
    },
    message: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(QUOTE_STATUS),
      default: QUOTE_STATUS.PENDING,
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

const Quote = mongoose.model('Quote', quoteSchema);

module.exports = Quote;
