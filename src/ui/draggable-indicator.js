/**
 * @fileoverview Draggable functionality for RTL Fixer indicator
 * Adds drag-to-reposition capability with position persistence
 */

import {
  saveCustomPosition,
  getCustomPosition,
  clearCustomPosition,
} from "../extension/storage.js";
import { BRAND } from "../config/constants.js";
import { debounce } from "../utils/utils.js";

/**
 * State for tracking dragging
 * @type {Object}
 * @private
 */
const dragState = {
  isDragging: false,
  initialX: 0,
  initialY: 0,
  initialLeft: 0,
  initialTop: 0,
};

/**
 * Makes the indicator element draggable
 * @param {HTMLElement} indicator - The indicator element to make draggable
 */
export function makeDraggable(indicator) {
  if (!indicator) return;

  // Skip if already draggable
  if (indicator.getAttribute("data-draggable") === "true") return;

  // Add cursor style to indicate it's draggable
  indicator.style.cursor = "move";

  // Add a small drag handle to make it clear it's draggable
  const handleEl = document.createElement("div");
  handleEl.className = "drag-handle";
  handleEl.setAttribute("title", "Drag to reposition");

  indicator.appendChild(handleEl);

  // Mouse down event - start dragging
  indicator.addEventListener("mousedown", handleMouseDown);

  // Add data attribute to mark as draggable
  indicator.setAttribute("data-draggable", "true");

  // Add draggable styles
  addDraggableStyles();
}

/**
 * Adds CSS styles for draggable functionality
 * @private
 */
function addDraggableStyles() {
  // Check if styles are already added
  if (document.getElementById(`${BRAND}-draggable-styles`)) return;

  const styleEl = document.createElement("style");
  styleEl.id = `${BRAND}-draggable-styles`;
  styleEl.textContent = `
    /* Style when dragging */
    #${BRAND}-indicator.dragging {
      opacity: 0.8;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      transition: none !important; /* Disable transitions during drag */
    }

    /* Add dragging cursor */
    #${BRAND}-indicator[data-draggable="true"] {
      cursor: move;
      cursor: grab;
    }

    #${BRAND}-indicator.dragging {
      cursor: grabbing;
    }

    /* Style for drag handle */
    .drag-handle {
      position: absolute;
      top: 0;
      right: 0;
      width: 16px;
      height: 16px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 0 6px 0 6px;
      cursor: move;
    }

    @media (prefers-color-scheme: dark) {
      .drag-handle {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  `;

  document.head.appendChild(styleEl);
}

/**
 * Handles the start of dragging
 * @param {MouseEvent} e - The mousedown event
 * @private
 */
function handleMouseDown(e) {
  const indicator = e.currentTarget;

  // Prevent default to avoid text selection
  e.preventDefault();

  // Save initial state
  const rect = indicator.getBoundingClientRect();
  dragState.isDragging = true;
  dragState.initialX = e.clientX;
  dragState.initialY = e.clientY;

  // Get computed styles to determine position
  const computedStyle = window.getComputedStyle(indicator);

  // Extract positioning information
  dragState.initialTop = parseInt(computedStyle.top) || 0;
  dragState.initialLeft = parseInt(computedStyle.left) || 0;

  // If positioned with right/bottom, convert to left/top
  if (computedStyle.right !== "auto" && computedStyle.left === "auto") {
    dragState.initialLeft =
      window.innerWidth - rect.width - (parseInt(computedStyle.right) || 0);
    indicator.style.right = "auto";
  }

  if (computedStyle.bottom !== "auto" && computedStyle.top === "auto") {
    dragState.initialTop =
      window.innerHeight - rect.height - (parseInt(computedStyle.bottom) || 0);
    indicator.style.bottom = "auto";
  }

  // Set absolute positioning
  indicator.style.position = "fixed";
  indicator.style.left = dragState.initialLeft + "px";
  indicator.style.top = dragState.initialTop + "px";

  // Add global event listeners
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  // Add dragging class
  indicator.classList.add("dragging");
}

/**
 * Handles mouse movement during dragging
 * @param {MouseEvent} e - The mousemove event
 * @private
 */
function handleMouseMove(e) {
  if (!dragState.isDragging) return;

  // Calculate the new position
  const deltaX = e.clientX - dragState.initialX;
  const deltaY = e.clientY - dragState.initialY;

  const newLeft = dragState.initialLeft + deltaX;
  const newTop = dragState.initialTop + deltaY;

  // Get the indicator element
  const indicator = document.getElementById(`${BRAND}-indicator`);
  if (!indicator) return;

  // Apply new position with boundary checking
  const rect = indicator.getBoundingClientRect();

  // Ensure indicator stays within viewport bounds
  const maxLeft = window.innerWidth - rect.width;
  const maxTop = window.innerHeight - rect.height;

  indicator.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + "px";
  indicator.style.top = Math.max(0, Math.min(newTop, maxTop)) + "px";
}

/**
 * Handles the end of dragging
 * @param {MouseEvent} e - The mouseup event
 * @private
 */
const handleMouseUp = debounce(async (e) => {
  if (!dragState.isDragging) return;

  // Get the indicator element
  const indicator = document.getElementById(`${BRAND}-indicator`);
  if (!indicator) return;

  // Reset dragging state
  dragState.isDragging = false;

  // Remove global event listeners
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);

  // Remove dragging class
  indicator.classList.remove("dragging");

  // Get the final position
  const computedStyle = window.getComputedStyle(indicator);
  const position = {
    top: computedStyle.top,
    left: computedStyle.left,
    right: "auto",
    bottom: "auto",
  };

  // Save the position
  const domain = window.location.hostname;
  await saveCustomPosition(domain, position);

  console.log(`${BRAND} indicator position saved for ${domain}`);
}, 100);

/**
 * Applies custom position to the indicator if available
 * @param {HTMLElement} indicator - The indicator element
 */
export async function applyCustomPosition(indicator) {
  if (!indicator) return;

  try {
    const domain = window.location.hostname;
    const customPosition = await getCustomPosition(domain);

    if (customPosition) {
      // Apply custom position
      Object.entries(customPosition).forEach(([prop, value]) => {
        indicator.style[prop] = value;
      });

      console.log(`${BRAND} indicator custom position applied for ${domain}`);
    }
  } catch (error) {
    console.error("Error applying custom position:", error);
  }
}

/**
 * Resets the indicator to its default position
 * @param {HTMLElement} indicator - The indicator element (optional, will find by ID if not provided)
 * @returns {Promise<boolean>} Whether reset was successful
 */
export async function resetIndicatorPosition(indicator = null) {
  try {
    const domain = window.location.hostname;

    // Clear saved position
    await clearCustomPosition(domain);

    // Find indicator if not provided
    indicator = indicator || document.getElementById(`${BRAND}-indicator`);
    if (!indicator) return false;

    // Remove inline positioning
    indicator.style.top = "";
    indicator.style.left = "";
    indicator.style.right = "";
    indicator.style.bottom = "";

    return true;
  } catch (error) {
    console.error("Error resetting indicator position:", error);
    return false;
  }
}
