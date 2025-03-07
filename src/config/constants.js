/**
 * @fileoverview Core constants for the RTL Fixer extension
 * Defines brand information, versioning, and CSS rules for RTL text handling
 */

import stylesConfig from "./json/styles_config.json";

/**
 * @const {boolean} Environment specific settings
 * Set automatically based on build environment
 */
export const ENV = typeof __ENV__ !== "undefined" ? __ENV__ : "development";
export const DEBUG = typeof __DEBUG__ !== "undefined" ? __DEBUG__ : false;

/** @const {string} Brand identifier used throughout the extension */
export const BRAND = "now2ai" + (ENV === "development" ? "-dev" : "");

/**
 * @const {string} Current version of the extension
 * This is set during build from package.json
 */
export const VERSION =
  typeof __VERSION__ !== "undefined" ? __VERSION__ : "1.0.0";

/**
 * @const {string} Unique namespace for this instance
 * Used to prevent conflicts with other scripts/extensions
 */
export const NAMESPACE = `${BRAND}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * @typedef {Object} CSSRule
 * @property {string} unicode-bidi - Unicode bidirectional isolation rule
 * @property {string} direction - Text direction rule
 * @property {string} dir - HTML direction attribute value
 */

/**
 * @const {Object.<string, {cssRules: CSSRule}>}
 * Defines different RTL handling strategies:
 * - rtl-auto: Automatically detect and handle RTL text
 * - rtl-inherit: Inherit RTL handling from parent elements
 * - rtl-force: Force RTL direction regardless of content
 */
export const CSS_CLASSES = stylesConfig;
