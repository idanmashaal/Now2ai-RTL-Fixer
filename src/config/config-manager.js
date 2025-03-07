/**
 * @fileoverview Configuration manager for RTL Fixer
 * Handles dynamic loading, caching, and validation of configuration
 */

import { BRAND, VERSION, DEBUG, ENV } from "./constants.js";
import { debugLog, hashString } from "../utils/utils.js";

// Import bundled configs
import defaultsConfigBundled from "./json/defaults_config.json";
import domainsConfigBundled from "./json/domains_config.json";
import stylesConfigBundled from "./json/styles_config.json";
import uiConfigBundled from "./json/ui_config.json";

// Storage keys
const StorageKeys = {
  CONFIG_METADATA: `${BRAND}_rtl_fixer_config_metadata`,
  CACHED_CONFIG_DEFAULTS: `${BRAND}_rtl_fixer_cached_config_defaults`,
  CACHED_CONFIG_DOMAINS: `${BRAND}_rtl_fixer_cached_config_domains`,
  CACHED_CONFIG_STYLES: `${BRAND}_rtl_fixer_cached_config_styles`,
  CACHED_CONFIG_UI: `${BRAND}_rtl_fixer_cached_config_ui`,
};

// Config sources
const ConfigSource = {
  BUNDLED: "bundled",
  REMOTE: "remote",
  CACHED: "cached",
};

// Config types
const ConfigType = {
  DEFAULTS: "defaults",
  DOMAINS: "domains",
  STYLES: "styles",
  UI: "ui",
};

// Remote config URLs
const CONFIG_URLS = {
  [ConfigType.DEFAULTS]:
    "https://raw.githubusercontent.com/idanmashaal/Now2ai-RTL-Fixer/dynamic-config/src/config/json/defaults_config.json",
  [ConfigType.DOMAINS]:
    "https://raw.githubusercontent.com/idanmashaal/Now2ai-RTL-Fixer/dynamic-config/src/config/json/domains_config.json",
  [ConfigType.STYLES]:
    "https://raw.githubusercontent.com/idanmashaal/Now2ai-RTL-Fixer/dynamic-config/src/config/json/styles_config.json",
  [ConfigType.UI]:
    "https://raw.githubusercontent.com/idanmashaal/Now2ai-RTL-Fixer/dynamic-config/src/config/json/ui_config.json",
};

// Update configuration
const UPDATE_CONFIG = {
  REFRESH_INTERVAL_MINUTES: 360,
  MAX_RETRY_COUNT: 3,
  RETRY_DELAY_SECONDS: 60,
  REQUEST_TIMEOUT_MS: 5000,
};

// Default metadata
const DEFAULT_METADATA = {
  last_update_check: 0,
  last_update_timestamp: 0,
  last_update_status: "never",
  last_successful_update: 0,
  update_attempt_count: 0,
  refresh_interval_minutes: UPDATE_CONFIG.REFRESH_INTERVAL_MINUTES,
  version: VERSION,
};

// Validation schemas (simple validation)
const validationSchemas = {
  [ConfigType.DEFAULTS]: (config) => {
    return (
      config &&
      typeof config === "object" &&
      config.position &&
      config.selectors
    );
  },
  [ConfigType.DOMAINS]: (config) => {
    return (
      Array.isArray(config) &&
      config.every(
        (domain) => domain.domain && domain.position && domain.selectors
      )
    );
  },
  [ConfigType.STYLES]: (config) => {
    return (
      config &&
      typeof config === "object" &&
      config["rtl-auto"] &&
      config["rtl-inherit"] &&
      config["rtl-force"]
    );
  },
  [ConfigType.UI]: (config) => {
    return (
      config &&
      typeof config === "object" &&
      config.theme &&
      config.indicatorBaseStyles
    );
  },
};

// Bundled configs mapped by type
const bundledConfigs = {
  [ConfigType.DEFAULTS]: defaultsConfigBundled,
  [ConfigType.DOMAINS]: domainsConfigBundled,
  [ConfigType.STYLES]: stylesConfigBundled,
  [ConfigType.UI]: uiConfigBundled,
};

// Queue for processing config updates
const updateQueue = [];
let isProcessingQueue = false;

/**
 * Gets the config metadata from storage
 * @returns {Promise<Object>} Config metadata
 */
