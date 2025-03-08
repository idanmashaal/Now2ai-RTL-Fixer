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
