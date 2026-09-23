/**
 * AI-Assisted Provider Matching Service
 * 
 * Pipeline:
 * Customer Request -> AI Classification -> Structured Requirements -> DB Filtering
 * -> Provider Candidate Retrieval -> Provider Matching / Ranking -> Recommended Providers
 * 
 * Architectural Rule:
 * AI ranking operates only on candidate providers that have ALREADY passed strict DB checks:
 * 1. Verification status is VERIFIED
 * 2. Provider availability matches customer time slot
 * 3. Provider serves the requested geographical area
 * 4. Account is active (not suspended)
 */

const { logger } = require('../../utils/logger');

class MatchingService {
  /**
   * Ranks pre-filtered provider candidates
   * @param {Object} serviceRequest
   * @param {Array<Object>} candidateProviders
   * @returns {Promise<Array<Object>>} Ranked providers with scoring reasons
   */
  async rankProviderCandidates(serviceRequest, candidateProviders) {
    logger.debug(`Ranking ${candidateProviders.length} candidate providers for request ${serviceRequest._id}`);

    // Initial scoring based on rating and review count
    const ranked = candidateProviders.map((provider) => {
      const ratingScore = (provider.rating || 0) * 20; // 0 to 100
      const experienceScore = Math.min((provider.experienceYears || 0) * 10, 50); // up to 50
      const totalScore = ratingScore + experienceScore;

      return {
        providerId: provider.user,
        providerProfile: provider,
        score: totalScore,
        matchRationale: 'Ranked based on verified rating and platform experience',
      };
    });

    ranked.sort((a, b) => b.score - a.score);
    return ranked;
  }
}

module.exports = new MatchingService();
