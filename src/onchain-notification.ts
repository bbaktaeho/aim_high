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
  console.log("🎈 [showBalloon] Starting balloon creation with message:", message);

  // Remove existing balloon
  const existingBalloon = document.getElementById(BALLOON_ID);
  if (existingBalloon) {
    console.log("🗑️ [showBalloon] Removing existing balloon");
    existingBalloon.remove();
  }

  // Create balloon
  console.log("🎈 [showBalloon] Creating new balloon element");
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

  console.log("📍 [showBalloon] Appending balloon to document body");
  document.body.appendChild(balloon);
  console.log("✅ [showBalloon] Balloon successfully added to DOM");

  // Auto-hide balloon after 10 seconds
  setTimeout(() => {
    if (balloon && balloon.parentNode) {
      console.log("⏰ [showBalloon] Auto-removing balloon after 10 seconds");
      balloon.remove();
      console.log("🗑️ [showBalloon] Balloon removed from DOM");
    }
  }, 10000);
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
  console.log("🔔 [onchain-notification] Message received:", message);

  if (message.type === "STREAM_EVENT") {
    console.log("🔔 ===== STREAM EVENT IN ONCHAIN NOTIFICATION =====");
    console.log("🔔 Message content:", message.message);
    console.log("🔔 Event data:", message.data);
    console.log("🔔 Timestamp:", message.timestamp);
    console.log("🔔 ================================================");

    // Check if character exists before showing balloon
    const character = document.getElementById(CHARACTER_ID);
    if (!character) {
      console.log("⚠️ Character not found, creating character UI first");
      createCharacterUI();
    }

    // Show balloon with the message
    console.log("🎈 Showing balloon with message:", message.message);
    showBalloon(message.message);

    console.log("✅ Balloon display completed");
  }

  if (message.type === "TOGGLE_ONCHAIN_NOTIFICATION") {
    console.log("🔔 [onchain-notification] TOGGLE_ONCHAIN_NOTIFICATION received:", message.isEnabled);

    if (message.isEnabled) {
      // 활성화 시 캐릭터 생성 + 테스트 말풍선 표시
      createCharacterUI();
      console.log("🧪 [onchain-notification] Showing test balloon for activation");
      showBalloon("감지");
    } else {
      // 비활성화 시 캐릭터 제거
      removeCharacterUI();
    }
  }

  return true; // Keep message channel open
});