export async function getConfigMetadata() {
  try {
    const result = await chrome.storage.local.get(StorageKeys.CONFIG_METADATA);
    return result[StorageKeys.CONFIG_METADATA] || { ...DEFAULT_METADATA };
  } catch (error) {
    debugLog("Error getting config metadata:", error);
    return { ...DEFAULT_METADATA };
  }
}

/**
 * Updates the config metadata in storage
 * @param {Object} metadata - New metadata to store
 * @returns {Promise<void>}
 */
async function updateConfigMetadata(metadata) {
  try {
    await chrome.storage.local.set({
      [StorageKeys.CONFIG_METADATA]: {
        ...(await getConfigMetadata()),
        ...metadata,
        version: VERSION, // Always use current version
      },
    });
  } catch (error) {
    debugLog("Error updating config metadata:", error);
  }
}

/**
 * Gets a cached config from storage
 * @param {string} type - Config type
 * @returns {Promise<Object|null>} Cached config or null if not found
 */
async function getCachedConfig(type) {
  const storageKey = getStorageKeyForType(type);
  try {
    const result = await chrome.storage.local.get(storageKey);
    return result[storageKey] || null;
  } catch (error) {
    debugLog(`Error getting cached ${type} config:`, error);
    return null;
  }
}

/**
 * Saves a config to cache
 * @param {string} type - Config type
 * @param {Object} configData - Config data and metadata to cache
 * @returns {Promise<boolean>} Success status
 */
async function saveCachedConfig(type, configData) {
  const storageKey = getStorageKeyForType(type);
  try {
    await chrome.storage.local.set({
      [storageKey]: configData,
    });
    return true;
  } catch (error) {
    debugLog(`Error saving ${type} config to cache:`, error);
    return false;
  }
}

/**
 * Gets the storage key for a config type
 * @param {string} type - Config type
 * @returns {string} Storage key
 */
function getStorageKeyForType(type) {
  switch (type) {
    case ConfigType.DEFAULTS:
      return StorageKeys.CACHED_CONFIG_DEFAULTS;
    case ConfigType.DOMAINS:
      return StorageKeys.CACHED_CONFIG_DOMAINS;
    case ConfigType.STYLES:
      return StorageKeys.CACHED_CONFIG_STYLES;
    case ConfigType.UI:
      return StorageKeys.CACHED_CONFIG_UI;
    default:
      throw new Error(`Unknown config type: ${type}`);
  }
}

/**
 * Validates a config against its schema
 * @param {string} type - Config type
 * @param {Object} config - Config to validate
 * @returns {boolean} Whether the config is valid
 */
function validateConfig(type, config) {
  try {
    const validator = validationSchemas[type];
    if (!validator) {
      debugLog(`No validator found for config type: ${type}`);
      return false;
    }
    return validator(config);
  } catch (error) {
    debugLog(`Error validating ${type} config:`, error);
    return false;
  }
}

/**
 * Fetches a remote config
 * @param {string} type - Config type
 * @param {string} [contentHash] - Previous content hash for comparison
 * @returns {Promise<Object>} Fetch result with status and data
 */
