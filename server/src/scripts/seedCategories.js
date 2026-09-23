/**
 * Standalone Category Seed Script
 * Populates realistic default service categories idempotently.
 * Run manually via: npm run seed
 */

const mongoose = require('mongoose');
const { env } = require('../config/env');
const ServiceCategory = require('../models/ServiceCategory');
const { logger } = require('../utils/logger');

const seedCategoriesData = [
  {
    name: 'Appliance Repair',
    slug: 'appliance-repair',
    description: 'Diagnosis and repair for washers, dryers, refrigerators, ovens, dishwashers, and microwaves.',
    icon: 'Wrench',
    startingPrice: 65,
    pricingUnit: 'STARTING_FROM',
    requiredSkills: ['Refrigeration', 'Electrical Diagnostics', 'Motor Replacement', 'Appliance Calibration'],
    isActive: true,
  },
  {
    name: 'Cleaning',
    slug: 'cleaning',
    description: 'Deep residential cleaning, move-out sanitization, kitchen and bathroom disinfection.',
    icon: 'Sparkles',
    startingPrice: 40,
    pricingUnit: 'HOURLY',
    requiredSkills: ['Deep Cleaning', 'Sanitization', 'Carpet Steaming', 'Eco-friendly Product Handling'],
    isActive: true,
  },
  {
    name: 'Electrical',
    slug: 'electrical',
    description: 'Certified electrical work, breaker panel upgrades, lighting installations, wiring inspections, and outlet repairs.',
    icon: 'Zap',
    startingPrice: 85,
    pricingUnit: 'HOURLY',
    requiredSkills: ['Licensed Electrician', 'Circuit Breaker Repair', 'Wiring Installation', 'Surge Protection'],
    isActive: true,
  },
  {
    name: 'Plumbing',
    slug: 'plumbing',
    description: 'Leak detection, pipe repairs, drain cleaning, water heater servicing, and faucet installations.',
    icon: 'Droplets',
    startingPrice: 75,
    pricingUnit: 'STARTING_FROM',
    requiredSkills: ['Master Plumber', 'Pipe Soldering', 'Drain Snaking', 'Water Heater Repair'],
    isActive: true,
  },
  {
    name: 'Home Maintenance',
    slug: 'home-maintenance',
    description: 'General handyman repairs, dry wall patching, door and window fitting, caulking, and fixture assembly.',
    icon: 'Hammer',
    startingPrice: 50,
    pricingUnit: 'HOURLY',
    requiredSkills: ['Drywall Patching', 'Carpentry', 'Weatherproofing', 'Furniture Assembly'],
    isActive: true,
  },
];

const seedCategories = async () => {
  try {
    logger.info('Connecting to MongoDB for category seeding...');
    await mongoose.connect(env.MONGODB_URI);
    logger.info('MongoDB connected.');

    for (const cat of seedCategoriesData) {
      const existing = await ServiceCategory.findOne({ slug: cat.slug });
      if (existing) {
        logger.info(`Category "${cat.name}" already exists (${cat.slug}). Updating defaults...`);
        await ServiceCategory.findByIdAndUpdate(existing._id, cat);
      } else {
        await ServiceCategory.create(cat);
        logger.info(`Created category "${cat.name}" with starting price $${cat.startingPrice}.`);
      }
    }

    logger.info('✅ Service category seeding completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  seedCategories();
}

module.exports = {
  seedCategoriesData,
  seedCategories,
};
