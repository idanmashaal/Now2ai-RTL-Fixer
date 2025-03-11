/**
 * @fileoverview Core RTL text handling functionality
 * Provides the main logic for applying and managing RTL text direction
 */
import { debugLog } from "../utils/utils.js";
import { getConfigFromBackground } from "../utils/config-utils.js";
import {
  getCurrentDomainConfig,
  getClassesForElement,
} from "../config/domains.js";

// Cache for styles config
let cachedStylesConfig = null;

/**
 * Gets the styles configuration
 * @returns {Promise<Object>} Styles configuration
 */
async function getStylesConfig() {
  if (!cachedStylesConfig) {
    cachedStylesConfig = await getConfigFromBackground("styles");
  }
  return cachedStylesConfig;
}

/**
 * @typedef {WeakMap<Element, Set<string>>} ProcessedElementsMap
 * Tracks which elements have been processed and what classes were applied
 */

/**
 * Maintains a record of processed elements to prevent duplicate processing
 * Uses WeakMap to allow garbage collection of removed elements
 * @type {ProcessedElementsMap}
 */
const processedElements = new WeakMap();

/**
 * Applies RTL-related CSS properties and attributes to a DOM element
 * @param {HTMLElement} element - The element to process
 * @throws {Error} If element is invalid or classes don't exist
 */
export async function applyRTLStyles(element) {
  // Skip if already processed
  if (processedElements.has(element)) {
    return;
  }

  const domainConfig = await getCurrentDomainConfig();
  const classNames = getClassesForElement(element, domainConfig.selectors);
  if (!classNames.length) {
    return;
  }

  try {
    // Get the CSS classes configuration
    const cssClasses = await getStylesConfig();

    // First, clear any existing inline direction styles that might conflict
    // This ensures our styles take precedence
    const directionProps = ["direction", "unicode-bidi"];
    directionProps.forEach((prop) => {
      if (element.style[prop]) {
        element.style.removeProperty(prop);
      }
    });

    for (const className of classNames) {
      const rules = cssClasses[className]?.cssRules;
      if (!rules) {
        throw new Error(`Invalid RTL class name: ${className}`);
      }

      Object.entries(rules).forEach(([prop, value]) => {
        if (prop === "dir") {
          element.setAttribute(prop, value);
        } else {
          // Strip !important for style.setProperty
          const cleanValue = value.replace(" !important", "");
          // Force the style to be applied with !important to override any CSS
          element.style.setProperty(prop, cleanValue, "important");
        }
      });
    }

    // Mark as processed
    processedElements.set(element, new Set(classNames));
  } catch (error) {
    debugLog("Error applying RTL styles:", error);
    throw error;
  }
}

/**
 * Removes RTL styling from an element
 * @param {HTMLElement} element - The element to clean
 * @returns {boolean} True if cleanup was performed, false if element wasn't processed
 */
export function removeRTLStyles(element) {
  if (!processedElements.has(element)) {
    return false;
  }

  try {
    // Remove all RTL-related styles
    element.style.removeProperty("direction");
    element.style.removeProperty("unicode-bidi");
    element.removeAttribute("dir");

    // Remove from processed tracking
    processedElements.delete(element);
    return true;
  } catch (error) {
    debugLog("Error removing RTL styles:", error);
    throw error;
  }
}

/**
 * Checks if an element has been processed
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} True if element has been processed
 */
export function isElementProcessed(element) {
  return processedElements.has(element);
}
