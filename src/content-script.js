/**
 * @fileoverview Main content script that initializes the RTL Fixer functionality
 */
import { debugLog } from "./utils/utils.js";
import { VERSION, DEBUG, ENV } from "./config/constants.js";
import { initializeObserver, stopObserver } from "./core/dom-observer.js";
import { initializeStyles, removeAllStyles } from "./core/style-manager.js";
import { showIndicator, hideIndicator } from "./ui/indicator.js";
import { initializeMessageHandling } from "./extension/message-handler.js";
import {
  getSettings,
  updateLastActive,
  isEnabledForDomain,
} from "./extension/storage.js";

const debugText = DEBUG ? "DEBUG=ON" : "DEBUG=OFF";

/**
 * Registers this content script with the background manager
 */
async function registerWithBackgroundManager() {
  try {
    await chrome.runtime.sendMessage({ action: "registerContentScript" });
    debugLog("Registered with background manager");

    // Add unregister handler for when tab closes
    window.addEventListener("beforeunload", async () => {
      try {
        await chrome.runtime.sendMessage({ action: "unregisterContentScript" });
        debugLog("Unregistered with background manager");
      } catch (error) {
        // Tab is closing, so errors are expected and can be ignored
      }
    });
  } catch (error) {
    debugLog("Error registering with background manager:", error);
  }
}

/**
 * Updates configurations and reapplies styles
 */
async function updateConfigurations() {
  try {
    debugLog("Updating configurations");
    // Reload styles with updated configs
    removeAllStyles();
    await initializeStyles();
    debugLog("Applied updated configurations");
  } catch (error) {
    debugLog("Error updating configurations:", error);
  }
}

// Initialize when the document is ready
async function initialize() {
  try {
    debugLog(`RTL Fixer Initializing v${VERSION} | ${ENV} | ${debugText}`);

    // Register with background manager
    await registerWithBackgroundManager();

    // Set up message handling for extension icon clicks
    initializeMessageHandling();

    // Check if extension should be enabled for this domain
    const hostname = window.location.hostname;
    const shouldEnable = await isEnabledForDomain(hostname);

    if (shouldEnable) {
      // Initialize core functionality
      await initializeStyles();
      initializeObserver();
      await showIndicator();
    } else {
      // Ensure extension is disabled for this domain
      stopObserver();
      removeAllStyles();
      hideIndicator();
    }

    // Record activity
    await updateLastActive();
  } catch (error) {
    debugLog("RTL Fixer initialization failed:", error);
  }
}

// Add message listener for configuration updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "configUpdated") {
    debugLog("Received config update notification");
    updateConfigurations();
    sendResponse({ success: true });
    return true;
  }
});

// Initialize on document load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
