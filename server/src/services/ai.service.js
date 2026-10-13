/**
 * AI Service Layer
 * Delivers deterministic, explainable AI capabilities for:
 * 1. Request Category Classification (with domain keyword intelligence and graceful fallback)
 * 2. Intelligent Provider Matching (multi-criteria scoring with transparent explanations)
 * 
 * Works completely reliably offline / locally without requiring paid external API keys,
 * while allowing optional adapter extension.
 */

const mongoose = require('mongoose');
const ServiceCategory = require('../models/ServiceCategory');
const ProviderProfile = require('../models/ProviderProfile');
const Job = require('../models/Job');
const { USER_STATUS, PROVIDER_VERIFICATION_STATUS, JOB_STATUS } = require('../constants/status');
const { ApiError } = require('../utils/apiError');

/**
 * Domain-specific keyword taxonomy mapped to category slugs.
 * Expands beyond literal category titles to capture authentic user intent.
 */
const DOMAIN_KEYWORDS_BY_SLUG = {
  plumbing: [
    'plumb', 'plumber', 'pipe', 'pipes', 'leak', 'leaks', 'leaking', 'leakage',
    'drain', 'drains', 'drainage', 'sink', 'sinks', 'toilet', 'faucet', 'faucets',
    'tap', 'taps', 'shower', 'sewage', 'clog', 'clogged', 'clogging', 'water heater',
    'geyser', 'flush', 'flush valve', 'pipe burst', 'overflow', 'p-trap', 'commode',
    'water pressure', 'dripping', 'plumbing fixture'
  ],
  electrical: [
    'electric', 'electrical', 'electrician', 'wire', 'wires', 'wiring', 'circuit',
    'breaker', 'circuit breaker', 'fuse', 'fuse box', 'power outage', 'spark', 'sparks',
    'shock', 'switch', 'switches', 'outlet', 'outlets', 'socket', 'sockets', 'lighting',
    'light fixture', 'fan', 'ceiling fan', 'mcb', 'short circuit', 'voltage', 'inverter',
    'generator', 'tripping', 'earthing', 'chandelier', 'bulb', 'led'
  ],
  cleaning: [
    'clean', 'cleaning', 'deep clean', 'deep cleaning', 'sanitize', 'sanitization',
    'disinfect', 'disinfection', 'vacuum', 'vacuuming', 'mop', 'mopping', 'dust',
    'dusting', 'carpet', 'stain', 'stains', 'kitchen clean', 'bathroom clean', 'maid',
    'housekeeping', 'scrub', 'scrubbing', 'wash', 'pest', 'trash', 'sanitary', 'floor'
  ],
  'appliance-repair': [
    'appliance', 'appliances', 'fridge', 'refrigerator', 'washer', 'washing machine',
    'dryer', 'oven', 'stove', 'microwave', 'dishwasher', 'cooktop', 'freezer',
    'not cooling', 'not heating', 'drum', 'compressor', 'heating element', 'grill',
    'chimney', 'mixer', 'grinder', 'ro filter', 'water purifier', 'ac', 'air conditioner'
  ],
  'home-maintenance': [
    'handyman', 'maintenance', 'drywall', 'patch', 'patching', 'carpenter', 'carpentry',
    'wood', 'woodwork', 'door', 'doors', 'window', 'windows', 'hinge', 'hinges', 'lock',
    'locks', 'locksmith', 'furniture', 'shelf', 'shelves', 'table', 'chair', 'cabinet',
    'caulk', 'caulking', 'weatherproof', 'curtain', 'blind', 'assembly', 'drill', 'drilling',
    'masonry', 'paint', 'painting', 'screws', 'mounting', 'tv mount'
  ],
};

/**
 * Classifies a user's service request into the most fitting ServiceCategory.
 * 
 * @param {Object} input - { title, description, text }
 * @returns {Promise<Object>} Classification result with confidence and explainability
 */
