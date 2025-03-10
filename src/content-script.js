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
 * Updates configurations and reapplies styles and indicator
 */
async function updateConfigurations() {
  try {
    debugLog("Updating configurations");

    // First hide the indicator if it exists
    hideIndicator();

    // Clear any cached configurations in memory
    // This is critical to ensure we load fresh configs
    if (window.cachedDomainConfig) {
      window.cachedDomainConfig = null;
    }
    if (window.cachedStylesConfig) {
      window.cachedStylesConfig = null;
    }

    // Also clear any UI config cache
    if (window.cachedUiConfig) {
      window.cachedUiConfig = null;
    }

    // Reload styles with updated configs
    removeAllStyles();

    // Stop observer before reinitializing everything
    stopObserver();

    // Reinitialize styles with new configs
    await initializeStyles();

    // Reinitialize the observer to catch new elements
    initializeObserver();

    // Show the indicator with the new configuration
    // Pass true to force a UI config refresh
    await showIndicator(true);

    debugLog("Applied updated configurations and reinitialized UI components");
  } catch (error) {
    debugLog("Error updating configurations:", error);

    // Attempt recovery if the update failed
    try {
      // Reinitialize styles with potentially cached configs
      await initializeStyles();
      initializeObserver();
      await showIndicator(true);

      debugLog("Recovered from update error");
    } catch (recoveryError) {
      debugLog("Recovery failed:", recoveryError);
    }
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
    debugLog(
      `Received config update notification with results:`,
      message.updateResults
    );

    // Process the update immediately - we know all fetches are complete
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
