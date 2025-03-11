/**
 * @fileoverview DOM selector configurations and utilities for RTL Fixer
 * Defines how to identify and process elements that need RTL handling
 */
import { debugLog } from "../utils/utils.js";
import defaultsConfig from "./json/defaults_config.json";

/**
 * @typedef {Object} SelectorConfig
 * @property {string} selector - The attribute, tag, or class to match
 * @property {string[]} classes - RTL classes to apply to matching elements
 */

/**
 * @typedef {Object} SelectorsConfig
 * @property {SelectorConfig[]} attributes - Configurations for attribute-based selection
 * @property {SelectorConfig[]} tags - Configurations for HTML tag-based selection
 * @property {SelectorConfig[]} classes - Configurations for class-based selection
 */

/**
 * @const {SelectorsConfig}
 * Default configuration for element selection
 * Defines which elements should receive RTL handling and how
 */
export const DEFAULT_SELECTORS = defaultsConfig.selectors;

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
