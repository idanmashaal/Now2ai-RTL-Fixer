/**
 * @fileoverview Utility functions for retrieving configuration from the background service worker
 * Provides a centralized way for content scripts to access configurations
 */
import { debugLog } from "./utils.js";

/**
 * Gets configuration data from the background script
 * @param {string} configType - Type of configuration to retrieve
 * @returns {Promise<Object>} Configuration data
 */
export async function getConfigFromBackground(configType) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "getConfig", configType },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response || !response.success) {
          reject(new Error(response?.error || "Failed to get config"));
          return;
        }

        resolve(response.config);
      }
    );
  });
}

/**
 * Extracts required properties structure from a template object
 * @param {Object} template - Template object
 * @returns {Object} Required properties structure
 */
export function getRequiredProperties(template) {
  if (!template || typeof template !== "object") {
    return null;
  }

  const result = {};

  for (const [key, value] of Object.entries(template)) {
    if (value === null) {
      result[key] = null;
    } else if (Array.isArray(value)) {
      // For arrays, we care about structure but not content
      result[key] = value.length > 0 ? "array" : "empty-array";
    } else if (typeof value === "object") {
      // For objects, recursively get structure
      result[key] = getRequiredProperties(value);
    } else {
      // For primitives, just note the type
      result[key] = typeof value;
    }
  }

  return result;
}

/**
 * Validates an object against a properties template
 * @param {Object} obj - Object to validate
 * @param {Object} template - Properties template
 * @param {string} path - Current path for debugging
 * @returns {boolean} Whether the object is compatible
 */
export function validateObjectAgainstTemplate(obj, template, path) {
  if (!obj || typeof obj !== "object") {
    debugLog(`Invalid object at ${path}: ${obj}`);
    return false;
  }

  // Check required properties
  for (const [key, expectedType] of Object.entries(template)) {
    if (!obj.hasOwnProperty(key)) {
      debugLog(`Missing required property ${path}.${key}`);
      return false;
    }

    const value = obj[key];

    if (expectedType === "array") {
      if (!Array.isArray(value) || value.length === 0) {
        debugLog(`Invalid array at ${path}.${key}: expected non-empty array`);
        return false;
      }
    } else if (expectedType === "empty-array") {
      if (!Array.isArray(value)) {
        debugLog(`Invalid type at ${path}.${key}: expected array`);
        return false;
      }
    } else if (typeof expectedType === "object" && expectedType !== null) {
      // Nested object, validate recursively
      if (
        !validateObjectAgainstTemplate(value, expectedType, `${path}.${key}`)
      ) {
        return false;
      }
    } else if (typeof value !== expectedType) {
      debugLog(
        `Type mismatch at ${path}.${key}: expected ${expectedType}, got ${typeof value}`
      );
      return false;
    }
  }

  return true;
}

/**
 * Validates styles config specifically
 * @param {Object} config - Styles config to validate
 * @param {string} path - Current path for debugging
 * @returns {boolean} Whether the config is valid
 */
export function validateStylesConfig(config, path) {
  // Required style classes
  const requiredClasses = ["rtl-auto", "rtl-inherit", "rtl-force"];

  // Check for required classes
  for (const className of requiredClasses) {
    if (!config[className]) {
      debugLog(`Missing required style class ${path}.${className}`);
      return false;
    }

    // Each class needs a cssRules object
    if (
      !config[className].cssRules ||
      typeof config[className].cssRules !== "object"
    ) {
      debugLog(`Style class ${path}.${className} missing cssRules object`);
      return false;
    }

    // Each cssRules object needs at least one property
    const rules = config[className].cssRules;
    if (Object.keys(rules).length === 0) {
      debugLog(`Style class ${path}.${className}.cssRules is empty`);
      return false;
    }
  }

  return true;
}

/**
 * Validates defaults config specifically
 * @param {Object} config - Defaults config to validate
 * @param {string} path - Current path for debugging
 * @returns {boolean} Whether the config is valid
 */
export function validateDefaultsConfig(config, path) {
  // Check for required properties
  if (!config.position || typeof config.position !== "object") {
    debugLog(`Missing or invalid position object at ${path}.position`);
    return false;
  }

  if (!config.selectors || typeof config.selectors !== "object") {
    debugLog(`Missing or invalid selectors object at ${path}.selectors`);
    return false;
  }

  // Check selectors structure
  const selectors = config.selectors;
  const requiredSelectorTypes = ["attributes", "tags", "classes"];

  for (const type of requiredSelectorTypes) {
    if (!Array.isArray(selectors[type])) {
      debugLog(`Invalid selectors.${type} at ${path}: expected array`);
      return false;
    }
  }

  return true;
}

/**
 * Validates UI config specifically
 * @param {Object} config - UI config to validate
 * @param {string} path - Current path for debugging
 * @returns {boolean} Whether the config is valid
 */
export function validateUiConfig(config, path) {
  // Check theme
  if (!config.theme || typeof config.theme !== "object") {
    debugLog(`Missing or invalid theme object at ${path}.theme`);
    return false;
  }

  // Theme needs light and dark
  if (!config.theme.light || !config.theme.dark) {
    debugLog(`Theme at ${path}.theme missing light or dark properties`);
    return false;
  }

  // Check indicator base styles
  if (
    !config.indicatorBaseStyles ||
    typeof config.indicatorBaseStyles !== "object"
  ) {
    debugLog(
      `Missing or invalid indicatorBaseStyles at ${path}.indicatorBaseStyles`
    );
    return false;
  }

  return true;
}

/**
 * Validates deep structure compatibility between bundled and remote configs
 * @param {any} bundled - Bundled config value
 * @param {any} remote - Remote config value
 * @param {string} path - Current validation path for debugging
 * @param {string} configType - Type of configuration being validated
 * @returns {boolean} Whether the structures are compatible
 */
export function validateStructure(bundled, remote, path = "", configType = "") {
  // Different types are not compatible
  if (typeof bundled !== typeof remote) {
    debugLog(
      `Type mismatch at ${path}: bundled=${typeof bundled}, remote=${typeof remote}`
    );
    return false;
  }

  // Handle arrays
  if (Array.isArray(bundled)) {
    if (!Array.isArray(remote) || remote.length === 0) {
      debugLog(`Invalid array at ${path}: expected non-empty array`);
      return false;
    }

    // For domains (array of domain objects), we're flexible
    if (configType === "domains") {
      // Just ensure all domain objects have required structure
      // Sample the first bundled item to get the expected shape
      const sampleItem = bundled[0];

      // Create a validation template from the sample
      const requiredProps = getRequiredProperties(sampleItem);

      // Check that at least one item in the remote array follows the template
      return remote.some((item) =>
        validateObjectAgainstTemplate(item, requiredProps, `${path}[item]`)
      );
    }

    // For other arrays, validate each item
    return true;
  }

  // Handle objects
  if (typeof bundled === "object" && bundled !== null) {
    if (typeof remote !== "object" || remote === null) {
      debugLog(`Invalid object at ${path}: expected object`);
      return false;
    }

    // Handle specific types differently
    switch (configType) {
      case "styles":
        return validateStylesConfig(remote, path);

      case "defaults":
        return validateDefaultsConfig(remote, path);

      case "ui":
        return validateUiConfig(remote, path);

      default:
        // For nested objects, get required properties
        const requiredProps = getRequiredProperties(bundled);
        return validateObjectAgainstTemplate(remote, requiredProps, path);
    }
  }

  // For primitives, type check is sufficient (done above)
  return true;
}
