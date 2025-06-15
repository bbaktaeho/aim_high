import { NODIT_COLORS, UI_CONFIG } from "../constants/content";

/**
 * Popup box styles
 */
const popupBoxStyles = {
  position: "fixed" as const,
  display: "none",
  padding: "0",
  backgroundColor: "#FFFFFF",
  border: `2px solid ${NODIT_COLORS.primary}`,
  borderRadius: "12px",
  boxShadow: `0 10px 25px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(16, 185, 129, 0.1)`,
  zIndex: UI_CONFIG.popup.zIndex.toString(),
  maxWidth: `${UI_CONFIG.popup.maxWidth}px`,
  minWidth: `${UI_CONFIG.popup.minWidth}px`,
  maxHeight: `${UI_CONFIG.popup.maxHeight}px`,
  fontSize: "14px",
  lineHeight: "1.5",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  color: "#1A1A1A",
  boxSizing: "border-box" as const,
  overflowY: "auto" as const,
  backdropFilter: "blur(10px)",
  isolation: "isolate" as const,
  contain: "layout style paint" as const,
  pointerEvents: "auto" as const,
  margin: "0",
  transform: "none",
  filter: "none",
  opacity: "1",
  visibility: "visible" as const,
};

/**
 * Popup content styles
 */
const popupContentStyles = {
  padding: "20px",
  margin: "0",
};

/**
 * Create popup box element
 */
export const createAnalysisPopup = (): { container: HTMLDivElement; contentDiv: HTMLDivElement } => {
  const container = document.createElement("div");

  // Apply base styles
  Object.assign(container.style, popupBoxStyles);

  // Apply forced styles to override site CSS
  container.style.cssText = `
    position: fixed !important;
    display: none !important;
    padding: 0 !important;
    margin: 0 !important;
    background-color: #FFFFFF !important;
    border: 2px solid ${NODIT_COLORS.primary} !important;
    border-radius: 12px !important;
    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(16, 185, 129, 0.1) !important;
    z-index: ${UI_CONFIG.popup.zIndex} !important;
    max-width: ${UI_CONFIG.popup.maxWidth}px !important;
    min-width: ${UI_CONFIG.popup.minWidth}px !important;
    max-height: ${UI_CONFIG.popup.maxHeight}px !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    color: #1A1A1A !important;
    box-sizing: border-box !important;
    overflow-y: auto !important;
    backdrop-filter: blur(10px) !important;
    isolation: isolate !important;
    contain: layout style paint !important;
    pointer-events: auto !important;
    transform: none !important;
    filter: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    width: auto !important;
    height: auto !important;
  `;

  // Set unique ID for debugging
  container.id = "nodit-analysis-popup";
  container.setAttribute("data-nodit-popup", "true");

  // Create content div
  const contentDiv = document.createElement("div");
  Object.assign(contentDiv.style, popupContentStyles);

  // Apply forced styles to content div
  contentDiv.style.cssText = `
    padding: 20px !important;
    margin: 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    position: relative !important;
    z-index: auto !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  `;

  container.appendChild(contentDiv);

  // Prevent event propagation to avoid triggering floating button
  const preventPropagation = (event: Event) => {
    event.stopPropagation();
  };

  container.addEventListener("mouseup", preventPropagation);
  container.addEventListener("mousedown", preventPropagation);
  container.addEventListener("click", preventPropagation);

  return { container, contentDiv };
};

/**
 * Position popup near selection
 */
export const positionAnalysisPopup = (popup: HTMLDivElement, selectionRect: DOMRect): void => {
  // Calculate popup position to avoid going off-screen
  let left = selectionRect.left + window.scrollX;
  let top = selectionRect.bottom + 12 + window.scrollY;

  // Adjust horizontal position if popup would go off-screen
  const popupWidth = UI_CONFIG.popup.maxWidth;
  if (left + popupWidth > window.innerWidth) {
    left = window.innerWidth - popupWidth - 20;
  }
  if (left < 20) {
    left = 20;
  }

  // Adjust vertical position if popup would go off-screen
  const popupHeight = UI_CONFIG.popup.maxHeight;
  if (top + popupHeight > window.innerHeight + window.scrollY) {
    top = selectionRect.top + window.scrollY - popupHeight - 12;
  }

  // Apply position with forced styles
  popup.style.setProperty("left", `${left}px`, "important");
  popup.style.setProperty("top", `${top}px`, "important");
  popup.style.setProperty("display", "block", "important");
  popup.style.setProperty("visibility", "visible", "important");
  popup.style.setProperty("opacity", "1", "important");
  popup.style.setProperty("z-index", UI_CONFIG.popup.zIndex.toString(), "important");

  console.log("📦 Popup positioned at:", { left: `${left}px`, top: `${top}px` });
};

/**
 * Show popup at center (for debugging)
 */
export const showAnalysisPopupAtCenter = (popup: HTMLDivElement): void => {
  popup.style.setProperty("left", "50%", "important");
  popup.style.setProperty("top", "50%", "important");
  popup.style.setProperty("transform", "translate(-50%, -50%)", "important");
  popup.style.setProperty("display", "block", "important");
  popup.style.setProperty("visibility", "visible", "important");
  popup.style.setProperty("opacity", "1", "important");
  popup.style.setProperty("z-index", UI_CONFIG.popup.zIndex.toString(), "important");

  console.log("🔧 Popup repositioned to center of screen");
};

/**
 * Hide popup
 */
export const hideAnalysisPopup = (popup: HTMLDivElement): void => {
  popup.style.display = "none";
};

/**
 * Check popup visibility and auto-fix if needed
 */
export const checkAndFixPopupVisibility = (popup: HTMLDivElement): boolean => {
  setTimeout(() => {
    const popupRect = popup.getBoundingClientRect();
    const isPopupVisible =
      popupRect.width > 0 &&
      popupRect.height > 0 &&
      popupRect.top >= 0 &&
      popupRect.left >= 0 &&
      popupRect.bottom <= window.innerHeight &&
      popupRect.right <= window.innerWidth;

    console.log("👁️ Popup visibility check:", {
      popupRect,
      isPopupVisible,
      computedStyle: {
        display: window.getComputedStyle(popup).display,
        visibility: window.getComputedStyle(popup).visibility,
        opacity: window.getComputedStyle(popup).opacity,
        zIndex: window.getComputedStyle(popup).zIndex,
        position: window.getComputedStyle(popup).position,
      },
    });

    if (!isPopupVisible) {
      console.warn("⚠️ Popup may not be visible! Attempting to fix...");
      showAnalysisPopupAtCenter(popup);
      return false;
    }

    return true;
  }, 100);

  return true;
};
