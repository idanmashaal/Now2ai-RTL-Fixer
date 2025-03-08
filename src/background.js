/**
 * @fileoverview Background script for RTL Fixer extension
 * Handles extension icon clicks, browser-level events, and popup communication
 *
 * The background script serves as a lightweight controller that:
 * 1. Communicates with the popup UI
 * 2. Manages storage operations
 * 3. Relays messages to content scripts
 */
import { debugLog } from "./utils/utils.js";
import {
  getSettings,
  isEnabledForDomain,
  excludeDomain,
  includeDomain,
} from "./extension/storage.js";
import {
  refreshConfigs,
  clearAllConfigs,
  setRefreshInterval,
  getConfigMetadata,
} from "./config/config-manager.js";

// Create alarm when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  createConfigRefreshAlarm();
});

// Handle alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "configRefreshAlarm") {
    checkForConfigUpdates();
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  switch (message.action) {
    case "refreshConfigs":
      handleRefreshConfigs(sendResponse);
      return true; // Keep message channel open for async response

    case "resetConfigs":
      handleResetConfigs(sendResponse);
      return true;

    case "setRefreshInterval":
      handleSetRefreshInterval(message.minutes, sendResponse);
      return true;

    case "updateRefreshInterval":
      createConfigRefreshAlarm()
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
  }
});

/**
 * Handles refreshing configs
 * @param {Function} sendResponse - Function to send response back to sender
 */
async function handleRefreshConfigs(sendResponse) {
  try {
    console.log("Background handling config refresh request");
    const result = await refreshConfigs(true); // Force refresh
    console.log("Config refresh result:", result);
    sendResponse({ success: true, result });
  } catch (error) {
    console.error("Error refreshing configs:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handles resetting configs to bundled versions
 * @param {Function} sendResponse - Function to send response back to sender
 */
async function handleResetConfigs(sendResponse) {
  try {
    console.log("Background handling config reset request");
    const result = await clearAllConfigs();
    console.log("Config reset result:", result);
    sendResponse({ success: true, result });
  } catch (error) {
    console.error("Error resetting configs:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handles setting refresh interval
 * @param {number} minutes - New interval in minutes
 * @param {Function} sendResponse - Function to send response back to sender
 */
async function handleSetRefreshInterval(minutes, sendResponse) {
  try {
    console.log(
      `Background handling set refresh interval request: ${minutes} minutes`
    );
    const result = await setRefreshInterval(minutes);
    console.log("Set refresh interval result:", result);
    sendResponse({ success: true, result });
  } catch (error) {
    console.error("Error setting refresh interval:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Create the config refresh alarm
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

    console.log(`Config refresh alarm set for every ${minutes} minutes`);
  } catch (error) {
    console.error("Error creating config refresh alarm:", error);
  }
}

// Function to check for updates
async function checkForConfigUpdates() {
  try {
    console.log("Background update check triggered by alarm");
    await refreshConfigs();
  } catch (error) {
    console.error("Error checking for config updates:", error);
  }
}

// Also add a message listener to update the alarm when interval changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateRefreshInterval") {
    createConfigRefreshAlarm()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

/**
 * Handles messages from the popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle different message types
  switch (message.action) {
    case "checkDomain":
      // Check if domain is enabled and send response to popup
      isEnabledForDomain(message.hostname)
        .then((enabled) => sendResponse({ enabled }))
        .catch((error) => {
          debugLog("Error checking domain status:", error);
          sendResponse({ enabled: true, error: error.message });
        });
      return true; // Keep message channel open for async response

    case "excludeDomain":
      // Disable for this domain
      excludeDomain(message.hostname)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          debugLog("Error excluding domain:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case "includeDomain":
      // Enable for this domain
      includeDomain(message.hostname)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          debugLog("Error including domain:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
  }
});
