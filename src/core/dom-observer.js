/**
 * @fileoverview DOM Mutation Observer implementation for RTL Fixer
 * Handles watching for and responding to DOM changes that require RTL processing
 */
import {
  getCurrentDomainConfig,
  createElementSelector,
} from "../config/domains.js";
import { SELECTORS } from "../config/selectors.js";
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
 * Direction-related attributes and styles to monitor for changes
 * @type {string[]}
 */
const DIRECTION_ATTRIBUTES = ["dir"];
const DIRECTION_STYLES = ["direction", "unicode-bidi"];

/**
 * Processes a newly added or modified DOM element
 * @param {HTMLElement} element - The element to process
 * @private
 */
function processElement(element) {
  if (!isElementProcessed(element)) {
    applyRTLStyles(element);
  }
}

/**
 * Processes child elements of a container that match our selectors
 * @param {HTMLElement} container - The container element to search within
 * @private
 */
function processChildElements(container) {
  const domainConfig = getCurrentDomainConfig();
  const elementSelector = createElementSelector(domainConfig.selectors);
  container.querySelectorAll(elementSelector).forEach((element) => {
    if (!isElementProcessed(element)) {
      applyRTLStyles(element);
    }
  });
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
function handleAttributeMutation(mutation) {
  if (mutation.target instanceof HTMLElement) {
    const element = mutation.target;
    const domainConfig = getCurrentDomainConfig();
    const elementSelector = createElementSelector(domainConfig.selectors);

    if (isDirectionChange(mutation) || element.matches(elementSelector)) {
      processElement(element);
    }
  }
}

/**
 * Handles addition of new nodes to the DOM
 * @param {MutationRecord} mutation - The mutation record to process
 * @private
 */
function handleChildListMutation(mutation) {
  mutation.addedNodes.forEach((node) => {
    if (node instanceof HTMLElement) {
      // Process the new element itself
      processElement(node);
      // Process any matching children
      processChildElements(node);
    }
  });
}

/**
 * Creates and configures a new MutationObserver
 * @returns {MutationObserver} Configured observer instance
 * @private
 */
function createObserver() {
  return new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      try {
        if (mutation.type === "attributes") {
          handleAttributeMutation(mutation);
        } else if (mutation.type === "childList") {
          handleChildListMutation(mutation);
        }
      } catch (error) {
        console.error("Error processing mutation:", error);
      }
    });
  });
}

/**
 * Initializes the DOM observer
 * @returns {boolean} True if initialization was successful
 * @throws {Error} If observer cannot be initialized
 */
export function initializeObserver() {
  if (observerState?.isActive) {
    return false;
  }

  try {
    const observer = createObserver();
    const domainConfig = getCurrentDomainConfig();

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
    processChildElements(document.body);

    return true;
  } catch (error) {
    console.error("Failed to initialize observer:", error);
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
    return true;
  } catch (error) {
    console.error("Failed to stop observer:", error);
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
