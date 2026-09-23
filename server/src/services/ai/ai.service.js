/**
 * AI Service Provider Abstraction Layer
 * Provides a swappable interface for LLM operations (OpenAI, Gemini, local model).
 * Isolated so that core business logic remains independent of AI infrastructure.
 */

const { env } = require('../../config/env');
const { logger } = require('../../utils/logger');

class AIService {
  constructor() {
    this.apiKey = env.OPENAI_API_KEY;
    this.isConfigured = Boolean(this.apiKey);
  }

  /**
   * Generic completion interface
   * @param {Object} options
   * @param {string} options.prompt
   * @param {string} [options.systemMessage]
   * @returns {Promise<string>}
   */
  async generateCompletion({ prompt, systemMessage }) {
    if (!this.isConfigured) {
      logger.debug('AI service called without configured API key. Operating in mock/fallback mode.');
      return null;
    }

    // When an LLM client (e.g. OpenAI / Gemini) is integrated, call it here.
    return `AI Completion placeholder for prompt: ${prompt.slice(0, 30)}...`;
  }
}

module.exports = new AIService();