const classifyRequest = async ({ title = '', description = '', text = '' }) => {
  const combinedText = [title, description, text].filter(Boolean).join(' ').trim().toLowerCase();

  if (!combinedText) {
    throw ApiError.badRequest('Request text must be provided for classification');
  }

  // Retrieve active categories from the database
  const activeCategories = await ServiceCategory.find({ isActive: true });
  if (!activeCategories || activeCategories.length === 0) {
    throw ApiError.notFound('No active service categories available in the platform');
  }

  // Score each category based on keyword density, skills alignment, and name matching
  const scoredCategories = activeCategories.map((category) => {
    let score = 0;
    const matchedKeywords = new Set();
    const catNameLower = category.name.toLowerCase();
    const catSlugLower = category.slug.toLowerCase();

    // 1. Direct Category Name Match (+35)
    if (combinedText.includes(catNameLower)) {
      score += 35;
      matchedKeywords.add(category.name.toLowerCase());
    }

    // 2. Direct Slug Match (+30)
    if (combinedText.includes(catSlugLower)) {
      score += 30;
      matchedKeywords.add(category.slug.toLowerCase());
    }

    // 3. Category Description Matching (+5 per matched word)
    if (category.description) {
      const descTokens = category.description.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      descTokens.forEach((token) => {
        if (combinedText.includes(token)) {
          score += 4;
          matchedKeywords.add(token);
        }
      });
    }

    // 4. Required Skills Matching (+20 per matched skill)
    if (Array.isArray(category.requiredSkills)) {
      category.requiredSkills.forEach((skill) => {
        const skillLower = skill.toLowerCase();
        if (combinedText.includes(skillLower)) {
          score += 20;
          matchedKeywords.add(skillLower);
        }
      });
    }

    // 5. Rich Domain Taxonomy Matching (+15 for compound phrases, +10 for single words)
    const taxonomyWords = DOMAIN_KEYWORDS_BY_SLUG[category.slug] || [];
    taxonomyWords.forEach((keyword) => {
      const kwLower = keyword.toLowerCase();
      if (kwLower.includes(' ')) {
        // Compound phrase match
        if (combinedText.includes(kwLower)) {
          score += 18;
          matchedKeywords.add(kwLower);
        }
      } else {
        // Single word boundary or token match
        const regex = new RegExp(`\\b${kwLower}\\b`, 'i');
        if (regex.test(combinedText)) {
          score += 10;
          matchedKeywords.add(kwLower);
        }
      }
    });

    return {
      category,
      score,
      matchedKeywords: Array.from(matchedKeywords),
    };
  });

  // Sort categories by score descending
  scoredCategories.sort((a, b) => b.score - a.score);

  const topMatch = scoredCategories[0];
  const matchedKeywordsList = topMatch.matchedKeywords;

  // Determine confidence and fallback flag
  let confidence;
  let confidenceLevel;
  let explanation;
  let isFallback = false;

  if (topMatch.score > 0) {
    // Normalization formula bounded between 0.50 and 0.98
    const rawConf = 0.50 + Math.min(topMatch.score, 60) * 0.008;
    confidence = Math.min(0.98, Math.max(0.50, Number(rawConf.toFixed(2))));

    if (confidence >= 0.80) {
      confidenceLevel = 'HIGH';
    } else if (confidence >= 0.60) {
      confidenceLevel = 'MEDIUM';
    } else {
      confidenceLevel = 'LOW';
    }

    const kwSnippet = matchedKeywordsList.slice(0, 4).map((k) => `'${k}'`).join(', ');
    explanation = `CareConnect AI identified key domain indicators [${kwSnippet}] strongly aligning with ${topMatch.category.name} services and skills.`;
  } else {
    // Zero-score fallback: default to general Home Maintenance or first category
    const defaultCat = activeCategories.find((c) => c.slug === 'home-maintenance') || activeCategories[0];
    topMatch.category = defaultCat;
    confidence = 0.30;
    confidenceLevel = 'LOW';
    isFallback = true;
    explanation = 'No specific trade keywords were detected in the description. Suggesting general Home Maintenance as default. Please choose a specific category if appropriate.';
  }

  // Format secondary alternatives
  const alternatives = scoredCategories
    .filter((sc) => sc.category._id.toString() !== topMatch.category._id.toString() && sc.score > 0)
    .slice(0, 3)
    .map((sc) => ({
      categoryId: sc.category._id,
      categoryName: sc.category.name,
      categorySlug: sc.category.slug,
      score: sc.score,
    }));

  return {
    categoryId: topMatch.category._id,
    categoryName: topMatch.category.name,
    categorySlug: topMatch.category.slug,
    confidence,
    confidenceLevel,
    explanation,
    matchedKeywords: matchedKeywordsList,
    suggestedSkills: topMatch.category.requiredSkills || [],
    isFallback,
    alternatives,
  };
};

/**
 * Intelligent explainable provider matching.
 * Ranks active verified providers matching the category using a multi-factor scoring algorithm.
 * 
 * @param {Object} query - { categoryId, city, preferredDate, urgency, limit }
 * @returns {Promise<Object>} Ranked providers with explainability metadata
 */
