/**
 * @fileoverview Core constants for the RTL Fixer extension
 * Defines brand information, versioning, and CSS rules for RTL text handling
 */

/** @const {string} Brand identifier used throughout the extension */
export const BRAND = "now2ai";

/** @const {string} Current version of the extension */
export const VERSION = "1.0";

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
export const CSS_CLASSES = {
  "rtl-auto": {
    cssRules: {
      "unicode-bidi": "isolate !important",
      direction: "auto !important",
      dir: "auto",
    },
  },
  "rtl-inherit": {
    cssRules: {
      "unicode-bidi": "isolate !important",
      direction: "inherit !important",
      dir: "auto",
    },
  },
  "rtl-force": {
    cssRules: {
      "unicode-bidi": "isolate !important",
      direction: "rtl !important",
      dir: "rtl",
    },
  },
  "ltr-force": {
    cssRules: {
      direction: "ltr !important",
      dir: "ltr",
    },
  },
};
