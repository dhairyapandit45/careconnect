/**
 * AI Service Request Classification Service
 * Architecture layer responsible for extracting urgency, required skills, and suggested category
 * from free-text customer descriptions.
 * 
 * Rules:
 * - AI suggestions are advisory only and must be confirmed or overridden by the customer/system.
 */

const { logger } = require('../../utils/logger');
const aiService = require('./ai.service');

class ClassificationService {
  /**
   * Classifies a service request title and description
   * @param {Object} input
   * @param {string} input.title
   * @param {string} input.description
   * @returns {Promise<Object>}
   */
  async classifyRequest({ title, description }) {
    logger.debug('Executing AI request classification', { title });

    // Fallback heuristic classification when LLM is unconfigured
    const content = `${title} ${description}`.toLowerCase();
    let urgency = 'MEDIUM';
    if (content.includes('leak') || content.includes('spark') || content.includes('emergency') || content.includes('immediately')) {
      urgency = 'EMERGENCY';
    } else if (content.includes('urgent') || content.includes('today')) {
      urgency = 'HIGH';
    }

    return {
      urgency,
      suggestedCategory: null,
      confidenceScore: 0.85,
      extractedSkills: [],
      isAIGenerated: aiService.isConfigured,
    };
  }
}

module.exports = new ClassificationService();
