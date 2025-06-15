import { NODIT_COLORS, UI_CONFIG } from "../constants/content";

/**
 * Floating button styles
 */
const floatingButtonStyles = {
  position: "fixed" as const,
  display: "none",
  padding: "12px 24px",
  backgroundColor: NODIT_COLORS.primary,
  color: "#FFFFFF",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  zIndex: UI_CONFIG.floatingButton.zIndex.toString(),
  fontSize: "14px",
  fontWeight: "600",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  boxShadow: `0 4px 12px rgba(16, 185, 129, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)`,
  transition: "all 0.2s ease",
  transform: "translate(-50%, 0)", // Center horizontally
  whiteSpace: "nowrap" as const,
  userSelect: "none" as const,
  pointerEvents: "auto" as const,
};

/**
 * Create floating button element
 */
export const createFloatingButton = (): HTMLButtonElement => {
  const button = document.createElement("button");

  // Apply styles
  Object.assign(button.style, floatingButtonStyles);
  button.textContent = "Account Analyze";

  // Add hover effects
  const addHoverEffects = () => {
    button.addEventListener("mouseover", () => {
      button.style.backgroundColor = NODIT_COLORS.secondary;
      button.style.boxShadow = "0 4px 6px rgba(16, 185, 129, 0.3)";
    });

    button.addEventListener("mouseout", () => {
      button.style.backgroundColor = NODIT_COLORS.primary;
      button.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.2)";
    });
  };

  addHoverEffects();

  return button;
};

/**
 * Position floating button near selection
 */
export const positionFloatingButton = (button: HTMLButtonElement, selectionRect: DOMRect): void => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;

  const buttonWidth = UI_CONFIG.floatingButton.width;
  const buttonHeight = UI_CONFIG.floatingButton.height;

  // Default position: center bottom of selection
  let left = selectionRect.left + selectionRect.width / 2 - buttonWidth / 2 + scrollX;
  let top = selectionRect.bottom + 10 + scrollY;

  // Horizontal boundary check
  if (left < 10) {
    left = 10;
  } else if (left + buttonWidth > viewportWidth - 10) {
    left = viewportWidth - buttonWidth - 10;
  }

  // Vertical boundary check - move above selection if needed
  if (top + buttonHeight > scrollY + viewportHeight - 10) {
    top = selectionRect.top - buttonHeight - 10 + scrollY;
    console.log("📍 Button moved above selection due to viewport constraints");
  }

  // Apply position
  button.style.left = `${left}px`;
  button.style.top = `${top}px`;
  button.style.display = "block";
  button.style.position = "absolute";

  // Enhanced visibility
  button.style.boxShadow = "0 4px 20px rgba(16, 185, 129, 0.4), 0 0 0 2px rgba(16, 185, 129, 0.2)";

  console.log("🔘 Floating button positioned at:", {
    left: `${left}px`,
    top: `${top}px`,
    selectionRect,
    finalPosition: {
      left: button.style.left,
      top: button.style.top,
      display: button.style.display,
      zIndex: button.style.zIndex,
    },
  });
};

/**
 * Hide floating button
 */
export const hideFloatingButton = (button: HTMLButtonElement): void => {
  button.style.display = "none";
};

/**
 * Show floating button at center (for debugging)
 */
export const showFloatingButtonAtCenter = (button: HTMLButtonElement): void => {
  button.style.left = "50%";
  button.style.top = "50%";
  button.style.transform = "translate(-50%, -50%)";
  button.style.display = "block";
  button.style.position = "fixed";
  button.style.backgroundColor = "#EF4444"; // Red for visibility
};
