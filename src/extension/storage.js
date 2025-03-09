/**
 * @fileoverview Storage management for RTL Fixer extension
 * Handles persistent storage of extension state and settings using chrome.storage
 */
import { debugLog } from "../utils/utils.js";
import { VERSION, DEBUG, ENV } from "../config/constants.js";
/**
 * @typedef {Object} RTLSettings
 * @property {boolean} enabled - Whether RTL Fixer is enabled
 * @property {Object} preferences - User preferences for RTL handling
 * @property {string[]} excludedDomains - Domains where RTL Fixer should not run
 */

/**
 * Common prefix for all storage keys to avoid conflicts with other extensions
 * @const {string}
 */
export const STORAGE_KEY_PREFIX = "rtl_fixer";

/**
 * Storage keys used by the extension
 * @enum {string}
 */
export const StorageKeys = {
  // User settings
  SETTINGS: `${STORAGE_KEY_PREFIX}_settings`,
  LAST_ACTIVE: `${STORAGE_KEY_PREFIX}_last_active`,
  CUSTOM_POSITIONS: `${STORAGE_KEY_PREFIX}_indicator_positions`,

  // Configuration system
  CONFIG_METADATA: `${STORAGE_KEY_PREFIX}_config_metadata`,
  CACHED_CONFIG_DEFAULTS: `${STORAGE_KEY_PREFIX}_cached_config_defaults`,
  CACHED_CONFIG_DOMAINS: `${STORAGE_KEY_PREFIX}_cached_config_domains`,
  CACHED_CONFIG_STYLES: `${STORAGE_KEY_PREFIX}_cached_config_styles`,
  CACHED_CONFIG_UI: `${STORAGE_KEY_PREFIX}_cached_config_ui`,
};

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
 * Generic function to get data from storage
 * @param {string} key - Storage key to retrieve
 * @param {Object} [defaultValue=null] - Default value if key doesn't exist
 * @param {boolean} [useLocal=false] - Whether to use local storage instead of sync
 * @returns {Promise<any>} Retrieved value or default
 * @throws {Error} If storage access fails
 */
export async function getStorageItem(
  key,
  defaultValue = null,
  useLocal = false
) {
  try {
    const storage = useLocal ? chrome.storage.local : chrome.storage.sync;
    const result = await storage.get(key);
    return result[key] !== undefined ? result[key] : defaultValue;
  } catch (error) {
    debugLog(`Failed to get storage item "${key}":`, error);
    throw error;
  }
}

/**
 * Generic function to set data in storage
 * @param {string} key - Storage key to set
 * @param {any} value - Value to store
 * @param {boolean} [useLocal=false] - Whether to use local storage instead of sync
 * @returns {Promise<boolean>} True if successful
 * @throws {Error} If storage access fails
 */
export async function setStorageItem(key, value, useLocal = false) {
  try {
    const storage = useLocal ? chrome.storage.local : chrome.storage.sync;
    await storage.set({ [key]: value });
    return true;
  } catch (error) {
    debugLog(`Failed to set storage item "${key}":`, error);
    throw error;
  }
}

/**
 * Generic function to remove data from storage
 * @param {string|string[]} keys - Storage key(s) to remove
 * @param {boolean} [useLocal=false] - Whether to use local storage instead of sync
 * @returns {Promise<boolean>} True if successful
 * @throws {Error} If storage access fails
 */
export async function removeStorageItem(keys, useLocal = false) {
  try {
    const storage = useLocal ? chrome.storage.local : chrome.storage.sync;
    await storage.remove(keys);
    return true;
  } catch (error) {
    debugLog(`Failed to remove storage items:`, error);
    throw error;
  }
}

/**
 * Gets all keys in storage matching a prefix
 * @param {string} prefix - Prefix to match
 * @param {boolean} [useLocal=false] - Whether to use local storage instead of sync
 * @returns {Promise<Object>} Object with all matching key-value pairs
 * @throws {Error} If storage access fails
 */
export async function getStorageItemsByPrefix(prefix, useLocal = false) {
  try {
    const storage = useLocal ? chrome.storage.local : chrome.storage.sync;
    const result = await storage.get(null); // Get all items

    // Filter for items with the prefix
    const matchingItems = {};
    for (const key in result) {
      if (key.startsWith(prefix)) {
        matchingItems[key] = result[key];
      }
    }

    return matchingItems;
  } catch (error) {
    debugLog(`Failed to get storage items with prefix "${prefix}":`, error);
    throw error;
  }
}

/**
 * Gets the current settings from storage
 * @returns {Promise<RTLSettings>} The current settings or defaults if not set
 * @throws {Error} If storage access fails
 */
export async function getSettings() {
  try {
    return await getStorageItem(StorageKeys.SETTINGS, DEFAULT_SETTINGS);
  } catch (error) {
    debugLog("Failed to get settings:", error);
    throw error;
  }
}

/**
 * Updates the settings in storage
 * @param {Partial<RTLSettings>} newSettings - Settings to update
 * @returns {Promise<boolean>} True if update was successful
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

    return await setStorageItem(StorageKeys.SETTINGS, mergedSettings);
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
 * @returns {Promise<boolean>} True if successful
 */
export async function excludeDomain(domain) {
  try {
    const settings = await getSettings();
    if (!settings.excludedDomains.includes(domain)) {
      settings.excludedDomains.push(domain);
      return await updateSettings(settings);
    }
    return true;
  } catch (error) {
    debugLog("Failed to exclude domain:", error);
    throw error;
  }
}

/**
 * Removes a domain from the exclusion list
 * @param {string} domain - Domain to remove from exclusion
 * @returns {Promise<boolean>} True if successful
 */
