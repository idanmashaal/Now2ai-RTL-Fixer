/**
 * @fileoverview Popup script for RTL Fixer extension
 * Handles the popup UI and communicates with the content script and storage
 */
import { debugLog } from "./utils/utils.js";
import { VERSION, DEBUG, ENV } from "./config/constants.js";
import {
  refreshConfigs,
  clearAllConfigs,
  getConfigStatus,
  getConfigSourceInfo,
  setRefreshInterval,
} from "./config/config-manager.js";

// Get DOM elements
const siteToggle = document.getElementById("site-toggle");
const statusText = document.getElementById("status-text");
const toggleContainer = document.getElementById("toggle-container");
const unsupportedContainer = document.getElementById("unsupported-container");
const refreshNotice = document.getElementById("refresh-notice");
const refreshLink = document.getElementById("refresh-link");
const resetPosition = document.getElementById("reset-position");
const resetPositionLink = document.getElementById("reset-position-link");
const footerElement = document.getElementById("footer-text");
const refreshConfigBtn = document.getElementById("refresh-config-btn");
const resetConfigBtn = document.getElementById("reset-config-btn");
const configStatusText = document.getElementById("config-status-text");
const configDetails = document.getElementById("config-details");
const refreshIntervalInput = document.getElementById("refresh-interval-input");
const refreshIntervalBtn = document.getElementById("refresh-interval-button");
const lastCheckDisplay = document.getElementById("last-check-display");
const lastUpdateDisplay = document.getElementById("last-update-display");
const refreshIntervalDisplay = document.getElementById(
  "refresh-interval-display"
);

// Load the list of supported domain patterns from domains config
import { isDomainSupported } from "./config/domains.js";

// Current tab information
let currentTab = null;
let currentHostname = null;

/**
 * Updates the UI based on the current state
 * @param {boolean} isEnabled - Whether RTL Fixer is enabled for the current site
 * @param {boolean} [showRefreshNotice=false] - Whether to show the refresh notice
 */
function updateUI(isEnabled, showRefreshNotice = false) {
  // Set the toggle state without animation
  siteToggle.checked = isEnabled;

  // Update status text
  statusText.textContent = isEnabled
    ? "RTL Fixer is enabled for this site."
    : "RTL Fixer is disabled for this site.";

  // Show or hide refresh notice
  refreshNotice.style.display = showRefreshNotice ? "block" : "none";

  // Make toggle container visible with a fade in effect
  toggleContainer.style.opacity = "1";
  toggleContainer.style.transition = "opacity 0.2s ease";

  // Show or hide reset position option
  resetPosition.style.display = isEnabled ? "block" : "none";
}

/**
 * Safely sends a message to the content script
 * @param {number} tabId - The ID of the tab to send the message to
 * @param {Object} message - The message to send
 * @returns {Promise<any>} The response from the content script
 */
async function sendMessageToContentScript(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    debugLog(
      "Could not connect to content script. This is normal on unsupported sites."
    );
    return { success: false, error: "Connection failed" };
  }
}

/**
 * Updates the config status display in the popup
 */
async function updateConfigStatusDisplay() {
  debugLog("Updating config status display");

  try {
    const status = await getConfigStatus();
    debugLog("Retrieved config status:", status);

    // Update refresh interval display
    if (status.refreshIntervalMinutes) {
      updateRefreshIntervalDisplay(status.refreshIntervalMinutes);
    } else {
      refreshIntervalDisplay.textContent = "Current: Unknown";
    }

    // Format last check time
    let lastCheckText = "Last checked: Never";
    if (status.lastUpdateCheck) {
      const date = new Date(status.lastUpdateCheck);
      lastCheckText = `Last checked: ${date.toLocaleString()}`;
    }
    lastCheckDisplay.textContent = lastCheckText;

    // Format last update status
    let lastUpdateText = "Last update: Never";
    if (status.lastUpdateTimestamp) {
      const date = new Date(status.lastUpdateTimestamp);
      const timeStr = date.toLocaleString();

      // Add status indicator
      let statusIndicator = "";
      if (status.lastUpdateStatus === "success") {
        statusIndicator = " ✓";
      } else if (status.lastUpdateStatus === "partial") {
        statusIndicator = " ⚠️";
      } else if (status.lastUpdateStatus === "failed") {
        statusIndicator = " ❌";
      }

      lastUpdateText = `Last update: ${timeStr}${statusIndicator}`;
    }
    lastUpdateDisplay.textContent = lastUpdateText;

    // Show detailed config sources if in development mode
    if (ENV === "development" || DEBUG) {
      // Your existing code for showing config sources
    }
  } catch (error) {
    debugLog("Error updating config status display:", error);
    lastCheckDisplay.textContent = "Error getting status";
    lastUpdateDisplay.textContent = "";
    refreshIntervalDisplay.textContent = "";
  }
}

