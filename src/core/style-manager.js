/**
 * @fileoverview Style management for RTL Fixer
 * Handles creation, injection, and cleanup of CSS styles
 */
import { debugLog } from "../utils/utils.js";
import { getConfigFromBackground } from "../utils/config-utils.js";
import { BRAND } from "../config/constants.js";

/**
 * @typedef {Object} StyleState
 * @property {Set<HTMLStyleElement>} styleElements - Set of injected style elements
 */

/**
 * Tracks injected style elements for cleanup
 * @type {StyleState}
 */
const styleState = {
  styleElements: new Set(),
};

/**
 * Generates CSS rules for RTL handling
 * @param {Object} selectors - Selectors configuration
 * @param {Object} cssClasses - CSS classes configuration
 * @returns {string} Combined CSS rules
 * @private
 */
function generateSelectors(selectors, cssClasses) {
  let cssRules = "";

  Object.entries(selectors).forEach(([type, items]) => {
    items.forEach(({ selector, classes }) => {
      const selectors = [];

      // Build appropriate selector based on type
      if (type === "attributes") {
        selectors.push(`[${selector}]`);
      } else if (type === "tags") {
        selectors.push(selector);
      } else if (type === "classes") {
        selectors.push(`.${selector}`);
      }

      // Add rules for each class
      classes.forEach((className) => {
        const rules = cssClasses[className]?.cssRules;
        if (!rules) {
          debugLog(`Missing CSS rules for class: ${className}`);
          return;
        }

        const cssProps = Object.entries(rules)
          .filter(([prop]) => prop !== "dir")
          .map(([prop, value]) => `${prop}: ${value}`)
          .join(";\n  ");

        cssRules += `\n${selectors.join(",\n")} {\n  ${cssProps}\n}`;
      });
    });
  });

  return cssRules;
}

/**
 * Creates and injects a style element with the provided CSS
 * @param {string} css - CSS rules to inject
 * @returns {HTMLStyleElement} The created style element
 * @private
 */
function injectStyles(css) {
  const style = document.createElement("style");
  style.id = `${BRAND}-style-${Date.now()}`;
  style.textContent = css;
  document.head.appendChild(style);
  styleState.styleElements.add(style);
  return style;
}

/**
 * Initializes RTL styles in the document
 * @returns {HTMLStyleElement} The created style element
 * @throws {Error} If styles cannot be injected
 */
export async function initializeStyles() {
  try {
    // Get styles config from background
    const stylesConfig = await getConfigFromBackground("styles");

    // Get domains config for current domain
    const domainsConfig = await getConfigFromBackground("domains");

    // Determine the current domain configuration
    const currentDomain = window.location.hostname;
    const domainConfig =
      domainsConfig.find(
        (config) =>
          config.domain !== "default" &&
          new RegExp(config.domain).test(currentDomain)
      ) || domainsConfig.find((config) => config.domain === "default");

    if (!domainConfig) {
      throw new Error(`No domain configuration found for: ${currentDomain}`);
    }

    // Generate CSS based on domain-specific selectors
    const css = generateSelectors(domainConfig.selectors, stylesConfig);

    // Inject the styles
    return injectStyles(css);
  } catch (error) {
    debugLog("Failed to initialize styles:", error);
    throw error;
  }
}

/**
 * Adds a new style element with the provided CSS
 * @param {string} css - CSS rules to add
 * @returns {HTMLStyleElement} The created style element
 */
export function addStyles(css) {
  return injectStyles(css);
}

/**
 * Removes all injected style elements
 * @returns {boolean} True if cleanup was successful
 */
export function removeAllStyles() {
  try {
    styleState.styleElements.forEach((element) => {
      element.remove();
    });
    styleState.styleElements.clear();
    return true;
  } catch (error) {
    debugLog("Failed to remove styles:", error);
    throw error;
  }
}
