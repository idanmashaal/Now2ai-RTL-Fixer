/**
 * @fileoverview Background configuration manager for RTL Fixer
 * Centralizes configuration management in the background service worker
 */

import { debugLog, updateDebugConfig, loadDebugState } from "../utils/utils.js";
import { VERSION, DEBUG, ENV } from "../config/constants.js";
import {
  getConfigMetadata,
  updateConfigMetadata,
  getCachedConfig,
  saveCachedConfig,
  clearAllCachedConfigs,
  setStorageItem,
  getStorageItem,
  StorageKeys,
} from "./storage.js";
import {
  ConfigType,
  refreshConfigs,
  clearAllConfigs,
  shouldRefreshConfigs,
} from "../config/config-manager.js";

export { shouldRefreshConfigs };

const DEBUG_STORAGE_KEY = `${StorageKeys.SETTINGS}_debug`;

// Track active tabs that need config updates
const activeContentScripts = new Set();

/**
 * Initializes the background configuration manager
 * Sets up alarms and performs initial configuration loading
 */
export async function initializeBackgroundConfigManager() {
  debugLog("Initializing background config manager");

  // Create alarm for periodic config refresh
  await createConfigRefreshAlarm();

  // Perform initial refresh check
  await refreshConfigsIfNeeded();
}

/**
 * Creates alarm for periodic config refresh
 */
async function createConfigRefreshAlarm() {
  try {
    // Get current interval from storage
    const metadata = await getConfigMetadata();
    const minutes = metadata.refresh_interval_minutes || 360; // Default to 6 hours

    // Clear any existing alarm
    await chrome.alarms.clear("configRefreshAlarm");

    // Create new alarm
    chrome.alarms.create("configRefreshAlarm", {
      periodInMinutes: minutes,
    });

    debugLog(`Config refresh alarm set for every ${minutes} minutes`);
  } catch (error) {
    debugLog("Error creating config refresh alarm:", error);
  }
}

/**
 * Checks if configs need refreshing and performs refresh if needed
 */
export async function refreshConfigsIfNeeded() {
  try {
    // Define the callback function to be invoked when all updates complete
    const onUpdateComplete = (isFullSuccess, results) => {
      // Now we can safely broadcast the update to content scripts
      broadcastConfigUpdates(isFullSuccess, results);
    };

    // Start the refresh process with the callback
    await refreshConfigs(false, onUpdateComplete);
  } catch (error) {
    debugLog("Error refreshing configs:", error);
  }
}

/**
 * Forces refresh of all configs
 * @returns {Promise<boolean>} Whether the refresh was successful
 */
export async function forceRefreshConfigs() {
  try {
    // Define the callback function to be invoked when all updates complete
    const onUpdateComplete = (isFullSuccess, results) => {
      // Now we can safely broadcast the update to content scripts
      broadcastConfigUpdates(isFullSuccess, results);
    };

    // Start the refresh process with the callback
    const result = await refreshConfigs(true, onUpdateComplete);
    return result;
  } catch (error) {
    debugLog("Error forcing config refresh:", error);
    throw error;
  }
}

/**
 * Resets all configs to bundled versions
 */
export async function resetConfigsToBundled() {
  try {
    // Clear all configs
    const result = await clearAllConfigs();

    // Reset debug settings to the original build-time DEBUG value
    await setStorageItem(DEBUG_STORAGE_KEY, DEBUG, true);
    debugLog(`Reset debug setting to build-time value: ${DEBUG}`);

    // Make sure any background context reloads the debug state
    await loadDebugState();

    // Broadcast updates to active content scripts with success information
    broadcastConfigUpdates(true, { total: 4, success: 4, failed: 0 });
    return result;
  } catch (error) {
    debugLog("Error resetting configs:", error);
    throw error;
  }
}
/**
 * Sets the refresh interval for config updates
 * @param {number} minutes - New interval in minutes
 */
export async function updateRefreshInterval(minutes) {
  if (typeof minutes !== "number" || minutes < 1) {
    debugLog(`Invalid refresh interval: ${minutes}`);
    return false;
  }

  try {
    // Update in storage
    await updateConfigMetadata({
      refresh_interval_minutes: minutes,
    });

    // Update alarm
    await createConfigRefreshAlarm();

    return true;
  } catch (error) {
    debugLog("Error updating refresh interval:", error);
    return false;
  }
}

/**
 * Registers a tab as having an active content script
 * @param {number} tabId - ID of the tab with active content script
 */
export function registerContentScript(tabId) {
  activeContentScripts.add(tabId);
  debugLog(`Registered content script in tab ${tabId}`);
}

/**
 * Unregisters a tab when content script is no longer active
 * @param {number} tabId - ID of the tab to unregister
 */
export function unregisterContentScript(tabId) {
  activeContentScripts.delete(tabId);
  debugLog(`Unregistered content script in tab ${tabId}`);
}

/**
 * Broadcasts config updates to all active content scripts
 * @param {boolean} isFullSuccess - Whether all updates were successful
 * @param {Object} results - Update results with counts of successful and failed updates
 */
function broadcastConfigUpdates(isFullSuccess, results) {
  activeContentScripts.forEach((tabId) => {
    try {
      // First check if the tab still exists
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          // Tab doesn't exist anymore
          debugLog(`Tab ${tabId} no longer exists, removing from active list`);
          activeContentScripts.delete(tabId);
          return;
        }

        // Tab exists, try to send message
        chrome.tabs.sendMessage(
          tabId,
          {
            action: "configUpdated",
            isFullSuccess: isFullSuccess,
            updateResults: results,
            timestamp: Date.now(),
          },
          (response) => {
            if (chrome.runtime.lastError) {
              // Content script might not be ready to receive messages
              debugLog(
                `Could not deliver message to tab ${tabId}: ${chrome.runtime.lastError.message}`
              );
              // Don't remove from active list as the script might just be loading
            } else {
              debugLog(`Successfully delivered update to tab ${tabId}`);
            }
          }
        );
      });
    } catch (error) {
      debugLog(`Error checking tab ${tabId}:`, error);
    }
  });
}

/**
 * Gets config for a specific type
 * @param {string} type - Config type to get
 * @returns {Promise<Object>} Config data
 */
export async function getConfigForType(type) {
  try {
    // First check cached config
    const cachedConfig = await getCachedConfig(type);

    let config;
    if (cachedConfig && cachedConfig.data) {
      config = cachedConfig.data;
      debugLog(`Got ${type} config from cache`);
    } else {
      // Fall back to bundled config
      const bundledConfig = await import(`../config/json/${type}_config.json`);
      config = bundledConfig.default;
      debugLog(`Got ${type} config from bundled fallback`);
    }

    // Update debug settings if this is the defaults config
    if (type === ConfigType.DEFAULTS) {
      debugLog(`Updating debug config with ${type} config settings`);
      await updateDebugConfig(config);
    }

    return config;
  } catch (error) {
    debugLog(`Error getting config for ${type}:`, error);
    throw error;
  }
}
