/**
 * ServiceCategory Model
 * Configurable categories (e.g. Appliance Repair, Cleaning, Electrical, Plumbing).
 */

const mongoose = require('mongoose');

const serviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    basePriceEstimate: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ServiceCategory = mongoose.model('ServiceCategory', serviceCategorySchema);

module.exports = ServiceCategory;
