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

debugLog(`RTL Fixer Initializing v${VERSION} | ${ENV} | ${debugText}`);

function updateFooter() {
  // Create the version info text
  let infoText = `v${VERSION}`;

  // Add env info and debug status only for development builds
  if (ENV === "development") {
    infoText += ` | DEV | ${debugText}`;
  }

  // Create the footer content
  footerElement.innerHTML = `<a href="https://go.now2.ai/he-ext-popup" target="_blank">Visit Now2.ai</a> | ${infoText}`;
}

// Initialize when the document is ready
async function initialize() {
  try {
    // Set up message handling for extension icon clicks
    initializeMessageHandling();

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
