/**
 * @fileoverview Domain configurations for the RTL Fixer extension
 * Defines supported platforms and their specific layout requirements
 */

/**
 * @const {string[]}
 * List of supported domain patterns
 * Each pattern is a regular expression matching specific AI platforms
 */
export const SUPPORTED_DOMAINS = [
  '^(?:[^.]+\\.)?claude\\.ai$',
  '^notebooklm.google.com$',
  '^gemini.google.com$',
  '^(?:[^.]+\\.)?perplexity\\.ai$',
  '^(?:[^.]+\\.)?chatgpt\\.com$'
];

/**
 * @typedef {Object} Position
 * @property {string} [top] - Top position value with unit
 * @property {string} [right] - Right position value with unit
 * @property {string} [bottom] - Bottom position value with unit
 * @property {string} [left] - Left position value with unit
 * @property {string} [padding] - Padding values with units
 */

/**
 * @typedef {Object} DomainConfig
 * @property {string} domain - Regular expression pattern matching the domain
 * @property {Position} position - Position configuration for the indicator
 */

/**
 * @const {DomainConfig[]}
 * Platform-specific configurations for indicator positioning
 * Each configuration includes exact pixel positions for the RTL indicator
 * based on the platform's layout
 */
export const DOMAIN_POSITIONS = [
  {
    domain: '^(?:[^.]+\\.)?claude\\.ai$',
    position: {
      top: '9px',
      right: '146px',
      padding: '8px 12px'
    }
  },
  {
    domain: '^notebooklm.google.com$',
    position: {
      top: '12px',
      right: '420px',
      padding: '8px 12px'
    }
  },
  {
    domain: '^gemini.google.com$',
    position: {
      top: '16px',
      right: '122px',
      padding: '8px 12px'
    }
  },
  {
    domain: '^(?:[^.]+\\.)?perplexity\\.ai$',
    position: {
      top: '18px',
      right: '36px',
      padding: '8px 12px'
    }
  },
  {
    domain: '^(?:[^.]+\\.)?chatgpt\\.com$',
    position: {
      top: '8px',
      right: '195px',
      padding: '8px 12px'
    }
  },
  {
    domain: 'default',
    position: {
      bottom: '16px',
      right: '66px',
      padding: '8px 12px'
    }
  }
];