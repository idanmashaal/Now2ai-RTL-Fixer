/**
 * @fileoverview Utility functions for DOM manipulation and RTL text detection
 * Provides helper functions used across the extension
 */

import { ENV, DEBUG } from "../config/constants.js";

// Initially use the build-time DEBUG flag
let dynamicDebugEnabled = DEBUG;

/**
 * Updates the debug flag based on loaded configuration
 * @param {Object} config - The defaults configuration object
 */
export function updateDebugConfig(config) {
  if (config?.settings?.debug) {
    // We have dynamic debug settings
    if (ENV === "development") {
      dynamicDebugEnabled = config.settings.debug.development ?? true;
    } else {
      dynamicDebugEnabled = config.settings.debug.production ?? false;
    }
  }
}

/**
 * Checks if debugging is currently enabled
 * @returns {boolean} Whether debugging is enabled
 */
export function isDebugEnabled() {
  return dynamicDebugEnabled;
}

/**
 * Logs debug or error messages with a timestamp and error prefix if needed.
 * @param {...any} args - Arguments to pass to console.log or console.error.
 */
export function debugLog(...args) {
  // Only log if debugging is enabled
  if (!isDebugEnabled()) {
    return;
  }

  const now = new Date();
  const utcDate = new Date(now.getTime()); // Create a copy for UTC manipulation
  const timezoneOffset = now.getTimezoneOffset() * 60000; // Offset in milliseconds
  const localTimestamp = new Date(utcDate.getTime() - timezoneOffset);

  const timestamp = localTimestamp.toISOString().replace("T", " ").slice(0, 23);
  const basePrefix = `[${timestamp}][Now2.ai RTL Fixer Debug]`;
  const errorPrefix = `[${timestamp}][❌ Now2.ai RTL Fixer Error]`;

  let isError = false;
  for (const arg of args) {
    if (
      arg instanceof Error ||
      (typeof arg === "string" && arg.toLowerCase().includes("error"))
    ) {
      isError = true;
      break;
    } else if (
      typeof arg === "object" &&
      arg !== null &&
      arg.message &&
      typeof arg.message === "string" &&
      arg.stack
    ) {
      isError = true;
      break;
    }
  }

  // Format each argument
  const formattedArgs = args.map(formatDebugArgument);

  if (isError) {
    console.log(errorPrefix, ...formattedArgs);
  } else {
    console.log(basePrefix, ...formattedArgs);
  }
}

/**
 * Formats an argument for debug logging
 * @param {any} arg - Argument to format
 * @returns {any} Formatted argument
 */
function formatDebugArgument(arg) {
  if (typeof arg === "object" && arg !== null && !(arg instanceof Error)) {
    try {
      // Only convert simple objects, not DOM elements, errors, etc.
      if (arg.constructor === Object || Array.isArray(arg)) {
        return JSON.stringify(arg);
      }
    } catch (e) {
      // If serialization fails, return the original object
    }
  }
  return arg;
}

/**
 * Tests if a string contains RTL characters
 * @param {string} text - Text to test
 * @returns {boolean} True if text contains RTL characters
 */
export function hasRTLCharacters(text) {
  // Unicode ranges for RTL scripts
  const rtlRanges = [
    /[\u0591-\u07FF]/, // Hebrew, Arabic, Syriac, Thaana
    /[\uFB1D-\uFDFD]/, // Hebrew and Arabic presentation forms
    /[\uFE70-\uFEFC]/, // Arabic presentation forms-B
  ];

  return rtlRanges.some((range) => range.test(text));
}

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Safely removes a DOM element if it exists
 * @param {string} elementId - ID of element to remove
 * @returns {boolean} True if element was found and removed
 */
export function safeRemoveElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.remove();
    return true;
  }
  return false;
}

/**
 * Creates a style element with the given CSS
 * @param {string} css - CSS rules to inject
 * @param {string} id - ID for the style element
 * @returns {HTMLStyleElement} The created style element
 */
export function createStyleElement(css, id) {
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  return style;
}

/**
 * Checks if an element is visible in the viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if element is visible
 */
export function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

/**
 * Gets the computed text direction of an element
 * @param {HTMLElement} element - Element to check
 * @returns {string} Computed direction ('ltr' or 'rtl')
 */
export function getComputedDirection(element) {
  return window.getComputedStyle(element).direction;
}

/**
 * Safely adds event listeners with error handling
 * @param {HTMLElement} element - Element to attach listener to
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} [options] - Event listener options
 * @returns {Function} Cleanup function to remove listener
 */
export function safeAddEventListener(element, event, handler, options = {}) {
  try {
    element.addEventListener(event, handler, options);
    return () => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (error) {
        debugLog("Error removing event listener:", error);
      }
    };
  } catch (error) {
    debugLog("Error adding event listener:", error);
    return () => {}; // Return no-op cleanup function
  }
}

/**
 * Gets the effective text direction for an element
 * Considers inherited direction and content
 * @param {HTMLElement} element - Element to check
 * @returns {string} Effective direction ('ltr', 'rtl', or 'auto')
 */
export function getEffectiveDirection(element) {
  // Check explicit direction
  const dirAttr = element.getAttribute("dir");
  if (dirAttr) {
    return dirAttr;
  }

  // Check computed style
  const computedDir = getComputedDirection(element);
  if (computedDir !== "ltr") {
    return computedDir;
  }

  // Check text content
  const text = element.textContent || "";
  if (hasRTLCharacters(text)) {
    return "rtl";
  }

  return "ltr";
}

/**
 * Creates a simple hash of a string
 * @param {string} str - String to hash
 * @returns {string} Hash value as hex string
 */
export async function hashString(str) {
  // Use the SubtleCrypto API which is available in modern browsers
  try {
    // Convert string to buffer
    const msgBuffer = new TextEncoder().encode(str);

    // Hash the buffer
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hashHex;
  } catch (error) {
    debugLog("Error creating hash:", error);

    // Fallback to a simple hash function if SubtleCrypto is unavailable
    let hash = 0;
    if (str.length === 0) return hash.toString(16);

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16);
  }
}
