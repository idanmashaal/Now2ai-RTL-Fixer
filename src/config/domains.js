/**
 * @fileoverview Domain configurations for the RTL Fixer extension
 * Defines supported platforms and their specific layout requirements
 */
import { debugLog } from "../utils/utils.js";
import {
  DEFAULT_SELECTORS,
  createElementSelector,
  getClassesForElement,
} from "./selectors.js";

import domainsConfig from "./json/domains_config.json";
import defaultsConfig from "./json/defaults_config.json";

/**
 * @typedef {Object} Position
 * @property {string} [top] - Top position value with unit
 * @property {string} [right] - Right position value with unit
 * @property {string} [bottom] - Bottom position value with unit
 * @property {string} [left] - Left position value with unit
 * @property {string} [padding] - Padding values with units
 */

/**
 * Default position configuration for the indicator
 * Used as the base for all domain-specific positions
 * @type {Position}
 */
export const DEFAULT_POSITION = defaultsConfig.position;

/**
 * @typedef {Object} DomainConfig
 * @property {string} domain - Regular expression pattern matching the domain
 * @property {Position} position - Position configuration for the indicator
 * @property {SelectorsConfig} selectors - Configuration for element selection
 */

/**
 * @const {DomainConfig[]}
 * Comprehensive domain configurations including pattern, position, and selectors
 * Each domain includes domain-specific settings for the RTL Fixer extension
 */
export const SUPPORTED_DOMAINS = [
  ...domainsConfig,
  {
    domain: "default",
    position: { ...DEFAULT_POSITION },
    selectors: { ...DEFAULT_SELECTORS },
  },
];

/**
 * Gets the domain configuration for the current domain
 * @returns {DomainConfig} Configuration for the current domain or default
 */
export function getCurrentDomainConfig() {
  const currentDomain = window.location.hostname;
  return (
    SUPPORTED_DOMAINS.find(
      (config) =>
        config.domain !== "default" &&
        new RegExp(config.domain).test(currentDomain)
    ) || SUPPORTED_DOMAINS.find((config) => config.domain === "default")
  );
}

/**
 * Checks if a domain is supported by the extension
 * @param {string} hostname - The hostname to check
 * @returns {boolean} Whether the domain is supported
 */
export function isDomainSupported(hostname) {
  return SUPPORTED_DOMAINS.some(
    (config) =>
      config.domain !== "default" && new RegExp(config.domain).test(hostname)
  );
}

// Re-export selectors.js functions for convenience
export { createElementSelector, getClassesForElement };
