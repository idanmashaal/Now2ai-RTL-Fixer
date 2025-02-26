/**
 * @fileoverview Storage management for RTL Fixer extension
 * Handles persistent storage of extension state and settings using chrome.storage
 */

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
  preferences: {
    autoEnable: true,
    showIndicator: true
  },
  excludedDomains: []
};

/**
 * Storage keys used by the extension
 * @enum {string}
 */
const StorageKeys = {
  SETTINGS: 'rtl_fixer_settings',
  LAST_ACTIVE: 'rtl_fixer_last_active'
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
    console.error('Failed to get settings:', error);
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
        ...newSettings.preferences
      }
    };

    await chrome.storage.sync.set({
      [StorageKeys.SETTINGS]: mergedSettings
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
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
    return settings.enabled && 
           !settings.excludedDomains.includes(domain);
  } catch (error) {
    console.error('Failed to check domain status:', error);
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
    console.error('Failed to exclude domain:', error);
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
    settings.excludedDomains = settings.excludedDomains
      .filter(d => d !== domain);
    await updateSettings(settings);
  } catch (error) {
    console.error('Failed to include domain:', error);
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
      [StorageKeys.LAST_ACTIVE]: Date.now()
    });
  } catch (error) {
    console.error('Failed to update last active timestamp:', error);
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
      [StorageKeys.SETTINGS]: DEFAULT_SETTINGS
    });
  } catch (error) {
    console.error('Failed to reset settings:', error);
    throw error;
  }
}