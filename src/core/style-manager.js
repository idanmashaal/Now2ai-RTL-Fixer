/**
 * @fileoverview Style management for RTL Fixer
 * Handles creation, injection, and cleanup of CSS styles
 */

import { BRAND } from "../config/constants.js";
import { CSS_CLASSES } from "../config/constants.js";
import { DEFAULT_SELECTORS } from "../config/selectors.js";
import { getCurrentDomainConfig } from "../config/domains.js";

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
 * @returns {string} Combined CSS rules
 * @private
 */
function generateSelectors() {
  const domainConfig = getCurrentDomainConfig();
  const selectors = domainConfig.selectors;
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
        const rules = CSS_CLASSES[className].cssRules;
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
export function initializeStyles() {
  try {
    const css = generateSelectors();
    return injectStyles(css);
  } catch (error) {
    console.error("Failed to initialize styles:", error);
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
    console.error("Failed to remove styles:", error);
    throw error;
  }
}

/**
 * Gets the count of currently injected style elements
 * @returns {number} Number of active style elements
 */
export function getStyleCount() {
  return styleState.styleElements.size;
}