async function fetchRemoteConfig(type, contentHash = null) {
  const url = CONFIG_URLS[type];

  if (!url) {
    debugLog(`No URL defined for config type: ${type}`);
    return {
      success: false,
      status: 404,
      error: `No URL defined for config type: ${type}`,
    };
  }

  debugLog(`Starting fetch for ${type} config from ${url}`);
  debugLog(`Previous content hash: ${contentHash || "none"}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    debugLog(
      `Request timeout for ${type} config after ${UPDATE_CONFIG.REQUEST_TIMEOUT_MS}ms`
    );
    controller.abort();
  }, UPDATE_CONFIG.REQUEST_TIMEOUT_MS);

  try {
    debugLog(`Fetching remote config for ${type} from ${url}`);
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-cache", // Always check with server
    });

    clearTimeout(timeoutId);

    // Log response details
    debugLog(
      `Response status for ${type}: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      debugLog(
        `HTTP error for ${type}: ${response.status} ${response.statusText}`
      );
      return {
        success: false,
        status: response.status,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    // Try to parse response as JSON
    try {
      // Clone the response so we can access the text and json
      const responseClone = response.clone();
      const responseText = await responseClone.text();

      // Calculate content hash
      const newContentHash = await hashString(responseText);
      debugLog(`New content hash for ${type}: ${newContentHash}`);

      // Check if content is unchanged
      if (contentHash && contentHash === newContentHash) {
        debugLog(`Content unchanged for ${type} based on hash comparison`);
        return {
          success: true,
          status: 200,
          notModified: true,
        };
      }

      // Parse the text as JSON
      const data = JSON.parse(responseText);
      debugLog(
        `Successfully parsed ${type} config, content hash: ${newContentHash}`
      );

      return {
        success: true,
        status: response.status,
        data,
        contentHash: newContentHash,
      };
    } catch (parseError) {
      debugLog(`JSON parse error for ${type} config:`, parseError);
      return {
        success: false,
        status: response.status,
        error: `JSON parse error: ${parseError.message}`,
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      debugLog(
        `Request timeout for ${type} after ${UPDATE_CONFIG.REQUEST_TIMEOUT_MS}ms`
      );
      return {
        success: false,
        status: 0,
        error: `Request timeout after ${UPDATE_CONFIG.REQUEST_TIMEOUT_MS}ms`,
      };
    }

    debugLog(`Fetch error for ${type}:`, error);
    return {
      success: false,
      status: 0,
      error: error.message,
    };
  }
}

/**
 * Updates the timestamp and status for the last update
 * @param {boolean} isFullSuccess - Whether all configs were successfully updated
 * @returns {Promise<void>}
 */
async function updateLastUpdateTimestamp(isFullSuccess) {
  try {
    const now = Date.now();
    const updateType = isFullSuccess ? "successful" : "partial";
    debugLog(
      `Updating last_update timestamp (${updateType}) to ${new Date(
        now
      ).toISOString()}`
    );

    await updateConfigMetadata({
      last_update_timestamp: now,
      last_update_status: isFullSuccess ? "success" : "partial",
      last_successful_update: isFullSuccess
        ? now
        : await getConfigMetadata().then((m) => m.last_successful_update || 0),
    });
  } catch (error) {
    debugLog("Error updating update timestamps:", error);
  }
}

/**
 * Updates last_successful_update in the metadata after all configs are processed
 * @returns {Promise<void>}
 */
async function updateSuccessfulUpdateTimestamp() {
  try {
    const now = Date.now();
    debugLog(
      `Updating last_successful_update timestamp to ${new Date(
        now
      ).toISOString()}`
    );
    await updateConfigMetadata({
      last_successful_update: now,
    });
  } catch (error) {
    debugLog("Error updating last_successful_update:", error);
  }
}

async function processUpdateQueue() {
  debugLog(
    `Process update queue called. Queue length: ${updateQueue.length}, Processing: ${isProcessingQueue}`
  );

  if (isProcessingQueue || updateQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  // Track success/failure for each config update
  const results = {
    total: 0,
    success: 0,
    failed: 0,
  };

  try {
    while (updateQueue.length > 0) {
      const configType = updateQueue.shift();
      debugLog(`Processing update for config type: ${configType}`);

      results.total++;

      try {
        const success = await updateConfigFile(configType);
        debugLog(
          `Update result for ${configType}: ${success ? "Success" : "Failed"}`
        );

        if (success) {
          results.success++;
        } else {
          results.failed++;
        }
      } catch (error) {
        debugLog("Error processing update for config type:", configType, error);
        results.failed++;
      }

      // Continue with queue processing
      if (updateQueue.length > 0) {
        debugLog(
          `Continuing with queue processing. ${updateQueue.length} items remaining.`
        );
      } else {
        debugLog("Update queue is now empty.");
      }
    }
  } catch (error) {
    debugLog("Error processing update queue:", error);
  } finally {
    isProcessingQueue = false;

    // Only mark as fully successful if all configs updated successfully
    const isFullSuccess = results.failed === 0 && results.success > 0;
    debugLog(
      `Update summary: ${results.success}/${results.total} configs updated successfully`
    );

    // Update timestamps with success status
    await updateLastUpdateTimestamp(isFullSuccess);
  }
}

/**
 * Adds a config type to the update queue
 * @param {string} configType - Type of config to update
 */
function queueConfigUpdate(configType) {
  if (!updateQueue.includes(configType)) {
    updateQueue.push(configType);
    processUpdateQueue();
  }
}

/**
 * Updates a specific config file
 * @param {string} type - Config type to update
 * @returns {Promise<boolean>} Success status
 */
async function updateConfigFile(type) {
  const cachedConfig = await getCachedConfig(type);
  const currentHash = cachedConfig?.contentHash || null;

  debugLog(
    `Updating ${type} config, current content hash: ${currentHash || "none"}`
  );

  let retryCount = 0;
  let success = false;

  while (retryCount < UPDATE_CONFIG.MAX_RETRY_COUNT && !success) {
    if (retryCount > 0) {
      // Wait before retry with exponential backoff
      const delayMs =
        UPDATE_CONFIG.RETRY_DELAY_SECONDS * 1000 * Math.pow(2, retryCount - 1);
      debugLog(
        `Retry ${retryCount}/${UPDATE_CONFIG.MAX_RETRY_COUNT} for ${type} config in ${delayMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const result = await fetchRemoteConfig(type, currentHash);

    if (result.success) {
      if (result.notModified) {
        // Config hasn't changed, update timestamp only
        if (cachedConfig) {
          cachedConfig.timestamp = Date.now();
          await saveCachedConfig(type, cachedConfig);
        }
        return true;
      }

      // Validate new config
      if (
        validateConfig(type, result.data) &&
        validateSchemaCompatibility(type, result.data)
      ) {
        // Save new config to cache
        const newCachedConfig = {
          source: ConfigSource.REMOTE,
          timestamp: Date.now(),
          contentHash: result.contentHash,
          url: CONFIG_URLS[type],
          data: result.data,
        };

        await saveCachedConfig(type, newCachedConfig);
        debugLog(`Successfully updated ${type} config from remote`);
        return true;
      } else {
        debugLog(
          `Invalid ${type} config received from remote - either basic validation or schema compatibility check failed`
        );
      }
    } else {
      debugLog(`Failed to fetch ${type} config:`, result.error);
    }

    retryCount++;
  }

  return success;
}

/**
 * Initializes a specific config type
 * Ensures there's always a valid config available
 * @param {string} type - Config type to initialize
 * @returns {Promise<Object>} The config data
 */
async function initializeConfigType(type) {
  let cachedConfig = await getCachedConfig(type);

  // If no cached config, initialize with bundled
  if (!cachedConfig) {
    debugLog(
      `No cached ${type} config found, initializing with bundled version`
    );

    cachedConfig = {
      source: ConfigSource.BUNDLED,
      timestamp: Date.now(),
      etag: null,
      url: CONFIG_URLS[type],
      data: bundledConfigs[type],
    };

    await saveCachedConfig(type, cachedConfig);
  }

  return cachedConfig.data;
}

/**
 * Checks if it's time to refresh configs
 * @returns {Promise<boolean>} Whether refresh is needed
 */
async function shouldRefreshConfigs() {
  const metadata = await getConfigMetadata();
  const now = Date.now();
  const lastCheck = metadata.last_update_check || 0;
  const minutesElapsed = (now - lastCheck) / (1000 * 60);

  return (
    minutesElapsed >=
    (metadata.refresh_interval_minutes ||
      UPDATE_CONFIG.REFRESH_INTERVAL_MINUTES)
  );
}

/**
 * Refreshes all configs if needed
 * @param {boolean} [force=false] - Force refresh regardless of time
 * @returns {Promise<boolean>} Whether any configs were updated
 */
export async function refreshConfigs(force = false) {
  debugLog("Starting config refresh check");

  // Check if refresh is needed
  if (!force) {
    const shouldRefresh = await shouldRefreshConfigs();
    debugLog(`Should refresh configs: ${shouldRefresh}`);

    if (!shouldRefresh) {
      debugLog("Config refresh not needed yet based on time threshold");
      return false;
    }
  } else {
    debugLog("Forced config refresh requested");
  }

  // Update last check timestamp
  const now = Date.now();
  debugLog(`Updating last check timestamp to ${new Date(now).toISOString()}`);
  await updateConfigMetadata({
    last_update_check: now,
  });

  // Queue all config types for update
  debugLog("Queueing all config types for update");
  Object.values(ConfigType).forEach((type) => {
    debugLog(`Queueing update for ${type} config`);
    queueConfigUpdate(type);
  });

  return true;
}

/**
 * Clears all cached configs
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllConfigs() {
  debugLog("Clearing all cached configs");

  try {
    const keysToRemove = [
      StorageKeys.CONFIG_METADATA,
      StorageKeys.CACHED_CONFIG_DEFAULTS,
      StorageKeys.CACHED_CONFIG_DOMAINS,
      StorageKeys.CACHED_CONFIG_STYLES,
      StorageKeys.CACHED_CONFIG_UI,
    ];

    debugLog(`Removing storage keys: ${keysToRemove.join(", ")}`);
    await chrome.storage.local.remove(keysToRemove);

    // Verify the configs were removed
    const remainingItems = await chrome.storage.local.get(keysToRemove);
    const removedSuccessfully = Object.keys(remainingItems).length === 0;

    if (removedSuccessfully) {
      debugLog("Successfully cleared all cached configs");
    } else {
      debugLog("Failed to clear all configs, remaining items:", remainingItems);
    }

    return removedSuccessfully;
  } catch (error) {
    debugLog("Error clearing configs:", error);
    return false;
  }
}

/**
 * Initializes the configuration system
 * @returns {Promise<void>}
 */
export async function initializeConfigs() {
  debugLog("Initializing config manager");

  // Perform initial refresh check
  await refreshConfigs().catch((error) => {
    debugLog("Error during initial config refresh:", error);
  });

  // Get the current refresh interval from metadata
  const metadata = await getConfigMetadata();
  const refreshInterval =
    metadata.refresh_interval_minutes || UPDATE_CONFIG.REFRESH_INTERVAL_MINUTES;

  // Set up periodic checks
  setupRefreshTimer(refreshInterval);
}
/**
 * Gets a specific config
 * @param {string} type - Config type
 * @returns {Promise<Object>} Config data
 */
export async function getConfig(type) {
  // First try to get cached remote config
  const cachedConfig = await getCachedConfig(type);

  if (
    cachedConfig &&
    cachedConfig.data &&
    cachedConfig.source === ConfigSource.REMOTE
  ) {
    debugLog(`Using cached remote ${type} config`);
    return cachedConfig.data;
  }

  // If no valid remote config, use bundled directly
  debugLog(`Using bundled ${type} config`);
  return bundledConfigs[type];
}

/**
 * Gets the last update info for a specific config
 * @param {string} type - Config type
 * @returns {Promise<Object>} Update info
 */
export async function getConfigUpdateInfo(type) {
  const cachedConfig = await getCachedConfig(type);

  if (!cachedConfig) {
    return {
      source: ConfigSource.BUNDLED,
      timestamp: null,
      isRemote: false,
    };
  }

  return {
    source: cachedConfig.source,
    timestamp: cachedConfig.timestamp,
    contentHash: cachedConfig.contentHash,
    isRemote: cachedConfig.source === ConfigSource.REMOTE,
  };
}

/**
 * Gets overall config status information
 * @returns {Promise<Object>} Config status info
 */
export async function getConfigStatus() {
  const metadata = await getConfigMetadata();
  const configInfoPromises = Object.values(ConfigType).map(async (type) => {
    const info = await getConfigUpdateInfo(type);
    return { type, ...info };
  });

  const configInfos = await Promise.all(configInfoPromises);

  return {
    lastUpdateCheck: metadata.last_update_check,
    lastUpdateTimestamp: metadata.last_update_timestamp,
    lastUpdateStatus: metadata.last_update_status || "unknown",
    lastSuccessfulUpdate: metadata.last_successful_update,
    refreshIntervalMinutes: metadata.refresh_interval_minutes, // Changed from hours to minutes
    configInfos,
  };
}

/**
 * Validates that a remote config has a compatible schema with the bundled config
 * @param {string} type - Config type
 * @param {Object} remoteConfig - Remote config to validate
 * @returns {boolean} Whether the schema is compatible
 */
function validateSchemaCompatibility(type, remoteConfig) {
  const bundledConfig = bundledConfigs[type];

  // Simple recursive function to check structure compatibility
  function isStructureCompatible(bundled, remote) {
    // Check for different types
    if (typeof bundled !== typeof remote) {
      debugLog(
        `Type mismatch: bundled=${typeof bundled}, remote=${typeof remote}`
      );
      return false;
    }

    // Arrays should contain same types of elements
    if (Array.isArray(bundled)) {
      if (!Array.isArray(remote) || remote.length === 0) {
        return false;
      }

      // For arrays, we just check the first element as a representative
      if (bundled.length > 0 && remote.length > 0) {
        if (typeof bundled[0] !== typeof remote[0]) {
          debugLog(`Array element type mismatch in ${type}`);
          return false;
        }

        // If elements are objects, check their structure
        if (typeof bundled[0] === "object" && bundled[0] !== null) {
          // Get all unique keys from bundled items
          const bundledKeys = new Set();
          bundled.forEach((item) => {
            if (item && typeof item === "object") {
              Object.keys(item).forEach((key) => bundledKeys.add(key));
            }
          });

          // Check if first remote item has all required keys
          const requiredKeys = Array.from(bundledKeys);
          const missingKeys = requiredKeys.filter(
            (key) => !remote[0].hasOwnProperty(key)
          );

          if (missingKeys.length > 0) {
            debugLog(
              `Remote config ${type} missing required array item keys: ${missingKeys.join(
                ", "
              )}`
            );
            return false;
          }
        }
      }
      return true;
    }

    // Objects should have compatible structure
    if (typeof bundled === "object" && bundled !== null) {
      if (typeof remote !== "object" || remote === null) {
        return false;
      }

      // Check if all keys in bundled exist in remote
      for (const key of Object.keys(bundled)) {
        if (!remote.hasOwnProperty(key)) {
          debugLog(`Remote config ${type} missing required key: ${key}`);
          return false;
        }

        // Recursively check nested structures
        if (typeof bundled[key] === "object" && bundled[key] !== null) {
          if (!isStructureCompatible(bundled[key], remote[key])) {
            return false;
          }
        }
      }
      return true;
    }

    // For primitive types, we just check type compatibility, already done above
    return true;
  }

  return isStructureCompatible(bundledConfig, remoteConfig);
}

/**
 * Gets detailed config source information for debugging
 * @returns {Promise<Object>} Detailed config source info
 */
export async function getConfigSourceInfo() {
  debugLog("Getting config source info");
  const results = {};

  for (const type of Object.values(ConfigType)) {
    const cachedConfig = await getCachedConfig(type);
    debugLog(`Config source for ${type}: ${cachedConfig?.source || "bundled"}`);

    results[type] = {
      source: cachedConfig?.source || ConfigSource.BUNDLED,
      timestamp: cachedConfig?.timestamp || null,
      contentHash: cachedConfig?.contentHash || null,
    };
  }

  debugLog("Complete config source info:", results);
  return results;
}

/**
 * Sends a message to the background script to manage configs
 * @param {string} action - The action to perform
 * @returns {Promise<any>} The response from the background script
 */
async function sendConfigMessage(action) {
  debugLog(`Sending config message for action: ${action}`);

  try {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action }, (response) => {
        debugLog(`Received response for ${action}:`, response);
        resolve(response);
      });
    });
  } catch (error) {
    debugLog(`Error sending ${action} message:`, error);
    throw error;
  }
}

// Export the config types
export { ConfigType };

/**
 * Sets up a timer to periodically check for config updates
 * @param {number} intervalMinutes - Interval in minutes between checks
 */
function setupRefreshTimer(intervalMinutes) {
  const intervalMs = intervalMinutes * 60 * 1000;

  // Clear any existing timer
  if (window.configRefreshTimer) {
    clearInterval(window.configRefreshTimer);
  }

  // Set up new timer
  debugLog(
    `Setting up config refresh timer to check every ${intervalMinutes} minutes`
  );
  window.configRefreshTimer = setInterval(async () => {
    debugLog("Config refresh timer triggered");
    try {
      const shouldRefresh = await shouldRefreshConfigs();
      if (shouldRefresh) {
        debugLog("Auto refresh: Time to check for config updates");
        await refreshConfigs();
      } else {
        debugLog("Auto refresh: Not time to check for updates yet");
      }
    } catch (error) {
      debugLog("Error in refresh timer:", error);
    }
  }, intervalMs);

  // Also attach to window unload to clean up
  window.addEventListener("beforeunload", () => {
    if (window.configRefreshTimer) {
      clearInterval(window.configRefreshTimer);
    }
  });
}

/**
 * Updates the refresh interval for config updates
 * @param {number} minutes - New interval in minutes
 * @returns {Promise<boolean>} Success status
 */
export async function setRefreshInterval(minutes) {
  if (typeof minutes !== "number" || minutes < 1) {
    debugLog(`Invalid refresh interval: ${minutes}, must be a positive number`);
    return false;
  }

  try {
    debugLog(`Setting new refresh interval to ${minutes} minutes`);

    // Update metadata
    await updateConfigMetadata({
      refresh_interval_minutes: minutes,
    });

    // Reset content script timer with new interval
    setupRefreshTimer(minutes);

    // Update background alarm via message
    try {
      await chrome.runtime.sendMessage({
        action: "updateRefreshInterval",
        minutes: minutes,
      });
    } catch (e) {
      // Ignore errors here - background might not be available
      debugLog("Failed to update background alarm:", e);
    }

    return true;
  } catch (error) {
    debugLog("Error setting refresh interval:", error);
    return false;
  }
}
