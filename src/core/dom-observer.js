/**
 * @fileoverview DOM Mutation Observer implementation for RTL Fixer
 * Handles watching for and responding to DOM changes that require RTL processing
 */
import { debugLog } from "../utils/utils.js";
import { getConfigFromBackground } from "../utils/config-utils.js";
import { createElementSelector } from "../config/domains.js";
import { applyRTLStyles, isElementProcessed } from "./rtl-handler.js";

/**
 * @typedef {Object} ObserverState
 * @property {MutationObserver} observer - The MutationObserver instance
 * @property {boolean} isActive - Whether the observer is currently active
 */

/**
 * Tracks the current observer state
 * @type {ObserverState|null}
 */
let observerState = null;

/**
 * Cache for domain configuration
 */
let cachedDomainConfig = null;

/**
 * Direction-related attributes and styles to monitor for changes
 * @type {string[]}
 */
const DIRECTION_ATTRIBUTES = ["dir"];
const DIRECTION_STYLES = ["direction", "unicode-bidi"];

/**
 * Gets the domain configuration for the current site
 * @returns {Promise<Object>} Domain configuration
 */
async function getDomainConfig() {
  if (!cachedDomainConfig) {
    // Get domains config
    const domainsConfig = await getConfigFromBackground("domains");

    // Find matching domain
    const currentDomain = window.location.hostname;
    cachedDomainConfig =
      domainsConfig.find(
        (config) =>
          config.domain !== "default" &&
          new RegExp(config.domain).test(currentDomain)
      ) || domainsConfig.find((config) => config.domain === "default");

    if (!cachedDomainConfig) {
      throw new Error(`No domain configuration found for: ${currentDomain}`);
    }
  }

  return cachedDomainConfig;
}

/**
 * Processes a newly added or modified DOM element
 * @param {HTMLElement} element - The element to process
 * @private
 */
async function processElement(element) {
  if (!isElementProcessed(element)) {
    await applyRTLStyles(element);
  }
}

/**
 * Processes child elements of a container that match our selectors
 * @param {HTMLElement} container - The container element to search within
 * @private
 */
async function processChildElements(container) {
  const domainConfig = await getDomainConfig();
  const elementSelector = createElementSelector(domainConfig.selectors);
  const elements = container.querySelectorAll(elementSelector);

  for (const element of elements) {
    if (!isElementProcessed(element)) {
      await applyRTLStyles(element);
    }
  }
}

/**
 * Checks if an element's direction-related attributes or styles have changed
 * @param {MutationRecord} mutation - The mutation record
 * @returns {boolean} True if direction properties changed
 * @private
 */
function isDirectionChange(mutation) {
  if (mutation.type === "attributes") {
    // Check if the changed attribute is direction-related
    if (DIRECTION_ATTRIBUTES.includes(mutation.attributeName)) {
      return true;
    }

    // Check for style attribute changes that affect direction
    if (mutation.attributeName === "style") {
      const element = mutation.target;
      return DIRECTION_STYLES.some(
        (prop) => element.style[prop] !== "" && !isElementProcessed(element)
      );
    }
  }
  return false;
}

/**
 * Handles attribute mutations on observed elements
 * @param {MutationRecord} mutation - The mutation record to process
 * @private
 */
async function handleAttributeMutation(mutation) {
  if (mutation.target instanceof HTMLElement) {
    const element = mutation.target;
    const domainConfig = await getDomainConfig();
    const elementSelector = createElementSelector(domainConfig.selectors);

    if (isDirectionChange(mutation) || element.matches(elementSelector)) {
      await processElement(element);
    }
  }
}

/**
 * Handles addition of new nodes to the DOM
 * @param {MutationRecord} mutation - The mutation record to process
 * @private
 */
async function handleChildListMutation(mutation) {
  for (const node of mutation.addedNodes) {
    if (node instanceof HTMLElement) {
      // Process the new element itself
      await processElement(node);
      // Process any matching children
      await processChildElements(node);
    }
  }
}

/**
 * Creates and configures a new MutationObserver
 * @returns {MutationObserver} Configured observer instance
 * @private
 */
function createObserver() {
  return new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      try {
        if (mutation.type === "attributes") {
          handleAttributeMutation(mutation);
        } else if (mutation.type === "childList") {
          handleChildListMutation(mutation);
        }
      } catch (error) {
        debugLog("Error processing mutation:", error);
      }
    }
  });
}

/**
 * Initializes the DOM observer
 * @returns {Promise<boolean>} True if initialization was successful
 * @throws {Error} If observer cannot be initialized
 */
export async function initializeObserver() {
  if (observerState?.isActive) {
    return false;
  }

  try {
    const observer = createObserver();
    const domainConfig = await getDomainConfig();

    // Configure what to observe - expanded to catch more changes
    const observerConfig = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        ...domainConfig.selectors.attributes.map(({ selector }) => selector),
        "class",
        "style",
        "dir",
      ],
    };

    // Start observing
    observer.observe(document.body, observerConfig);

    // Store observer state
    observerState = {
      observer,
      isActive: true,
    };

    // Process existing elements
    await processChildElements(document.body);

    return true;
  } catch (error) {
    debugLog("Failed to initialize observer:", error);
    throw error;
  }
}

/**
 * Stops the DOM observer and cleans up
 * @returns {boolean} True if cleanup was successful
 */
export function stopObserver() {
  if (!observerState?.isActive) {
    return false;
  }

  try {
    observerState.observer.disconnect();
    observerState.isActive = false;

    // Add this code to clean up the refresh timer
    if (window.configRefreshTimer) {
      clearInterval(window.configRefreshTimer);
      window.configRefreshTimer = null;
    }

    return true;
  } catch (error) {
    debugLog("Failed to stop observer:", error);
    throw error;
  }
}

/**
 * Checks if the observer is currently active
 * @returns {boolean} True if the observer is running
 */
export function isObserverActive() {
  return observerState?.isActive ?? false;
}
