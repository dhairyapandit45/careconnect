/**
 * ServiceCategory Model
 * Configurable categories for home services (Appliance Repair, Cleaning, Electrical, Plumbing, Maintenance).
 */

const mongoose = require('mongoose');

const PRICING_UNITS = ['FIXED', 'HOURLY', 'STARTING_FROM', 'QUOTE_REQUIRED'];

const serviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters long'],
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    icon: {
      type: String,
      default: 'Wrench',
      trim: true,
    },
    startingPrice: {
      type: Number,
      default: 0,
      min: [0, 'Starting price cannot be negative'],
    },
    pricingUnit: {
      type: String,
      enum: {
        values: PRICING_UNITS,
        message: '{VALUE} is not a valid pricing unit',
      },
      default: 'STARTING_FROM',
    },
    requiredSkills: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Backward compatibility virtual for basePriceEstimate
serviceCategorySchema.virtual('basePriceEstimate').get(function () {
  return this.startingPrice;
});

const ServiceCategory = mongoose.model('ServiceCategory', serviceCategorySchema);

module.exports = ServiceCategory;
module.exports.PRICING_UNITS = PRICING_UNITS;
