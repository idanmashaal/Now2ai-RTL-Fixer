/**
 * @fileoverview Popup script for RTL Fixer extension
 * Handles the popup UI and communicates with the content script and storage
 */

// Get DOM elements
const siteToggle = document.getElementById("site-toggle");
const statusText = document.getElementById("status-text");
const toggleContainer = document.getElementById("toggle-container");
const unsupportedContainer = document.getElementById("unsupported-container");
const refreshNotice = document.getElementById("refresh-notice");
const refreshLink = document.getElementById("refresh-link");

// List of supported domain patterns
const SUPPORTED_DOMAINS = [
  /^(?:[^.]+\.)?claude\.ai$/,
  /^notebooklm\.google\.com$/,
  /^gemini\.google\.com$/,
  /^(?:[^.]+\.)?perplexity\.ai$/,
  /^(?:[^.]+\.)?chatgpt\.com$/,
];

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
    console.log(
      "Could not connect to content script. This is normal on unsupported sites."
    );
    return { success: false, error: "Connection failed" };
  }
}

/**
 * Checks if a domain is supported by the extension
 * @param {string} hostname - The hostname to check
 * @returns {boolean} Whether the domain is supported
 */
function isDomainSupported(hostname) {
  return SUPPORTED_DOMAINS.some((pattern) => pattern.test(hostname));
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
    console.error("Error checking domain status:", error);
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
    console.error("Error toggling extension:", error);
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
      console.error("Invalid URL:", urlError);
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
    console.error("Failed to initialize popup:", error);
    // Show unsupported container as fallback for any error
    toggleContainer.style.display = "none";
    unsupportedContainer.style.display = "block";
  }
}

// Initialize when popup is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializePopup();

  // Set up refresh link click handler
  refreshLink.addEventListener("click", refreshPage);
});
