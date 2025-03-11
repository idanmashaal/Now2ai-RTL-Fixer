/**
 * @fileoverview UI Indicator component for RTL Fixer
 * Manages the visual indicator showing RTL Fixer's active status
 */
import { debugLog, debounce } from "../utils/utils.js";
import {
  saveCustomPosition,
  getCustomPosition,
  clearCustomPosition,
} from "../extension/storage.js";
import { BRAND, ENV } from "../config/constants.js";
import { getCurrentDomainConfig } from "../config/domains.js";
import { addStyles } from "../core/style-manager.js";
import { getConfigFromBackground } from "../utils/config-utils.js";

// Cache for UI configuration
let cachedUiConfig = null;

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
 * Gets the UI theme configuration, ensuring fresh data
 * @param {boolean} forceRefresh - Whether to force a refresh from background
 * @returns {Promise<Object>} The UI theme configuration
 */
async function getUiConfig(forceRefresh = false) {
  if (!cachedUiConfig || forceRefresh) {
    try {
      cachedUiConfig = await getConfigFromBackground("ui");
      debugLog(
        "Loaded fresh UI config:",
        cachedUiConfig ? "success" : "failed"
      );
    } catch (error) {
      debugLog("Error loading UI config:", error);
      // Fallback to a basic theme if config can't be loaded
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
      };
    }
  }
  return cachedUiConfig;
}

/**
 * Gets position configuration for the current domain
 * @returns {Promise<Object>} Position configuration for the current domain
 * @private
 */
async function getDomainPosition() {
  const domainConfig = await getCurrentDomainConfig();
  return domainConfig.position;
}

/**
 * Generates CSS styles for the indicator based on position and theme
 * @param {Object} position - Position configuration object
 * @param {boolean} forceRefresh - Whether to force a UI config refresh
 * @returns {Promise<string>} CSS rules for the indicator
 * @private
 */
async function generateIndicatorStyles(position, forceRefresh = false) {
  // Get fresh UI config with theme
  const uiConfig = await getUiConfig(forceRefresh);
  const theme = uiConfig.theme;

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

  // Use the actually loaded theme values
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
      background: ${theme.light.background};
      color: ${theme.light.text};
      border: 1px solid ${theme.light.border};
      transition: opacity 0.2s ease;
    }

    #${BRAND}-indicator a {
      color: ${theme.light.link};
      text-decoration: none;
      font-weight: 500;
    }

    @media (prefers-color-scheme: dark) {
      #${BRAND}-indicator {
        background: ${theme.dark.background};
        color: ${theme.dark.text};
        border-color: ${theme.dark.border};
      }
      #${BRAND}-indicator a {
        color: ${theme.dark.link};
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
  const text = document.createTextNode(
    " RTL Fixer" + (ENV === "development" ? " (Dev)" : "")
  );

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
 * @param {boolean} forceRefresh - Whether to force a UI config refresh
 * @returns {Promise<HTMLElement>} The indicator element
 * @throws {Error} If indicator cannot be created or positioned
 */
export async function showIndicator(forceRefresh = false) {
  try {
    // If indicator exists and we're not forcing a refresh, just return it
    if (indicatorState.element && !forceRefresh) {
      return indicatorState.element;
    }

    // If we're forcing a refresh and the indicator exists, remove it first
    if (forceRefresh && indicatorState.element) {
      hideIndicator();
    }

    // Create indicator element
    const indicator = createIndicatorElement();
    document.body.appendChild(indicator);

    // Add styles with fresh UI config
    const position = await getDomainPosition();
    const styles = await generateIndicatorStyles(position, forceRefresh);
    const styleElement = addStyles(styles);

    // Update state
    indicatorState.element = indicator;
    indicatorState.styles = styleElement;

    // Make indicator draggable and apply custom position if available
    makeDraggable(indicator);
    await applyCustomPosition(indicator);

    debugLog(
      "Indicator created with fresh config:",
      indicator ? "success" : "failed"
    );
    return indicator;
  } catch (error) {
    debugLog("Failed to show indicator:", error);
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
    // Clear the UI config cache to ensure fresh load next time
    cachedUiConfig = null;
    return true;
  } catch (error) {
    debugLog("Failed to hide indicator:", error);
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

  // Get current pixel positions first
  const rect = indicator.getBoundingClientRect();
  const pixelPosition = {
    top: `${Math.round(rect.top)}px`,
    left: `${Math.round(rect.left)}px`,
    right: "auto",
    bottom: "auto",
  };

  // Calculate percentage-based positions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const percentagePosition = {
    top: `${(rect.top / viewportHeight) * 100}%`,
    left: `${(rect.left / viewportWidth) * 100}%`,
    right: "auto",
    bottom: "auto",
  };

  // Apply percentage-based positions directly to the indicator
  indicator.style.top = percentagePosition.top;
  indicator.style.left = percentagePosition.left;
  indicator.style.right = percentagePosition.right;
  indicator.style.bottom = percentagePosition.bottom;

  // Save both positions (pixels for reference, percentages for use)
  const domain = window.location.hostname;
  await saveCustomPosition(domain, pixelPosition);

  // Enhanced console log with both pixels and percentages
  debugLog(`Saved indicator position for ${domain}:`, {
    pixels: pixelPosition,
    percentage: percentagePosition,
  });
}, 100);

/**
 * Updates the indicator position with a custom position if available
 * @param {HTMLElement} indicator - The indicator element
 */
export async function applyCustomPosition(indicator) {
  if (!indicator) return;

  const domain = window.location.hostname;
  const positionData = await getCustomPosition(domain);

  if (positionData) {
    // Check if we have new format (with percentage/pixels) or old format
    const customPosition = positionData.percentage || positionData;

    // Apply custom position - ensure we're using the stored values directly
    // which should now be in responsive units
    Object.entries(customPosition).forEach(([prop, value]) => {
      indicator.style[prop] = value;
    });

    // Log the pixel values for reference
    if (positionData.pixels) {
      debugLog(
        `Reference position (pixels) for ${domain}:`,
        positionData.pixels
      );
    }
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
    const position = await getDomainPosition();
    Object.entries(position).forEach(([prop, value]) => {
      if (value) {
        indicator.style[prop] = value;
      }
    });

    debugLog("Reset to default position:", position);
    return true;
  } catch (error) {
    debugLog("Error resetting indicator position:", error);
    return false;
  }
}
