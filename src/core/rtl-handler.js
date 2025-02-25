/**
 * @fileoverview Core RTL text handling functionality
 * Provides the main logic for applying and managing RTL text direction
 */

import { CSS_CLASSES } from "../config/constants.js";
import { getClassesForElement } from "../config/selectors.js";

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
 * @param {string[]} classNames - Array of RTL class names to apply
 * @throws {Error} If element is invalid or classes don't exist
 */
export function applyRTLStyles(element) {
  // Skip if already processed
  if (processedElements.has(element)) {
    return;
  }

  const classNames = getClassesForElement(element);
  if (!classNames.length) {
    return;
  }

  try {
    // First, clear any existing inline direction styles that might conflict
    // This ensures our styles take precedence
    const directionProps = ["direction", "unicode-bidi"];
    directionProps.forEach((prop) => {
      if (element.style[prop]) {
        element.style.removeProperty(prop);
      }
    });

    classNames.forEach((className) => {
      const rules = CSS_CLASSES[className]?.cssRules;
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
    });

    // Mark as processed
    processedElements.set(element, new Set(classNames));
  } catch (error) {
    console.error("Error applying RTL styles:", error);
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
    console.error("Error removing RTL styles:", error);
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

/**
 * Gets the RTL classes applied to an element
 * @param {HTMLElement} element - The element to check
 * @returns {Set<string>|null} Set of applied classes or null if not processed
 */
export function getAppliedClasses(element) {
  return processedElements.get(element) || null;
}
