/**
 * @fileoverview Domain configurations for the RTL Fixer extension
 * Defines supported platforms and their specific layout requirements
 */
import { debugLog } from "../utils/utils.js";
import { getConfigFromBackground } from "../utils/config-utils.js";

// Cache for domain config to avoid repeated background requests
let cachedDomainsConfig = null;
let cachedDefaultsConfig = null;

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
 * @property {SelectorsConfig} selectors - Configuration for element selection
 */

/**
 * Gets the default position configuration
 * @returns {Promise<Position>} Default position configuration
 */
export async function getDefaultPosition() {
  if (!cachedDefaultsConfig) {
    cachedDefaultsConfig = await getConfigFromBackground("defaults");
  }
  return cachedDefaultsConfig.position;
}

/**
 * Gets the domains configuration
 * @returns {Promise<DomainConfig[]>} Array of domain configurations
 */
export async function getSupportedDomains() {
  if (!cachedDomainsConfig) {
    try {
      // Get both configurations
      const [domainsConfig, defaultsConfig] = await Promise.all([
        getConfigFromBackground("domains"),
        getConfigFromBackground("defaults"),
      ]);

      // Cache the results
      cachedDomainsConfig = [
        ...domainsConfig,
        {
          domain: "default",
          position: { ...defaultsConfig.position },
          selectors: { ...defaultsConfig.selectors },
        },
      ];
    } catch (error) {
      debugLog("Error loading domain configurations:", error);
      throw error;
    }
  }

  return cachedDomainsConfig;
}

/**
 * Gets the domain configuration for the current domain
 * @returns {Promise<DomainConfig>} Configuration for the current domain or default
 */
export async function getCurrentDomainConfig() {
  const domains = await getSupportedDomains();
  const currentDomain = window.location.hostname;

  return (
    domains.find(
      (config) =>
        config.domain !== "default" &&
        new RegExp(config.domain).test(currentDomain)
    ) || domains.find((config) => config.domain === "default")
  );
}

/**
 * Checks if a domain is supported by the extension
 * @param {string} hostname - The hostname to check
 * @returns {Promise<boolean>} Whether the domain is supported
 */
export async function isDomainSupported(hostname) {
  const domains = await getSupportedDomains();

  return domains.some(
    (config) =>
      config.domain !== "default" && new RegExp(config.domain).test(hostname)
  );
}

/**
 * Creates a combined CSS selector string for all configured elements
 * @param {SelectorsConfig} selectors - Configuration for element selection
 * @returns {string} Combined CSS selector targeting all relevant elements
 */
export function createElementSelector(selectors) {
  return [
    ...selectors.attributes.map(({ selector }) => `[${selector}]`),
    ...selectors.tags.map(({ selector }) => selector),
    ...selectors.classes.map(({ selector }) => `.${selector}`),
  ].join(",");
}

/**
 * Determines which RTL classes should be applied to a given element
 * @param {HTMLElement} element - The DOM element to check
 * @param {SelectorsConfig} selectors - Configuration for element selection
 * @returns {string[]} Array of RTL class names to apply
 */
export function getClassesForElement(element, selectors) {
  let classes = [];

  // Check for matching attributes
  selectors.attributes.forEach(({ selector, classes: selectorClasses }) => {
    if (element.hasAttribute(selector)) {
      classes = classes.concat(selectorClasses);
    }
  });

  // Check for matching tags
  selectors.tags.forEach(({ selector, classes: selectorClasses }) => {
    if (element.tagName.toLowerCase() === selector) {
      classes = classes.concat(selectorClasses);
    }
  });

  // Check for matching classes
  selectors.classes.forEach(({ selector, classes: selectorClasses }) => {
    if (element.classList.contains(selector)) {
      classes = classes.concat(selectorClasses);
    }
  });

  // Remove duplicates and return
  return [...new Set(classes)];
}