/**
 * Handles refreshing configs when the button is clicked
 */
async function handleRefreshConfigs() {
  debugLog("Config refresh button clicked");
  refreshConfigBtn.disabled = true;
  refreshConfigBtn.textContent = "Refreshing...";

  try {
    // Try direct method first
    try {
      debugLog("Trying direct refreshConfigs call");
      await refreshConfigs(true);
    } catch (directError) {
      // Fall back to message passing
      debugLog("Direct call failed, trying message passing:", directError);
      await sendConfigMessage("refreshConfigs");
    }

    refreshConfigBtn.textContent = "Refresh Success!";
    await updateConfigStatusDisplay();
  } catch (error) {
    debugLog("Error refreshing configs:", error);
    refreshConfigBtn.textContent = "Refresh Failed";
  }

  setTimeout(() => {
    refreshConfigBtn.disabled = false;
    refreshConfigBtn.textContent = "Refresh Config";
  }, 2000);
}

/**
 * Handles resetting configs to bundled versions when the button is clicked
 */
async function handleResetConfigs() {
  debugLog("Reset to bundled button clicked");
  resetConfigBtn.disabled = true;
  resetConfigBtn.textContent = "Resetting...";

  try {
    // Try direct method first
    try {
      debugLog("Trying direct clearAllConfigs call");
      await clearAllConfigs();
    } catch (directError) {
      // Fall back to message passing
      debugLog("Direct call failed, trying message passing:", directError);
      await sendConfigMessage("clearAllConfigs");
    }

    resetConfigBtn.textContent = "Reset Success!";
    await updateConfigStatusDisplay();
  } catch (error) {
    debugLog("Error resetting configs:", error);
    resetConfigBtn.textContent = "Reset Failed";
  }

  setTimeout(() => {
    resetConfigBtn.disabled = false;
    resetConfigBtn.textContent = "Reset to Bundled";
  }, 2000);
}

/**
 * Checks if the extension is enabled for the current host
 * @param {string} hostname - The hostname to check
 * @returns {Promise<boolean>} Whether the extension is enabled
 */
async function isEnabledForDomain(hostname) {
  // If domain is not supported, return false
  if (!isDomainSupported(hostname)) {
    return false;
  }

  try {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "checkDomain", hostname },
        (response) => {
          resolve(response?.enabled || false);
        }
      );
    });
  } catch (error) {
    debugLog("Error checking domain status:", error);
    return false;
  }
}

/**
 * Toggles the extension state for the current site
 * @param {boolean} enabled - Whether to enable or disable
 */
async function toggleForSite(enabled) {
  if (!currentTab || !currentHostname) return;

  // Update UI immediately for better responsiveness
  updateUI(enabled, true); // Show refresh notice

  try {
    // Send message to background script to update storage
    await chrome.runtime.sendMessage({
      action: enabled ? "includeDomain" : "excludeDomain",
      hostname: currentHostname,
    });

    // Send message to content script to toggle functionality
    if (isDomainSupported(currentHostname)) {
      await sendMessageToContentScript(currentTab.id, {
        action: enabled ? "enable" : "disable",
      });
    }
  } catch (error) {
    debugLog("Error toggling extension:", error);
  }
}

/**
 * Refreshes the current tab
 */
function refreshPage() {
  if (currentTab && currentTab.id) {
    chrome.tabs.reload(currentTab.id);
    window.close(); // Close the popup
  }
}

// Initialize popup
async function initializePopup() {
  try {
    // Get the current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      throw new Error("No active tab found");
    }

    currentTab = tabs[0];

    // Make sure the tab has a valid URL
    if (!currentTab.url) {
      toggleContainer.style.display = "none";
      unsupportedContainer.style.display = "block";
      return;
    }

    // Skip chrome:// URLs and other restricted pages
    if (
      currentTab.url.startsWith("chrome://") ||
      currentTab.url.startsWith("chrome-extension://") ||
      currentTab.url.startsWith("about:")
    ) {
      toggleContainer.style.display = "none";
      unsupportedContainer.style.display = "block";
      return;
    }

    // Try to extract hostname
    let url;
    try {
      url = new URL(currentTab.url);
      currentHostname = url.hostname;
    } catch (urlError) {
      debugLog("Invalid URL:", urlError);
      toggleContainer.style.display = "none";
      unsupportedContainer.style.display = "block";
      return;
    }

    // Check if this is a supported domain
    const isSupported = isDomainSupported(currentHostname);

    if (isSupported) {
      // Show toggle container, hide unsupported message
      toggleContainer.style.display = "block";
      unsupportedContainer.style.display = "none";

      // Check if extension is enabled for this domain
      const isEnabled = await isEnabledForDomain(currentHostname);

      // Update UI
      updateUI(isEnabled);

      // Add transition class for future toggle changes
      setTimeout(() => {
        document.body.classList.add("enable-transitions");
      }, 300);

      // Set up event listener for toggle
      siteToggle.addEventListener("change", (e) => {
        toggleForSite(e.target.checked);
      });
    } else {
      // Show unsupported message, hide toggle container
      toggleContainer.style.display = "none";
      unsupportedContainer.style.display = "block";
    }
  } catch (error) {
    debugLog("Failed to initialize popup:", error);
    // Show unsupported container as fallback for any error
    toggleContainer.style.display = "none";
    unsupportedContainer.style.display = "block";
  }
}

