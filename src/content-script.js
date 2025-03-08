/**
 * @fileoverview Main content script that initializes the RTL Fixer functionality
 */
import { debugLog } from "./utils/utils.js";
import { VERSION, DEBUG, ENV } from "./config/constants.js";
import { initializeConfigs } from "./config/config-manager.js";
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

// Initialize when the document is ready
async function initialize() {
  try {
    debugLog(`RTL Fixer Initializing v${VERSION} | ${ENV} | ${debugText}`);
    // Set up message handling for extension icon clicks
    initializeMessageHandling();

    // Set up Config Manager
    await initializeConfigs();

    // Check if extension should be enabled for this domain
    const hostname = window.location.hostname;
    const shouldEnable = await isEnabledForDomain(hostname);

    if (shouldEnable) {
      // Initialize core functionality
      initializeStyles();
      initializeObserver();
      showIndicator();
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

// Initialize on document load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
