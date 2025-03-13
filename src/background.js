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
  initializeBackgroundConfigManager,
  refreshConfigsIfNeeded,
  forceRefreshConfigs,
  resetConfigsToBundled,
  updateRefreshInterval,
  getConfigForType,
  registerContentScript,
  unregisterContentScript,
  shouldRefreshConfigs,
} from "./extension/background-config-manager.js";

// Initialize background configuration manager when extension is installed or updated
chrome.runtime.onInstalled.addListener(async (details) => {
  await initializeBackgroundConfigManager();

  // Force refresh configs on install or update
  if (details.reason === "install" || details.reason === "update") {
    debugLog(`Forcing config refresh. Reason: extension ${details.reason}`);
    await forceRefreshConfigs();
  }
});

// Ensure configuration manager is initialized when browser starts
chrome.runtime.onStartup.addListener(async () => {
  await initializeBackgroundConfigManager();
});

// Handle alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "configRefreshAlarm") {
    refreshConfigsIfNeeded();
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog("Background received message:", message);

  switch (message.action) {
    case "refreshConfigs":
      forceRefreshConfigs()
        .then((result) => sendResponse({ success: true, result }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true; // Keep message channel open for async response

    case "resetConfigs":
      resetConfigsToBundled()
        .then((result) => sendResponse({ success: true, result }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    case "setRefreshInterval":
      updateRefreshInterval(message.minutes)
        .then((result) => sendResponse({ success: true, result }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    case "getConfig":
      if (!message.configType) {
        sendResponse({ success: false, error: "No config type specified" });
        return true;
      }
      getConfigForType(message.configType)
        .then((config) => sendResponse({ success: true, config }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    case "registerContentScript":
      if (sender.tab && sender.tab.id) {
        registerContentScript(sender.tab.id);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: "No tab ID available" });
      }
      return true;

    case "unregisterContentScript":
      if (sender.tab && sender.tab.id) {
        unregisterContentScript(sender.tab.id);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: "No tab ID available" });
      }
      return true;

    case "checkDomain":
      // Check if domain is enabled and send response to popup
      isEnabledForDomain(message.hostname)
        .then((enabled) => sendResponse({ enabled }))
        .catch((error) => {
          debugLog("Error checking domain status:", error);
          sendResponse({ enabled: true, error: error.message });
        });
      return true;

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

    case "checkConfigRefreshStatus":
      shouldRefreshConfigs()
        .then((shouldRefresh) => sendResponse({ shouldRefresh }))
        .catch((error) =>
          sendResponse({ shouldRefresh: false, error: error.message })
        );
      return true; // Keep message channel open for async response
  }
});

// Handle tab closing to clean up registered content scripts
chrome.tabs.onRemoved.addListener((tabId) => {
  unregisterContentScript(tabId);
});