// Function to handle resetting the indicator position
async function resetIndicatorPos() {
  if (!currentTab || !currentHostname) return;

  try {
    // Send message to content script to reset indicator position
    await sendMessageToContentScript(currentTab.id, {
      action: "resetPosition",
    });

    // Show success message or feedback
    resetPositionLink.textContent = "Reset successful!";
    setTimeout(() => {
      resetPositionLink.textContent = "Reset to default";
    }, 2000);
  } catch (error) {
    debugLog("Error resetting position:", error);
    resetPositionLink.textContent = "Reset failed";
    setTimeout(() => {
      resetPositionLink.textContent = "Reset to default";
    }, 2000);
  }
}

/**
 * Updates the refresh interval display
 * @param {number} minutes - The current interval in minutes
 */
function updateRefreshIntervalDisplay(minutes) {
  let displayText = `Current: ${minutes} minute${minutes !== 1 ? "s" : ""}`;

  // For intervals >= 60 minutes, also show hours
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    displayText = `Current: ${minutes} minutes`;

    if (hours === 1) {
      displayText += ` (${hours} hour`;
      if (remainingMinutes > 0) {
        displayText += ` and ${remainingMinutes} minute${
          remainingMinutes !== 1 ? "s" : ""
        }`;
      }
      displayText += ")";
    } else if (hours > 1) {
      displayText += ` (${hours} hours`;
      if (remainingMinutes > 0) {
        displayText += ` and ${remainingMinutes} minute${
          remainingMinutes !== 1 ? "s" : ""
        }`;
      }
      displayText += ")";
    }
  }

  refreshIntervalDisplay.textContent = displayText;
}

/**
 * Handles setting a new refresh interval
 */
async function handleSetRefreshInterval() {
  const minutes = parseInt(refreshIntervalInput.value);

  if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
    // Invalid input
    refreshIntervalInput.classList.add("error");
    setTimeout(() => refreshIntervalInput.classList.remove("error"), 2000);
    return;
  }

  refreshIntervalBtn.disabled = true;
  refreshIntervalBtn.textContent = "Setting...";

  try {
    const success = await setRefreshInterval(minutes);

    if (success) {
      refreshIntervalBtn.textContent = "Set!";
      updateRefreshIntervalDisplay(minutes);
      refreshIntervalInput.value = "";
    } else {
      refreshIntervalBtn.textContent = "Failed";
    }
  } catch (error) {
    debugLog("Error setting refresh interval:", error);
    refreshIntervalBtn.textContent = "Error";
  }

  setTimeout(() => {
    refreshIntervalBtn.disabled = false;
    refreshIntervalBtn.textContent = "Set";
  }, 2000);
}

/**
 * Updates the footer to display version and debug information
 */
function updateFooter() {
  // Create the version info text
  let infoText = `v${VERSION}`;

  // Add env info and debug status only for development builds
  if (ENV === "development") {
    const debugText = DEBUG ? "DEBUG=ON" : "DEBUG=OFF";
    infoText += ` | DEV | ${debugText}`;
  }

  // Create the footer content
  footerElement.innerHTML = `<a href="https://go.now2.ai/he-ext-popup" target="_blank">Visit Now2.ai</a> | ${infoText}`;
}

// Initialize when popup is loaded
document.addEventListener("DOMContentLoaded", () => {
  // First initialize the popup
  initializePopup();

  // Update footer with version and debug info
  updateFooter();

  // Show/hide dev-only controls
  const refreshIntervalContainer = document.querySelector(
    ".refresh-interval-container"
  );
  if (ENV === "development" || DEBUG) {
    // Show in development mode
    refreshIntervalContainer.style.display = "block";
  } else {
    // Hide in production mode
    refreshIntervalContainer.style.display = "none";
  }

  // Update config status display
  updateConfigStatusDisplay();

  // Set up refresh link click handler
  refreshLink.addEventListener("click", refreshPage);

  // Set up reset position link click handler
  resetPositionLink.addEventListener("click", resetIndicatorPos);

  // Set up config management button handlers
  refreshConfigBtn.addEventListener("click", handleRefreshConfigs);
  resetConfigBtn.addEventListener("click", handleResetConfigs);
  refreshIntervalBtn.addEventListener("click", handleSetRefreshInterval);
});
