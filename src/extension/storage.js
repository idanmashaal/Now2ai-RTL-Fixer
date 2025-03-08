/**
 * @fileoverview Storage management for RTL Fixer extension
 * Handles persistent storage of extension state and settings using chrome.storage
 */
import { debugLog } from "../utils/utils.js";

/**
 * @typedef {Object} RTLSettings
 * @property {boolean} enabled - Whether RTL Fixer is enabled
 * @property {Object} preferences - User preferences for RTL handling
 * @property {string[]} excludedDomains - Domains where RTL Fixer should not run
 */

/**
 * Default settings for new installations
 * @type {RTLSettings}
 */
const DEFAULT_SETTINGS = {
  enabled: true,
  preferences: {},
  excludedDomains: [],
};

/**
 * Storage keys used by the extension
 * @enum {string}
 */
const StorageKeys = {
  SETTINGS: "rtl_fixer_settings",
  LAST_ACTIVE: "rtl_fixer_last_active",
  CUSTOM_POSITIONS: "rtl_fixer_indicator_positions",
};

/**
 * Gets the current settings from storage
 * @returns {Promise<RTLSettings>} The current settings or defaults if not set
 * @throws {Error} If storage access fails
 */
export async function getSettings() {
  try {
    const result = await chrome.storage.sync.get(StorageKeys.SETTINGS);
    return result[StorageKeys.SETTINGS] || DEFAULT_SETTINGS;
  } catch (error) {
    debugLog("Failed to get settings:", error);
    throw error;
  }
}

/**
 * Updates the settings in storage
 * @param {Partial<RTLSettings>} newSettings - Settings to update
 * @returns {Promise<void>}
 * @throws {Error} If storage update fails
 */
export async function updateSettings(newSettings) {
  try {
    const currentSettings = await getSettings();
    const mergedSettings = {
      ...currentSettings,
      ...newSettings,
      preferences: {
        ...currentSettings.preferences,
        ...newSettings.preferences,
      },
    };

    await chrome.storage.sync.set({
      [StorageKeys.SETTINGS]: mergedSettings,
    });
  } catch (error) {
    debugLog("Failed to update settings:", error);
    throw error;
  }
}

/**
 * Checks if RTL Fixer should be enabled for the current domain
 * @param {string} domain - Domain to check
 * @returns {Promise<boolean>} Whether RTL Fixer should be enabled
 */
export async function isEnabledForDomain(domain) {
  try {
    const settings = await getSettings();
    return settings.enabled && !settings.excludedDomains.includes(domain);
  } catch (error) {
    debugLog("Failed to check domain status:", error);
    return false;
  }
}

/**
 * Adds a domain to the exclusion list
 * @param {string} domain - Domain to exclude
 * @returns {Promise<void>}
 */
export async function excludeDomain(domain) {
  try {
    const settings = await getSettings();
    if (!settings.excludedDomains.includes(domain)) {
      settings.excludedDomains.push(domain);
      await updateSettings(settings);
    }
  } catch (error) {
    debugLog("Failed to exclude domain:", error);
    throw error;
  }
}

/**
 * Removes a domain from the exclusion list
 * @param {string} domain - Domain to remove from exclusion
 * @returns {Promise<void>}
 */
export async function includeDomain(domain) {
  try {
    const settings = await getSettings();
    settings.excludedDomains = settings.excludedDomains.filter(
      (d) => d !== domain
    );
    await updateSettings(settings);
  } catch (error) {
    debugLog("Failed to include domain:", error);
    throw error;
  }
}

/**
 * Records the last active timestamp for analytics
 * @returns {Promise<void>}
 * @private
 */
export async function updateLastActive() {
  try {
    await chrome.storage.sync.set({
      [StorageKeys.LAST_ACTIVE]: Date.now(),
    });
  } catch (error) {
    debugLog("Failed to update last active timestamp:", error);
    // Non-critical error, don't throw
  }
}

/**
 * Resets all settings to defaults
 * @returns {Promise<void>}
 */
export async function resetSettings() {
  try {
    await chrome.storage.sync.set({
      [StorageKeys.SETTINGS]: DEFAULT_SETTINGS,
    });
  } catch (error) {
    debugLog("Failed to reset settings:", error);
    throw error;
  }
}

/**
 * Gets custom position for a specific domain
 * @param {string} domain - Domain to get position for
 * @returns {Promise<Object|null>} Custom position or null if not set
 */
export async function getCustomPosition(domain) {
  try {
    const result = await chrome.storage.sync.get(StorageKeys.CUSTOM_POSITIONS);
    const positions = result[StorageKeys.CUSTOM_POSITIONS] || {};
    return positions[domain] || null;
  } catch (error) {
    debugLog("Failed to get custom position:", error);
    return null;
  }
}

/**
 * Saves custom position for a specific domain
 * @param {string} domain - Domain to save position for
 * @param {Object} position - Position object with top, left, etc.
 * @returns {Promise<boolean>} Whether save was successful
 */
export async function saveCustomPosition(domain, position) {
  try {
    // Store original pixel values for reference
    const pixelPosition = { ...position };

    // Convert pixels to percentages for responsive positioning
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const convertedPosition = { ...position };

    // Convert top/bottom/left/right to percentages if they exist and are in pixels
    if (convertedPosition.top && convertedPosition.top.endsWith("px")) {
      const topValue = parseInt(convertedPosition.top);
      convertedPosition.top = `${(topValue / viewportHeight) * 100}%`;
    }

    if (convertedPosition.left && convertedPosition.left.endsWith("px")) {
      const leftValue = parseInt(convertedPosition.left);
      convertedPosition.left = `${(leftValue / viewportWidth) * 100}%`;
    }

    if (convertedPosition.right && convertedPosition.right.endsWith("px")) {
      const rightValue = parseInt(convertedPosition.right);
      convertedPosition.right = `${(rightValue / viewportWidth) * 100}%`;
    }

    if (convertedPosition.bottom && convertedPosition.bottom.endsWith("px")) {
      const bottomValue = parseInt(convertedPosition.bottom);
      convertedPosition.bottom = `${(bottomValue / viewportHeight) * 100}%`;
    }

    // Get current positions
    const result = await chrome.storage.sync.get(StorageKeys.CUSTOM_POSITIONS);
    let positions = result[StorageKeys.CUSTOM_POSITIONS] || {};

    // Update position for domain, storing both formats
    positions[domain] = {
      percentage: convertedPosition, // Use this for rendering (responsive)
      pixels: pixelPosition, // Store this for reference only
    };

    // Save updated positions
    await chrome.storage.sync.set({
      [StorageKeys.CUSTOM_POSITIONS]: positions,
    });

    return true;
  } catch (error) {
    debugLog("Failed to save custom position:", error);
    return false;
  }
}

/**
 * Clears custom position for a specific domain
 * @param {string} domain - Domain to clear position for
 * @returns {Promise<boolean>} Whether clear was successful
 */
export async function clearCustomPosition(domain) {
  try {
    // Get current positions
    const result = await chrome.storage.sync.get(StorageKeys.CUSTOM_POSITIONS);
    let positions = result[StorageKeys.CUSTOM_POSITIONS] || {};

    // Remove position for domain if it exists
    if (positions[domain]) {
      delete positions[domain];

      // Save updated positions
      await chrome.storage.sync.set({
        [StorageKeys.CUSTOM_POSITIONS]: positions,
      });
    }

    return true;
  } catch (error) {
    debugLog("Failed to clear custom position:", error);
    return false;
  }
}
