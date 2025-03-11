/**
 * @fileoverview Utility functions for DOM manipulation and RTL text detection
 * Provides helper functions used across the extension
 */

import { ENV, DEBUG } from "../config/constants.js";
import {
  getStorageItem,
  setStorageItem,
  StorageKeys,
} from "../extension/storage.js";

// Define the debug storage key as a constant
const DEBUG_STORAGE_KEY = `${StorageKeys.SETTINGS}_debug`;

// Initially use the build-time DEBUG flag
let dynamicDebugEnabled = DEBUG;

// Define the full debug logging implementation
const fullDebugLogFunc = function (...args) {
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
};

// Define a no-op function for when debugging is disabled
const noopDebugFunc = function () {};

// Add a storage change listener to sync debug state across contexts
if (typeof chrome !== "undefined" && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[DEBUG_STORAGE_KEY]) {
      dynamicDebugEnabled = changes[DEBUG_STORAGE_KEY].newValue;
      // Switch function implementation based on new state
      debugLog = dynamicDebugEnabled ? fullDebugLogFunc : noopDebugFunc;
    }
  });
}

// Initialize debugLog function - will be swapped at runtime
export let debugLog = dynamicDebugEnabled ? fullDebugLogFunc : noopDebugFunc;

/**
 * Updates the debug flag based on loaded configuration
 * @param {Object} config - The defaults configuration object
 */
export async function updateDebugConfig(config) {
  if (!config?.settings?.debug) {
    return;
  }

  // Determine the new debug state based on environment
  const newDebugState =
    ENV === "development"
      ? Boolean(config.settings.debug.development)
      : Boolean(config.settings.debug.production);

  // Only update if the state has changed
  if (newDebugState !== dynamicDebugEnabled) {
    // Update debug state
    dynamicDebugEnabled = newDebugState;

    // Switch the function implementation
    debugLog = dynamicDebugEnabled ? fullDebugLogFunc : noopDebugFunc;

    try {
      // Persist the debug state using the existing storage system
      // This will trigger the storage listener in all contexts
      await setStorageItem(DEBUG_STORAGE_KEY, dynamicDebugEnabled, true);
    } catch (error) {
      // Use console.log since debugLog might be a no-op now
      console.log("❌ [Now2.ai RTL Fixer] Error saving debug state:", error);
    }
  }
}

/**
 * Loads the debug state from storage
 * Should be called during initialization
 */
export async function loadDebugState() {
  try {
    // Get debug state from storage
    const storedDebugState = await getStorageItem(
      DEBUG_STORAGE_KEY,
      null,
      true
    );

    // Only update if we have a stored value
    if (storedDebugState !== null) {
      dynamicDebugEnabled = storedDebugState;
      // Switch function implementation based on stored state
      debugLog = dynamicDebugEnabled ? fullDebugLogFunc : noopDebugFunc;
    }
  } catch (error) {
    // Can't use debugLog yet as it might not be enabled
    console.log("❌ [Now2.ai RTL Fixer] Error loading debug state:", error);
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
 * Gets the computed text direction of an element
 * @param {HTMLElement} element - Element to check
 * @returns {string} Computed direction ('ltr' or 'rtl')
 */
export function getComputedDirection(element) {
  return window.getComputedStyle(element).direction;
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
