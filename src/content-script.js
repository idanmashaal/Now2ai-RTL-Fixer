/**
 * @fileoverview Main content script that initializes the RTL Fixer functionality
 */

import { initializeObserver, stopObserver } from './core/dom-observer.js';
import { initializeStyles, removeAllStyles } from './core/style-manager.js';
import { showIndicator, hideIndicator } from './ui/indicator.js';
import { initializeMessageHandling } from './extension/message-handler.js';
import { getSettings, updateLastActive, isEnabledForDomain } from './extension/storage.js';

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
    console.error('RTL Fixer initialization failed:', error);
  }
}

// Initialize on document load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}