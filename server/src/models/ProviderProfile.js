/**
 * ProviderProfile Model
 * Captures verification, credentials, trade categories, skills, service areas, and pricing models.
 */

const mongoose = require('mongoose');
const { PROVIDER_VERIFICATION_STATUS } = require('../constants/status');

const documentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['IDENTITY', 'ADDRESS_PROOF', 'CERTIFICATION', 'BUSINESS_LICENSE', 'OTHER'],
      default: 'OTHER',
    },
    documentType: {
      type: String, // Backwards compatibility alias
    },
    name: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String, // Backwards compatibility alias
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    verifiedAt: {
      type: Date,
    },
  },
  { _id: true }
);

const serviceAreaSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true,
    },
    areas: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    model: {
      type: String,
      enum: ['FIXED', 'HOURLY', 'STARTING_FROM', 'QUOTE_REQUIRED'],
      default: 'HOURLY',
    },
    minimumCharge: {
      type: Number,
      min: [0, 'Minimum charge cannot be negative'],
      default: 0,
    },
    hourlyRate: {
      type: Number,
      min: [0, 'Hourly rate cannot be negative'],
      default: 0,
    },
  },
  { _id: false }
);

const providerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    businessName: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    serviceCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceCategory',
        index: true,
      },
    ],
    serviceAreas: [serviceAreaSchema],
    experienceYears: {
      type: Number,
      default: 0,
      min: [0, 'Experience years cannot be negative'],
    },
    pricing: {
      type: pricingSchema,
      default: () => ({ model: 'HOURLY', minimumCharge: 0, hourlyRate: 0 }),
    },
    hourlyRate: {
      type: Number, // Preserved for backwards compatibility with Milestone 1
      min: 0,
      default: 0,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(PROVIDER_VERIFICATION_STATUS),
      default: PROVIDER_VERIFICATION_STATUS.PENDING,
      index: true,
    },
    verificationNotes: {
      type: String,
      trim: true,
      default: '',
    },
    documents: [documentSchema],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Synchronize legacy hourlyRate before saving
providerProfileSchema.pre('save', function (next) {
  if (this.pricing && this.pricing.hourlyRate !== undefined) {
    this.hourlyRate = this.pricing.hourlyRate;
  }
  next();
});

// Strategic compound indexes for queries, filtering, and future provider matching
providerProfileSchema.index({ serviceCategories: 1, verificationStatus: 1 });
providerProfileSchema.index({ 'serviceAreas.city': 1, verificationStatus: 1 });
providerProfileSchema.index({ rating: -1, verificationStatus: 1 });

const ProviderProfile = mongoose.model('ProviderProfile', providerProfileSchema);

module.exports = ProviderProfile;
