/**
 * @fileoverview Chrome Extension message handling
 * Manages communication between background script and content script
 */

import { initializeObserver, stopObserver } from '../core/dom-observer.js';
import { showIndicator, hideIndicator } from '../ui/indicator.js';
import { initializeStyles, removeAllStyles } from '../core/style-manager.js';
import { excludeDomain, includeDomain } from '../extension/storage.js';

/**
 * @typedef {Object} MessageResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {string} [error] - Error message if operation failed
 */

/**
 * Handles enabling RTL Fixer functionality
 * @returns {MessageResponse} Operation result
 * @private
 */
function handleEnable() {
  try {
    initializeStyles();
    initializeObserver();
    showIndicator();
    return { success: true };
  } catch (error) {
    console.error('Failed to enable RTL Fixer:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handles disabling RTL Fixer functionality
 * @returns {MessageResponse} Operation result
 * @private
 */
function handleDisable() {
  try {
    stopObserver();
    removeAllStyles();
    hideIndicator();
    return { success: true };
  } catch (error) {
    console.error('Failed to disable RTL Fixer:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initializes message handling for the extension
 * Sets up listeners for extension messages
 * @throws {Error} If message handlers cannot be initialized
 */
export function initializeMessageHandling() {
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      let response;

      switch (message.action) {
        case 'enable':
          response = handleEnable();
          break;
        case 'disable':
          response = handleDisable();
          break;
        case 'toggle':
          // Get current state
          const isCurrentlyActive = stopObserver();
          
          // Toggle and update storage
          if (isCurrentlyActive) {
            response = handleDisable();
            const hostname = window.location.hostname;
            // Save disabled state for this domain
            excludeDomain(hostname).catch(err => 
              console.error('Failed to update domain settings:', err)
            );
          } else {
            response = handleEnable();
            const hostname = window.location.hostname;
            // Save enabled state for this domain
            includeDomain(hostname).catch(err => 
              console.error('Failed to update domain settings:', err)
            );
          }
          break;
        default:
          response = {
            success: false,
            error: `Unknown action: ${message.action}`
          };
      }

      sendResponse(response);
      return true; // Keep message channel open for async response
    });
  } catch (error) {
    console.error('Failed to initialize message handling:', error);
    throw error;
  }
}