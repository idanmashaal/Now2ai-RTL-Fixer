/**
 * @fileoverview Background configuration manager for RTL Fixer
 * Centralizes configuration management in the background service worker
 */

import { debugLog } from "../utils/utils.js";
import { VERSION } from "../config/constants.js";
import {
  getConfigMetadata,
  updateConfigMetadata,
  getCachedConfig,
  saveCachedConfig,
  clearAllCachedConfigs,
} from "./storage.js";
import {
  ConfigType,
  refreshConfigs,
  clearAllConfigs,
} from "../config/config-manager.js";

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
    await refreshConfigs();
    // Broadcast updates to active content scripts
    broadcastConfigUpdates();
  } catch (error) {
    debugLog("Error refreshing configs:", error);
  }
}

/**
 * Forces refresh of all configs
 */
export async function forceRefreshConfigs() {
  try {
    const result = await refreshConfigs(true);
    // Broadcast updates to active content scripts
    broadcastConfigUpdates();
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
    const result = await clearAllConfigs();
    // Broadcast updates to active content scripts
    broadcastConfigUpdates();
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
 */
function broadcastConfigUpdates() {
  activeContentScripts.forEach((tabId) => {
    try {
      chrome.tabs
        .sendMessage(tabId, { action: "configUpdated" })
        .catch((error) => {
          // If we can't reach a tab, it may have been closed
          debugLog(
            `Error sending to tab ${tabId}, removing from active list:`,
            error
          );
          activeContentScripts.delete(tabId);
        });
    } catch (error) {
      debugLog(`Error broadcasting to tab ${tabId}:`, error);
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

    if (cachedConfig && cachedConfig.data) {
      return cachedConfig.data;
    }

    // Fall back to bundled config (loaded via config-manager)
    const config = await import(`../config/json/${type}_config.json`);
    return config.default;
  } catch (error) {
    debugLog(`Error getting config for ${type}:`, error);
    throw error;
  }
}
