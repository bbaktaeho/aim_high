// On-chain Notification Content Script

const CHARACTER_ID = "nodit-onchain-character";
const BALLOON_ID = "nodit-onchain-balloon";
let intervalId: number | null = null;

function createCharacterUI(): void {
  if (document.getElementById(CHARACTER_ID)) return; // Prevent duplicate

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.id = CHARACTER_ID;
  wrapper.style.position = "fixed";
  wrapper.style.right = "32px";
  wrapper.style.bottom = "32px";
  wrapper.style.zIndex = "999999";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.pointerEvents = "none";

  // Balloon
  const balloon = document.createElement("div");
  balloon.id = BALLOON_ID;
  balloon.style.background = "white";
  balloon.style.color = "#222";
  balloon.style.fontSize = "15px";
  balloon.style.fontWeight = "bold";
  balloon.style.borderRadius = "16px";
  balloon.style.padding = "12px 18px";
  balloon.style.marginBottom = "8px";
  balloon.style.boxShadow = "0 2px 12px rgba(0,0,0,0.12)";
  balloon.style.position = "relative";
  balloon.style.pointerEvents = "auto";
  balloon.style.userSelect = "none";
  balloon.style.transition = "opacity 0.2s";

  // Balloon text content
  const textContent = document.createElement("div");
  textContent.className = "nodit-balloon-text";
  textContent.style.whiteSpace = "pre-line";
  balloon.appendChild(textContent);

  // Balloon arrow
  const arrow = document.createElement("div");
  arrow.style.position = "absolute";
  arrow.style.left = "50%";
  arrow.style.bottom = "-12px";
  arrow.style.transform = "translateX(-50%)";
  arrow.style.width = "0";
  arrow.style.height = "0";
  arrow.style.borderLeft = "12px solid transparent";
  arrow.style.borderRight = "12px solid transparent";
  arrow.style.borderTop = "12px solid white";
  balloon.appendChild(arrow);

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

  wrapper.appendChild(balloon);
  wrapper.appendChild(img);
  document.body.appendChild(wrapper);

  // Start interval
  updateBalloon();
  intervalId = window.setInterval(updateBalloon, 2000);
}

let currentMessage: string = "";

function updateBalloon(customMessage?: string): void {
  const balloon = document.getElementById(BALLOON_ID);
  if (!balloon) return;

  const textElement = balloon.querySelector(".nodit-balloon-text") as HTMLDivElement;
  if (!textElement) return;

  if (customMessage) {
    // Use custom message from webhook
    textElement.textContent = customMessage;
    currentMessage = customMessage;
  } else if (currentMessage) {
    // Keep showing the current message
    textElement.textContent = currentMessage;
  } else {
    // Default message
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    textElement.textContent = `트랜잭션을 모니터링 중...\n${timeStr}`;
  }
}

function removeCharacterUI(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  const el = document.getElementById(CHARACTER_ID);
  if (el) el.remove();
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

// Note: Webhook functionality has been removed as requested
// The character will only show monitoring status messages
