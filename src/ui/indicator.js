/**
 * @fileoverview UI Indicator component for RTL Fixer
 * Manages the visual indicator showing RTL Fixer's active status
 */

import {
  saveCustomPosition,
  getCustomPosition,
  clearCustomPosition,
} from "../extension/storage.js";
import { BRAND } from "../config/constants.js";
import { debounce } from "../utils/utils.js";
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
 * State for tracking dragging
 */
const dragState = {
  isDragging: false,
  initialX: 0,
  initialY: 0,
  initialLeft: 0,
  initialTop: 0,
  currentX: 0,
  currentY: 0,
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
  // Convert default position values to percentage units if they're in pixels
  const convertedPosition = { ...position };

  // Check if default positions are in pixels and convert to percentages
  if (
    typeof convertedPosition.top === "string" &&
    convertedPosition.top.endsWith("px")
  ) {
    const defaultPercent =
      (parseInt(convertedPosition.top) / window.innerHeight) * 100;
    convertedPosition.top = `${defaultPercent}%`;
  }

  if (
    typeof convertedPosition.right === "string" &&
    convertedPosition.right.endsWith("px")
  ) {
    const defaultPercent =
      (parseInt(convertedPosition.right) / window.innerWidth) * 100;
    convertedPosition.right = `${defaultPercent}%`;
  }

  if (
    typeof convertedPosition.bottom === "string" &&
    convertedPosition.bottom.endsWith("px")
  ) {
    const defaultPercent =
      (parseInt(convertedPosition.bottom) / window.innerHeight) * 100;
    convertedPosition.bottom = `${defaultPercent}%`;
  }

  if (
    typeof convertedPosition.left === "string" &&
    convertedPosition.left.endsWith("px")
  ) {
    const defaultPercent =
      (parseInt(convertedPosition.left) / window.innerWidth) * 100;
    convertedPosition.left = `${defaultPercent}%`;
  }

  const positionStyles = [
    "top:auto",
    "bottom:auto",
    "left:auto",
    "right:auto",
    convertedPosition.top && `top:${convertedPosition.top}`,
    convertedPosition.bottom && `bottom:${convertedPosition.bottom}`,
    convertedPosition.left && `left:${convertedPosition.left}`,
    convertedPosition.right && `right:${convertedPosition.right}`,
    convertedPosition.padding && `padding:${convertedPosition.padding}`,
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
  link.href = "https://go.now2.ai/he-ext-indicator";
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

    // Make indicator draggable and apply custom position if available
    makeDraggable(indicator);
    applyCustomPosition(indicator);

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

/**
 * Makes the indicator element draggable
 * @param {HTMLElement} indicator - The indicator element to make draggable
 */
export function makeDraggable(indicator) {
  if (!indicator) return;

  // Add cursor style to default, we will mark the drag handle as grab below
  indicator.style.cursor = "default";

  // Add a small drag handle to make it clear it's draggable (optional)
  const handleEl = document.createElement("div");
  handleEl.className = "drag-handle";
  handleEl.style.position = "absolute";
  handleEl.style.top = "0";
  handleEl.style.right = "0";
  handleEl.style.width = "16px";
  handleEl.style.height = "16px";
  handleEl.style.cursor = "grab";
  handleEl.style.background = "rgba(0,0,0,0.1)";
  handleEl.style.borderRadius = "0 6px 0 6px";
  handleEl.setAttribute("title", "Drag to reposition");

  indicator.appendChild(handleEl);

  // Mouse down event - start dragging
  indicator.addEventListener("mousedown", handleMouseDown);

  // Add data attribute to mark as draggable
  indicator.setAttribute("data-draggable", "true");
}

/**
 * Handles the start of dragging
 * @param {MouseEvent} e - The mousedown event
 */
function handleMouseDown(e) {
  // Only allow dragging from the drag handle
  if (!e.target.classList.contains("drag-handle")) {
    return;
  }
  const indicator = e.currentTarget;

  // Prevent default to avoid text selection
  e.preventDefault();

  // Get the actual screen position
  const rect = indicator.getBoundingClientRect();

  // Initialize dragging state
  dragState.isDragging = true;
  dragState.initialX = e.clientX;
  dragState.initialY = e.clientY;

  // Simply use the current screen coordinates
  dragState.initialTop = rect.top;
  dragState.initialLeft = rect.left;

  // Apply consistent positioning using screen coordinates
  indicator.style.position = "fixed";
  indicator.style.top = rect.top + "px";
  indicator.style.left = rect.left + "px";
  indicator.style.right = "auto";
  indicator.style.bottom = "auto";

  // Add global event listeners
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  // Add dragging class
  indicator.classList.add("dragging");
}

/**
 * Handles mouse movement during dragging
 * @param {MouseEvent} e - The mousemove event
 */
function handleMouseMove(e) {
  if (!dragState.isDragging) return;

  // Calculate the new position
  const deltaX = e.clientX - dragState.initialX;
  const deltaY = e.clientY - dragState.initialY;

  const newLeft = dragState.initialLeft + deltaX;
  const newTop = dragState.initialTop + deltaY;

  // Get the indicator element
  const indicator = document.getElementById(`${BRAND}-indicator`);
  if (!indicator) return;

  // Apply new position with boundary checking
  const rect = indicator.getBoundingClientRect();

  // Ensure indicator stays within viewport bounds
  const maxLeft = window.innerWidth - rect.width;
  const maxTop = window.innerHeight - rect.height;

  indicator.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + "px";
  indicator.style.top = Math.max(0, Math.min(newTop, maxTop)) + "px";
}

/**
 * Handles the end of dragging
 * @param {MouseEvent} e - The mouseup event
 */
const handleMouseUp = debounce(async (e) => {
  if (!dragState.isDragging) return;

  // Get the indicator element
  const indicator = document.getElementById(`${BRAND}-indicator`);
  if (!indicator) return;

  // Reset dragging state
  dragState.isDragging = false;

  // Remove global event listeners
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);

  // Remove dragging class
  indicator.classList.remove("dragging");

  // Calculate percentage-based positions
  const rect = indicator.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const position = {
    top: `${(rect.top / viewportHeight) * 100}%`,
    left: `${(rect.left / viewportWidth) * 100}%`,
    right: "auto",
    bottom: "auto",
  };

  // Apply percentage-based positions directly to the indicator
  indicator.style.top = position.top;
  indicator.style.left = position.left;
  indicator.style.right = position.right;
  indicator.style.bottom = position.bottom;

  // Save the position
  const domain = window.location.hostname;
  await saveCustomPosition(domain, position);

  //console.log("Saved indicator position:", position);
}, 100);

/**
 * Gets the custom position for the current domain, or falls back to default
 * @param {Object} defaultPosition - Default position to use if no custom position found
 * @returns {Promise<Object>} Position object
 */
export async function getIndicatorPosition(defaultPosition) {
  const domain = window.location.hostname;
  const customPosition = await getCustomPosition(domain);
  return customPosition || defaultPosition;
}

/**
 * Updates the indicator position with a custom position if available
 * @param {HTMLElement} indicator - The indicator element
 */
export async function applyCustomPosition(indicator) {
  if (!indicator) return;

  const domain = window.location.hostname;
  const customPosition = await getCustomPosition(domain);

  if (customPosition) {
    // Apply custom position - ensure we're using the stored values directly
    // which should now be in responsive units
    Object.entries(customPosition).forEach(([prop, value]) => {
      indicator.style[prop] = value;
    });
  }
}

/**
 * Resets the indicator to its default position
 * @param {HTMLElement} indicator - The indicator element (optional, will find by ID if not provided)
 * @returns {Promise<boolean>} Whether reset was successful
 */
export async function resetIndicatorPosition(indicator = null) {
  try {
    const domain = window.location.hostname;

    // Clear saved position
    await clearCustomPosition(domain);

    // Find indicator if not provided
    indicator = indicator || document.getElementById(`${BRAND}-indicator`);
    if (!indicator) return false;

    // Remove inline positioning
    indicator.style.top = "";
    indicator.style.left = "";
    indicator.style.right = "";
    indicator.style.bottom = "";

    // Apply default position
    const position = getDomainPosition();
    Object.entries(position).forEach(([prop, value]) => {
      if (value) {
        indicator.style[prop] = value;
      }
    });

    return true;
  } catch (error) {
    console.error("Error resetting indicator position:", error);
    return false;
  }
}
