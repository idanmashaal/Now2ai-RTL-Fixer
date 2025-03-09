/**
 * @fileoverview Utility functions for retrieving configuration from the background service worker
 * Provides a centralized way for content scripts to access configurations
 */
import { debugLog } from "./utils.js";

/**
 * Gets configuration data from the background script
 * @param {string} configType - Type of configuration to retrieve
 * @returns {Promise<Object>} Configuration data
 */
export async function getConfigFromBackground(configType) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "getConfig", configType },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response || !response.success) {
          reject(new Error(response?.error || "Failed to get config"));
          return;
        }

        resolve(response.config);
      }
    );
  });
}