const matchProviders = async ({
  categoryId,
  city = '',
  preferredDate = '',
  urgency = 'STANDARD',
  limit = 5,
}) => {
  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    throw ApiError.badRequest('Valid categoryId is required for provider matching');
  }

  const categoryObjectId = new mongoose.Types.ObjectId(categoryId);
  const targetCity = (city || '').trim().toLowerCase();

  // Strict eligibility query: ONLY APPROVED providers, ONLY AVAILABLE, offering category
  const candidateProfiles = await ProviderProfile.find({
    serviceCategories: categoryObjectId,
    verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
    isAvailable: true,
  })
    .populate('user', 'name email phone status avatar')
    .populate('serviceCategories', 'name slug');

  // Filter out any candidates whose user account is not active
  const eligibleProfiles = candidateProfiles.filter(
    (profile) => profile.user && profile.user.status === USER_STATUS.ACTIVE
  );

  if (eligibleProfiles.length === 0) {
    return {
      providers: [],
      totalEligible: 0,
      criteria: {
        categoryId,
        city: city || 'ANY',
        preferredDate: preferredDate || 'FLEXIBLE',
        urgency,
        verifiedOnly: true,
        activeOnly: true,
      },
      message: 'No verified active providers currently found matching this category and location. Your request will remain open for new provider quotes.',
    };
  }

  // Fetch completed jobs count for each eligible provider
  const scoredProviders = await Promise.all(
    eligibleProfiles.map(async (profile) => {
      const completedJobs = await Job.countDocuments({
        provider: profile.user._id,
        status: JOB_STATUS.COMPLETED,
      });

      // 1. Location Matching Score (Max 35 points)
      let locationScore = 0;
      let cityMatch = false;
      if (targetCity) {
        cityMatch = (profile.serviceAreas || []).some(
          (area) => (area.city || '').trim().toLowerCase() === targetCity
        );
        locationScore = cityMatch ? 35 : 10;
      } else {
        locationScore = 25; // Default neutral location score when customer has not specified city
      }

      // 2. Rating & Reputation Score (Max 30 points)
      const baseRating = ((profile.rating || 0) / 5) * 25;
      const reviewBonus = Math.min(5, (profile.reviewCount || 0) * 0.5);
      const ratingScore = Math.min(30, Number((baseRating + reviewBonus).toFixed(1)));

      // 3. Experience & Job Track Record Score (Max 20 points)
      const jobsScore = Math.min(15, (completedJobs || 0) * 1.5);
      const expScore = Math.min(5, (profile.experienceYears || 0) * 1.0);
      const experienceScore = Math.min(20, Number((jobsScore + expScore).toFixed(1)));

      // 4. Availability & Responsiveness Score (Max 15 points)
      const availabilityScore = profile.isAvailable ? 15 : 0;

      // Composite Total Score (0 - 100)
      const compositeScore = Math.min(
        100,
        Math.round(locationScore + ratingScore + experienceScore + availabilityScore)
      );

      // Construct explainable recommendation summary
      const expList = [];
      if (cityMatch) {
        expList.push(`services ${city}`);
      }
      if (profile.rating > 0) {
        expList.push(`${profile.rating.toFixed(1)}★ rating (${profile.reviewCount || 0} reviews)`);
      }
      if (completedJobs > 0) {
        expList.push(`${completedJobs} completed jobs`);
      }
      if (profile.experienceYears > 0) {
        expList.push(`${profile.experienceYears}y experience`);
      }

      const reasonDetails = expList.length > 0 ? expList.join(', ') : 'Verified provider available for booking';
      const explanation = `${compositeScore}% Match — ${profile.businessName || profile.user.name} is a verified specialist (${reasonDetails}).`;

      return {
        providerId: profile.user._id,
        profileId: profile._id,
        name: profile.user.name,
        businessName: profile.businessName || profile.user.name,
        email: profile.user.email,
        phone: profile.user.phone,
        avatar: profile.user.avatar,
        rating: profile.rating || 0,
        reviewCount: profile.reviewCount || 0,
        experienceYears: profile.experienceYears || 0,
        completedJobsCount: completedJobs,
        pricing: profile.pricing || { model: 'HOURLY', hourlyRate: profile.hourlyRate || 0 },
        serviceAreas: profile.serviceAreas || [],
        compositeScore,
        scoreBreakdown: {
          locationScore,
          ratingScore,
          experienceScore,
          availabilityScore,
        },
        cityMatch,
        explanation,
      };
    })
  );

  // Sort descending by compositeScore, then by rating, then by completedJobs
  scoredProviders.sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) {
      return b.compositeScore - a.compositeScore;
    }
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    return b.completedJobsCount - a.completedJobsCount;
  });

  const topProviders = scoredProviders.slice(0, Math.max(1, limit));

  return {
    providers: topProviders,
    totalEligible: eligibleProfiles.length,
    criteria: {
      categoryId,
      city: city || 'ANY',
      preferredDate: preferredDate || 'FLEXIBLE',
      urgency,
      verifiedOnly: true,
      activeOnly: true,
    },
  };
};

module.exports = {
  classifyRequest,
  matchProviders,
};
