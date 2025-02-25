/**
 * @fileoverview Style configurations for RTL Fixer
 * Defines common styles and themes used across the extension
 */

/**
 * @typedef {Object} Theme
 * @property {Object} light - Light theme colors and styles
 * @property {Object} dark - Dark theme colors and styles
 */

/**
 * Theme configuration for the extension
 * @type {Theme}
 */
export const THEME = {
  light: {
    background: 'rgba(255, 255, 255, .9)',
    text: '#000',
    border: 'rgba(0, 0, 0, .1)',
    link: '#0071E3'
  },
  dark: {
    background: 'rgba(0, 0, 0, .8)',
    text: '#fff',
    border: 'rgba(255, 255, 255, .1)',
    link: '#66b3ff'
  }
};

/**
 * Base styles for the indicator
 * @type {Object}
 */
export const INDICATOR_BASE_STYLES = {
  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  fontSize: '14px',
  lineHeight: '1.5',
  zIndex: '999999',
  borderRadius: '6px',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 2px 8px rgba(0, 0, 0, .15)',
  transition: 'opacity 0.2s ease'
};

/**
 * Generates CSS for the indicator based on theme
 * @param {string} theme - Theme name ('light' or 'dark')
 * @returns {string} CSS rules
 */
export function generateIndicatorCSS(theme = 'light') {
  const colors = THEME[theme];
  return `
    background: ${colors.background};
    color: ${colors.text};
    border: 1px solid ${colors.border};
  `;
}

/**
 * Link styles for the indicator
 * @type {Object}
 */
export const LINK_STYLES = {
  light: {
    color: THEME.light.link,
    textDecoration: 'none',
    fontWeight: '500'
  },
  dark: {
    color: THEME.dark.link,
    textDecoration: 'none',
    fontWeight: '500'
  }
};