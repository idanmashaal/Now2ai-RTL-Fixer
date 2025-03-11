/**
 * @fileoverview Style configurations for RTL Fixer
 * Defines common styles and themes used across the extension
 */
import { debugLog } from "../utils/utils.js";
import { getConfigFromBackground } from "../utils/config-utils.js";

// Cache for UI config
let cachedUiConfig = null;

/**
 * Gets the UI configuration, with optional refresh
 * @param {boolean} forceRefresh - Whether to force a refresh from background
 * @returns {Promise<Object>} The UI configuration
 */
export async function getUiConfig(forceRefresh = false) {
  if (!cachedUiConfig || forceRefresh) {
    try {
      cachedUiConfig = await getConfigFromBackground("ui");
    } catch (error) {
      debugLog("Error loading UI config:", error);
      // Fallback to basic defaults if loading fails
      cachedUiConfig = {
        theme: {
          light: {
            background: "rgba(255, 255, 255, .9)",
            text: "#000",
            border: "rgba(0, 0, 0, .1)",
            link: "#0071E3",
          },
          dark: {
            background: "rgba(0, 0, 0, .8)",
            text: "#fff",
            border: "rgba(255, 255, 255, .1)",
            link: "#66b3ff",
          },
        },
        indicatorBaseStyles: {
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "14px",
          lineHeight: "1.5",
          zIndex: "999999",
          borderRadius: "6px",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, .15)",
          transition: "opacity 0.2s ease",
        },
        linkStyles: {
          light: {
            color: "#0071E3",
            textDecoration: "none",
            fontWeight: "500",
          },
          dark: {
            color: "#66b3ff",
            textDecoration: "none",
            fontWeight: "500",
          },
        },
      };
    }
  }
  return cachedUiConfig;
}

/**
 * @typedef {Object} Theme
 * @property {Object} light - Light theme colors and styles
 * @property {Object} dark - Dark theme colors and styles
 */

/**
 * Gets the theme configuration
 * @param {boolean} forceRefresh - Whether to force a refresh
 * @returns {Promise<Theme>} Theme configuration
 */
export async function getTheme(forceRefresh = false) {
  const uiConfig = await getUiConfig(forceRefresh);
  return uiConfig.theme;
}

/**
 * Gets the base styles for the indicator
 * @param {boolean} forceRefresh - Whether to force a refresh
 * @returns {Promise<Object>} Base styles
 */
export async function getIndicatorBaseStyles(forceRefresh = false) {
  const uiConfig = await getUiConfig(forceRefresh);
  return uiConfig.indicatorBaseStyles;
}

/**
 * Gets the link styles for the indicator
 * @param {boolean} forceRefresh - Whether to force a refresh
 * @returns {Promise<Object>} Link styles
 */
export async function getLinkStyles(forceRefresh = false) {
  const uiConfig = await getUiConfig(forceRefresh);
  return uiConfig.linkStyles;
}

/**
 * Generates CSS for the indicator based on theme
 * @param {string} theme - Theme name ('light' or 'dark')
 * @param {boolean} forceRefresh - Whether to force a refresh
 * @returns {Promise<string>} CSS rules
 */
export async function generateIndicatorCSS(
  theme = "light",
  forceRefresh = false
) {
  const themeConfig = await getTheme(forceRefresh);
  const colors = themeConfig[theme];

  return `
    background: ${colors.background};
    color: ${colors.text};
    border: 1px solid ${colors.border};
  `;
}
