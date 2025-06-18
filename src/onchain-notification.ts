// On-chain Notification Content Script

const CHARACTER_ID = "nodit-onchain-character";
const BALLOON_ID = "nodit-onchain-balloon";

function createCharacterUI(): void {
  if (document.getElementById(CHARACTER_ID)) return; // Prevent duplicate

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.id = CHARACTER_ID;
  wrapper.style.position = "fixed";
  wrapper.style.right = "32px";
  wrapper.style.bottom = "32px";
  wrapper.style.zIndex = "999999";
  wrapper.style.pointerEvents = "none";

  // Character image
  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("images/character.gif");
  img.alt = "character";
  img.style.width = "80px";
  img.style.height = "80px";
  img.style.display = "block";
  img.style.borderRadius = "50%";
  img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.10)";
  img.style.background = "#e0ffe0";

  wrapper.appendChild(img);
  document.body.appendChild(wrapper);
}

function showBalloon(message: string): void {
  // Remove existing balloon
  const existingBalloon = document.getElementById(BALLOON_ID);
  if (existingBalloon) {
    existingBalloon.remove();
  }

  // Create balloon
  const balloon = document.createElement("div");
  balloon.id = BALLOON_ID;
  balloon.style.position = "fixed";
  balloon.style.right = "120px"; // Position to the left of character
  balloon.style.bottom = "80px";
  balloon.style.zIndex = "999998";
  balloon.style.backgroundColor = "#ffffff";
  balloon.style.color = "#333";
  balloon.style.padding = "8px 12px";
  balloon.style.borderRadius = "12px";
  balloon.style.fontSize = "14px";
  balloon.style.fontWeight = "bold";
  balloon.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  balloon.style.border = "1px solid #e0e0e0";
  balloon.style.whiteSpace = "nowrap";
  balloon.style.pointerEvents = "none";

  // Add arrow pointing to character
  balloon.style.position = "relative";
  balloon.innerHTML = `
    ${message}
    <div style="
      position: absolute;
      right: -8px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid #ffffff;
      border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
    "></div>
  `;

  document.body.appendChild(balloon);

  // Auto-hide balloon after 3 seconds
  setTimeout(() => {
    if (balloon && balloon.parentNode) {
      balloon.remove();
    }
  }, 3000);
}

// Character display function - no balloon needed
// TODO: Add balloon functionality later if needed

function removeCharacterUI(): void {
  const el = document.getElementById(CHARACTER_ID);
  if (el) el.remove();

  // Also remove balloon
  const balloon = document.getElementById(BALLOON_ID);
  if (balloon) balloon.remove();
}

// 최초 상태 확인 및 storage 변경 감지
chrome.storage.local.get(["isOnchainNotificationEnabled"], (result: { [key: string]: any }) => {
  if (result.isOnchainNotificationEnabled) {
    createCharacterUI();
  }
});

chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
  if (area !== "local") return;
  if ("isOnchainNotificationEnabled" in changes) {
    if (changes.isOnchainNotificationEnabled.newValue) {
      createCharacterUI();
    } else {
      removeCharacterUI();
    }
  }
});

// Listen for stream events
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.type === "STREAM_EVENT") {
    console.log("🔔 Stream event received in content script:", message.message);

    // Show balloon with the message
    showBalloon(message.message);
  }
});
