/**
 * @fileoverview Domain configurations for the RTL Fixer extension
 * Defines supported platforms and their specific layout requirements
 */

import {
  DEFAULT_SELECTORS,
  createElementSelector,
  getClassesForElement,
} from "./selectors.js";

/**
 * @typedef {Object} Position
 * @property {string} [top] - Top position value with unit
 * @property {string} [right] - Right position value with unit
 * @property {string} [bottom] - Bottom position value with unit
 * @property {string} [left] - Left position value with unit
 * @property {string} [padding] - Padding values with units
 */

/**
 * Default position configuration for the indicator
 * Used as the base for all domain-specific positions
 * @type {Position}
 */
export const DEFAULT_POSITION = {
  bottom: "16px",
  right: "66px",
  padding: "8px 12px",
};

/**
 * @typedef {Object} DomainConfig
 * @property {string} domain - Regular expression pattern matching the domain
 * @property {Position} position - Position configuration for the indicator
 * @property {SelectorsConfig} selectors - Configuration for element selection
 */

/**
 * @const {DomainConfig[]}
 * Comprehensive domain configurations including pattern, position, and selectors
 * Each domain includes domain-specific settings for the RTL Fixer extension
 */
export const SUPPORTED_DOMAINS = [
  {
    domain: "^(?:[^.]+\\.)?claude\\.ai$",
    position: {
      top: "9px",
      right: "146px",
      padding: DEFAULT_POSITION.padding,
    },
    selectors: {
      attributes: [
        { selector: "contenteditable", classes: ["rtl-auto"] },
        { selector: "data-is-streaming", classes: ["rtl-auto"] },
      ],
      tags: [{ selector: "textarea", classes: ["rtl-auto"] }],
      classes: [
        { selector: "font-claude-message", classes: ["rtl-auto"] },
        { selector: "grid", classes: ["rtl-auto"] },
        { selector: "flex", classes: ["rtl-auto"] },
        { selector: "textarea", classes: ["rtl-auto"] },
      ],
    },
  },
  {
    domain: "^notebooklm\\.google\\.com$",
    position: {
      top: "12px",
      right: "420px",
      padding: DEFAULT_POSITION.padding,
    },
    selectors: {
      attributes: [],
      tags: [
        { selector: "textarea", classes: ["rtl-auto"] },
        { selector: "chat-message", classes: ["rtl-auto"] },
        { selector: "mat-card", classes: ["rtl-auto"] },
        { selector: "mat-card-content", classes: ["rtl-auto"] },
        { selector: "source-viewer-v2", classes: ["rtl-auto"] },
        {
          selector: "labs-tailwind-structural-element-view-v2",
          classes: ["rtl-auto"],
        },
        { selector: "query-box", classes: ["rtl-auto"] },
        { selector: "note-editor", classes: ["rtl-auto"] },
        { selector: "rich-text-editor", classes: ["rtl-auto"] },
        { selector: "omnibar", classes: ["rtl-auto"] },
        { selector: "note-panel", classes: ["rtl-auto"] },
      ],
      classes: [
        { selector: "individual-message", classes: ["rtl-auto"] },
        { selector: "source-panel-view-content", classes: ["rtl-auto"] },
        { selector: "source-title", classes: ["rtl-auto"] },
        { selector: "ql-toolbar", classes: ["rtl-auto"] },
        { selector: "ql-snow", classes: ["rtl-auto"] },
        { selector: "note-header__editable-title", classes: ["rtl-auto"] },
        { selector: "note-panel-content", classes: ["rtl-auto"] },
        { selector: "note-button-container", classes: ["rtl-auto"] },
        { selector: "note-button", classes: ["rtl-auto"] },
        { selector: "note-button-content", classes: ["rtl-auto"] },
        { selector: "mdc-button__ripple", classes: ["rtl-auto"] },
        { selector: "mdc-button__label", classes: ["rtl-auto"] },
        { selector: "note-title", classes: ["rtl-auto"] },
        { selector: "note-details", classes: ["rtl-auto"] },
        { selector: "mat-focus-indicator", classes: ["rtl-auto"] },
        { selector: "mat-mdc-button-touch-target", classes: ["rtl-auto"] },
        { selector: "mat-ripple", classes: ["rtl-auto"] },
      ],
    },
  },
  {
    domain: "^gemini\\.google\\.com$",
    position: {
      top: "16px",
      right: "122px",
      padding: DEFAULT_POSITION.padding,
    },
    selectors: {
      attributes: [{ selector: "contenteditable", classes: ["rtl-auto"] }],
      tags: [
        { selector: "rich-textarea", classes: ["rtl-auto"] },
        { selector: "mat-form-field", classes: ["rtl-auto"] },
        { selector: "user-query-content", classes: ["rtl-auto"] },
        { selector: "model-response", classes: ["rtl-auto"] },
        { selector: "message-content", classes: ["rtl-auto"] },
        { selector: "response-element", classes: ["rtl-auto"] },
      ],
      classes: [
        { selector: "individual-message", classes: ["rtl-auto"] },
        { selector: "new-input-ui", classes: ["rtl-inherit"] },
        { selector: "ql-editor", classes: ["rtl-auto"] },
        { selector: "ql-container", classes: ["rtl-auto"] },
      ],
    },
  },
  {
    domain: "^(?:[^.]+\\.)?perplexity\\.ai$",
    position: {
      top: "18px",
      right: "36px",
      padding: DEFAULT_POSITION.padding,
    },
    selectors: {
      attributes: [],
      tags: [
        { selector: "textarea", classes: ["rtl-auto"] },
        { selector: "span.w-full", classes: ["ltr-force"] },
      ],
      classes: [
        { selector: "grid", classes: ["rtl-auto"] },
        { selector: "flex", classes: ["rtl-auto"] },
        { selector: "relative", classes: ["rtl-auto"] },
        { selector: "textarea", classes: ["rtl-auto"] },
      ],
    },
  },
  {
    domain: "^(?:[^.]+\\.)?chatgpt\\.com$",
    position: {
      top: "8px",
      right: "195px",
      padding: DEFAULT_POSITION.padding,
    },
    selectors: {
      attributes: [
        { selector: "contenteditable", classes: ["rtl-auto"] },
        { selector: "data-start", classes: ["rtl-auto"] },
      ],
      tags: [
        { selector: "textarea", classes: ["rtl-auto"] },
        { selector: "article", classes: ["rtl-auto"] },
      ],
      classes: [
        { selector: "grid", classes: ["rtl-auto"] },
        { selector: "flex", classes: ["rtl-auto"] },
        { selector: "result-streaming", classes: ["rtl-auto"] },
      ],
    },
  },
  {
    domain: "default",
    position: { ...DEFAULT_POSITION },
    selectors: { ...DEFAULT_SELECTORS },
  },
];

/**
 * Gets the domain configuration for the current domain
 * @returns {DomainConfig} Configuration for the current domain or default
 */
export function getCurrentDomainConfig() {
  const currentDomain = window.location.hostname;
  return (
    SUPPORTED_DOMAINS.find(
      (config) =>
        config.domain !== "default" &&
        new RegExp(config.domain).test(currentDomain)
    ) || SUPPORTED_DOMAINS.find((config) => config.domain === "default")
  );
}

/**
 * Checks if a domain is supported by the extension
 * @param {string} hostname - The hostname to check
 * @returns {boolean} Whether the domain is supported
 */
export function isDomainSupported(hostname) {
  return SUPPORTED_DOMAINS.some(
    (config) =>
      config.domain !== "default" && new RegExp(config.domain).test(hostname)
  );
}

// Re-export selectors.js functions for convenience
export { createElementSelector, getClassesForElement };
