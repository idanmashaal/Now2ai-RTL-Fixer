/**
 * @fileoverview UI Indicator component for RTL Fixer
 * Manages the visual indicator showing RTL Fixer's active status
 */

import { BRAND } from "../config/constants.js";
import { getCurrentDomainConfig } from "../config/domains.js";
import { addStyles } from "../core/style-manager.js";
import { THEME } from "../config/styles.js";

/**
 * @typedef {Object} IndicatorState
 * @property {HTMLElement|null} element - The indicator DOM element
 * @property {HTMLStyleElement|null} styles - The indicator's style element
 */

/**
 * Tracks the current state of the indicator
 * @type {IndicatorState}
 */
const indicatorState = {
  element: null,
  styles: null,
};

/**
 * Gets position configuration for the current domain
 * @returns {Object} Position configuration for the current domain
 * @private
 */
function getDomainPosition() {
  return getCurrentDomainConfig().position;
}

/**
 * Generates CSS styles for the indicator based on position
 * @param {Object} position - Position configuration object
 * @returns {string} CSS rules for the indicator
 * @private
 */
function generateIndicatorStyles(position) {
  const positionStyles = [
    "top:auto",
    "bottom:auto",
    "left:auto",
    "right:auto",
    position.top && `top:${position.top}`,
    position.bottom && `bottom:${position.bottom}`,
    position.left && `left:${position.left}`,
    position.right && `right:${position.right}`,
    position.padding && `padding:${position.padding}`,
  ]
    .filter(Boolean)
    .join(";");

  return `
    #${BRAND}-indicator {
      position: fixed;
      ${positionStyles};
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      z-index: 999999;
      border-radius: 6px;
      backdrop-filter: blur(8px);
      box-shadow: 0 2px 8px rgba(0,0,0,.15);
      background: rgba(255,255,255,.9);
      color: #000;
      border: 1px solid rgba(0,0,0,.1);
      transition: opacity 0.2s ease;
    }

    #${BRAND}-indicator a {
      color: ${THEME.light.link};
      text-decoration: none;
      font-weight: 500;
    }

    @media (prefers-color-scheme: dark) {
      #${BRAND}-indicator {
        background: rgba(0,0,0,.8);
        color: #fff;
        border-color: rgba(255,255,255,.1);
      }
      #${BRAND}-indicator a {
        color: #66b3ff;
      }
    }
  `;
}

/**
 * Creates the indicator DOM element
 * @returns {HTMLElement} The created indicator element
 * @private
 */
function createIndicatorElement() {
  const indicator = document.createElement("div");
  const content = document.createElement("div");
  const link = document.createElement("a");
  const text = document.createTextNode(" RTL Fixer");

  indicator.id = `${BRAND}-indicator`;
  link.href = "https://now2.ai";
  link.target = "_blank";
  link.textContent = "Now2.ai";

  content.appendChild(link);
  content.appendChild(text);
  indicator.appendChild(content);

  return indicator;
}

/**
 * Shows the RTL Fixer indicator
 * @returns {HTMLElement} The indicator element
 * @throws {Error} If indicator cannot be created or positioned
 */
export function showIndicator() {
  try {
    if (indicatorState.element) {
      return indicatorState.element;
    }

    // Create indicator element
    const indicator = createIndicatorElement();
    document.body.appendChild(indicator);

    // Add styles
    const position = getDomainPosition();
    const styles = generateIndicatorStyles(position);
    const styleElement = addStyles(styles);

    // Update state
    indicatorState.element = indicator;
    indicatorState.styles = styleElement;

    return indicator;
  } catch (error) {
    console.error("Failed to show indicator:", error);
    throw error;
  }
}

/**
 * Hides the RTL Fixer indicator
 * @returns {boolean} True if the indicator was hidden
 */
export function hideIndicator() {
  try {
    if (indicatorState.element) {
      indicatorState.element.remove();
      indicatorState.element = null;
    }
    if (indicatorState.styles) {
      indicatorState.styles.remove();
      indicatorState.styles = null;
    }
    return true;
  } catch (error) {
    console.error("Failed to hide indicator:", error);
    throw error;
  }
}

/**
 * Checks if the indicator is currently visible
 * @returns {boolean} True if the indicator is showing
 */
export function isIndicatorVisible() {
  return indicatorState.element !== null;
}

/**
 * Updates the indicator's position for the current domain
 * @returns {boolean} True if the update was successful
 */
export function updateIndicatorPosition() {
  try {
    if (!indicatorState.element) {
      return false;
    }

    const position = getDomainPosition();
    const styles = generateIndicatorStyles(position);

    if (indicatorState.styles) {
      indicatorState.styles.remove();
    }

    indicatorState.styles = addStyles(styles);
    return true;
  } catch (error) {
    console.error("Failed to update indicator position:", error);
    throw error;
  }
}