export async function includeDomain(domain) {
  try {
    const settings = await getSettings();
    settings.excludedDomains = settings.excludedDomains.filter(
      (d) => d !== domain
    );
    return await updateSettings(settings);
  } catch (error) {
    debugLog("Failed to include domain:", error);
    throw error;
  }
}

/**
 * Records the last active timestamp for analytics
 * @returns {Promise<boolean>} True if successful
 * @private
 */
export async function updateLastActive() {
  try {
    return await setStorageItem(StorageKeys.LAST_ACTIVE, Date.now());
  } catch (error) {
    debugLog("Failed to update last active timestamp:", error);
    return false; // Non-critical error, don't throw
  }
}

/**
 * Resets all settings to defaults
 * @returns {Promise<boolean>} True if successful
 */
export async function resetSettings() {
  try {
    return await setStorageItem(StorageKeys.SETTINGS, DEFAULT_SETTINGS);
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
    const positions = await getStorageItem(StorageKeys.CUSTOM_POSITIONS, {});
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
    const positions = await getStorageItem(StorageKeys.CUSTOM_POSITIONS, {});

    // Update position for domain, storing both formats
    positions[domain] = {
      percentage: convertedPosition, // Use this for rendering (responsive)
      pixels: pixelPosition, // Store this for reference only
    };

    // Save updated positions
    return await setStorageItem(StorageKeys.CUSTOM_POSITIONS, positions);
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
    const positions = await getStorageItem(StorageKeys.CUSTOM_POSITIONS, {});

    // Remove position for domain if it exists
    if (positions[domain]) {
      delete positions[domain];

      // Save updated positions
      return await setStorageItem(StorageKeys.CUSTOM_POSITIONS, positions);
    }

    return true;
  } catch (error) {
    debugLog("Failed to clear custom position:", error);
    return false;
  }
}

/**
 * Gets the config metadata from storage
 * @returns {Promise<Object>} Config metadata or default metadata if not set
 */
export async function getConfigMetadata() {
  // Default metadata structure
  const DEFAULT_METADATA = {
    last_update_check: 0,
    last_update_timestamp: 0,
    last_update_status: "never",
    last_successful_update: 0,
    update_attempt_count: 0,
    refresh_interval_minutes: 360, // Default to 6 hours
    version: VERSION,
  };

  try {
    return await getStorageItem(
      StorageKeys.CONFIG_METADATA,
      DEFAULT_METADATA,
      true
    );
  } catch (error) {
    debugLog("Error getting config metadata:", error);
    return { ...DEFAULT_METADATA };
  }
}

/**
 * Updates the config metadata in storage
 * @param {Object} metadata - New metadata to merge with existing
 * @returns {Promise<boolean>} Success status
 */
export async function updateConfigMetadata(metadata) {
  try {
    const currentMetadata = await getConfigMetadata();
    const updatedMetadata = {
      ...currentMetadata,
      ...metadata,
      version: VERSION, // Always use current version
    };

    return await setStorageItem(
      StorageKeys.CONFIG_METADATA,
      updatedMetadata,
      true
    );
  } catch (error) {
    debugLog("Error updating config metadata:", error);
    return false;
  }
}

/**
 * Gets a cached config from storage
 * @param {string} configType - Config type (defaults, domains, styles, ui)
 * @returns {Promise<Object|null>} Cached config or null if not found
 */
export async function getCachedConfig(configType) {
  const storageKey = getConfigStorageKey(configType);
  if (!storageKey) {
    debugLog(`Invalid config type: ${configType}`);
    return null;
  }

  try {
    return await getStorageItem(storageKey, null, true);
  } catch (error) {
    debugLog(`Error getting cached ${configType} config:`, error);
    return null;
  }
}

/**
 * Saves a config to cache
 * @param {string} configType - Config type (defaults, domains, styles, ui)
 * @param {Object} configData - Config data to cache
 * @returns {Promise<boolean>} Success status
 */
export async function saveCachedConfig(configType, configData) {
  const storageKey = getConfigStorageKey(configType);
  if (!storageKey) {
    debugLog(`Invalid config type: ${configType}`);
    return false;
  }

  try {
    return await setStorageItem(storageKey, configData, true);
  } catch (error) {
    debugLog(`Error saving ${configType} config to cache:`, error);
    return false;
  }
}

/**
 * Clears all cached configs
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllCachedConfigs() {
  const keysToRemove = [
    StorageKeys.CONFIG_METADATA,
    StorageKeys.CACHED_CONFIG_DEFAULTS,
    StorageKeys.CACHED_CONFIG_DOMAINS,
    StorageKeys.CACHED_CONFIG_STYLES,
    StorageKeys.CACHED_CONFIG_UI,
  ];

  try {
    debugLog(`Removing storage keys: ${keysToRemove.join(", ")}`);
    return await removeStorageItem(keysToRemove, true);
  } catch (error) {
    debugLog("Error clearing configs:", error);
    return false;
  }
}

/**
 * Gets the storage key for a config type
 * @param {string} configType - Config type
 * @returns {string|null} Storage key or null if invalid type
 * @private
 */
function getConfigStorageKey(configType) {
  switch (configType) {
    case "defaults":
      return StorageKeys.CACHED_CONFIG_DEFAULTS;
    case "domains":
      return StorageKeys.CACHED_CONFIG_DOMAINS;
    case "styles":
      return StorageKeys.CACHED_CONFIG_STYLES;
    case "ui":
      return StorageKeys.CACHED_CONFIG_UI;
    default:
      debugLog(`Unknown config type: ${configType}`);
      return null;
  }
}
