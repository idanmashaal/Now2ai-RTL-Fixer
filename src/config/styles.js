/**
 * @fileoverview Style configurations for RTL Fixer
 * Defines common styles and themes used across the extension
 */

import uiConfig from "./json/ui_config.json";

/**
 * @typedef {Object} Theme
 * @property {Object} light - Light theme colors and styles
 * @property {Object} dark - Dark theme colors and styles
 */

/**
 * Theme configuration for the extension
 * @type {Theme}
 */
export const THEME = uiConfig.theme;

/**
 * Base styles for the indicator
 * @type {Object}
 */
export const INDICATOR_BASE_STYLES = uiConfig.indicatorBaseStyles;

/**
 * Link styles for the indicator
 * @type {Object}
 */
export const LINK_STYLES = uiConfig.linkStyles;

/**
 * Generates CSS for the indicator based on theme
 * @param {string} theme - Theme name ('light' or 'dark')
 * @returns {string} CSS rules
 */
export function generateIndicatorCSS(theme = "light") {
  const colors = THEME[theme];
  return `
    background: ${colors.background};
    color: ${colors.text};
    border: 1px solid ${colors.border};
  `;
}
