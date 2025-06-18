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

function showBalloon(message: string, streamData?: any): void {
  console.log("🎈 [showBalloon] Starting balloon creation with message:", message);
  console.log("🎈 [showBalloon] Stream data:", streamData);

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
  balloon.style.right = "32px"; // 캐릭터와 동일한 우측 위치
  balloon.style.bottom = "112px"; // 캐릭터 바로 위 (32px + 80px)
  balloon.style.zIndex = "999998";
  balloon.style.backgroundColor = "#ffffff";
  balloon.style.color = "#333";
  balloon.style.padding = "10px 14px";
  balloon.style.borderRadius = "16px";
  balloon.style.fontSize = "12px";
  balloon.style.fontWeight = "500";
  balloon.style.boxShadow = "0 4px 20px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)";
  balloon.style.border = "1px solid rgba(0,0,0,0.06)";
  balloon.style.pointerEvents = "none";
  balloon.style.maxWidth = "240px"; // 최대 너비 제한
  balloon.style.minWidth = "80px"; // 최소 너비
  balloon.style.textAlign = "left";
  balloon.style.lineHeight = "1.5";
  balloon.style.fontFamily = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  balloon.style.backdropFilter = "blur(10px)";
  (balloon.style as any).WebkitBackdropFilter = "blur(10px)";

  // 우측 고정, 좌측 확장을 위한 설정
  balloon.style.transformOrigin = "bottom right";
  balloon.style.wordBreak = "break-word";
  balloon.style.whiteSpace = "normal";
  balloon.style.overflow = "hidden";

  let balloonContent = message;

  // 스트림 데이터가 있으면 파싱해서 구체적인 내용 생성
  if (streamData) {
    try {
      console.log("🔍 [showBalloon] Parsing stream data...");

      // 문자열에서 event JSON 추출
      let eventData;
      if (typeof streamData === "string") {
        // "event: {...}" 형태에서 JSON 부분 추출
        const eventIndex = streamData.indexOf("event:");
        if (eventIndex !== -1) {
          const jsonStart = streamData.indexOf("{", eventIndex);
          if (jsonStart !== -1) {
            // 마지막 } 찾기
            let braceCount = 0;
            let jsonEnd = jsonStart;
            for (let i = jsonStart; i < streamData.length; i++) {
              if (streamData[i] === "{") braceCount++;
              if (streamData[i] === "}") braceCount--;
              if (braceCount === 0) {
                jsonEnd = i + 1;
                break;
              }
            }
            const jsonStr = streamData.substring(jsonStart, jsonEnd);
            eventData = JSON.parse(jsonStr);
          }
        }
      } else if (streamData.event) {
        eventData = streamData.event;
      }

      if (eventData && eventData.targetAddresses && eventData.messages && eventData.messages.length > 0) {
        const targetAddress = eventData.targetAddresses[0];
        const transaction = eventData.messages[0];

        console.log("📊 [showBalloon] Transaction details:", {
          targetAddress,
          from: transaction.from_address,
          to: transaction.to_address,
          value: transaction.value,
        });

        // Wei를 ETH로 변환 (16진수 → 10진수 → ETH)
        const valueWei = parseInt(transaction.value, 16);
        const valueEth = parseFloat((valueWei / Math.pow(10, 18)).toFixed(6)).toString();

        // 현재 네트워크 정보 가져오기
        chrome.storage.local.get(["walletChainId"], (result) => {
          const getNetworkName = (chainId: number) => {
            switch (chainId) {
              case 1:
                return "Ethereum Mainnet";
              case 5:
                return "Ethereum Goerli";
              case 11155111:
                return "Ethereum Sepolia";
              case 137:
                return "Polygon Mainnet";
              case 80001:
                return "Polygon Mumbai";
              case 42161:
                return "Arbitrum Mainnet";
              case 421613:
                return "Arbitrum Goerli";
              default:
                return `Chain ${chainId}`;
            }
          };

          // 트랜잭션 해시 링크 생성
          const getTxExplorerUrl = (chainId: number, txHash: string): string | null => {
            const explorerMap: Record<number, string> = {
              1: "https://etherscan.io/tx/", // Ethereum Mainnet
              137: "https://polygonscan.com/tx/", // Polygon
              10: "https://optimistic.etherscan.io/tx/", // Optimism
              8453: "https://basescan.org/tx/", // Base
              42161: "https://arbiscan.io/tx/", // Arbitrum One
              8217: "https://kaiascan.io/tx/", // Kaia (Klaytn)
              11155111: "https://sepolia.etherscan.io/tx/", // Sepolia Testnet
              80002: "https://amoy.polygonscan.com/tx/", // Polygon Amoy Testnet
              421614: "https://sepolia.arbiscan.io/tx/", // Arbitrum Sepolia
              84532: "https://sepolia.basescan.org/tx/", // Base Sepolia
              11155420: "https://sepolia-optimism.etherscan.io/tx/", // OP Sepolia
              1001: "https://baobab.klaytnscope.com/tx/", // Kaia Testnet (Baobab)
            };

            const explorerBase = explorerMap[chainId];
            return explorerBase ? explorerBase + txHash : null;
          };

          const networkName = getNetworkName(result.walletChainId || 1);

          // 트랜잭션 방향 결정
          const isOutgoing = targetAddress.toLowerCase() === transaction.from_address.toLowerCase();
          const direction = isOutgoing ? "트랜잭션이 처리되었어요" : "트랜잭션을 받았어요";

          // 주소 단축
          const formatAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

          // 트랜잭션 해시 확인 및 링크 생성
          const txHash = transaction.transaction_hash || transaction.hash || transaction.txHash;
          const txExplorerUrl = txHash ? getTxExplorerUrl(result.walletChainId || 1, txHash) : null;

          balloonContent = `
            <div style="font-weight: bold; color: ${isOutgoing ? "#00d16c" : "#00d16c"}; margin-bottom: 8px;">
              ${direction}
            </div>
            <div style="margin-bottom: 6px;">
              <span style="color: #666;">From:</span> ${formatAddress(transaction.from_address)}
            </div>
            <div style="margin-bottom: 6px;">
              <span style="color: #666;">To:</span> ${formatAddress(transaction.to_address)}
            </div>
            <div style="margin-bottom: 6px;">
              <span style="color: #666;">Amount:</span> <strong>${valueEth} ETH</strong>
            </div>
            ${
              txExplorerUrl
                ? `
            <div style="margin-bottom: 6px;">
              <a href="${txExplorerUrl}" target="_blank" rel="noopener noreferrer" style="color: #00d16c; text-decoration: none; font-size: 11px;">
                🔍 블록 익스플로러에서 보기
              </a>
            </div>
            `
                : ""
            }
            <div style="font-size: 11px; color: #999; margin-top: 8px;">
              ${networkName}
            </div>
          `;

          // 풍선 내용 업데이트
          const existingBalloon = document.getElementById(BALLOON_ID);
          if (existingBalloon) {
            existingBalloon.innerHTML =
              balloonContent +
              `
              <div style="
                position: absolute;
                bottom: -8px;
                right: 40px;
                width: 0;
                height: 0;
                border-top: 8px solid #ffffff;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
              "></div>
            `;
          }
        });
      } else {
        console.log("⚠️ [showBalloon] Invalid stream data structure");
      }
    } catch (error) {
      console.error("❌ [showBalloon] Error parsing stream data:", error);
    }
  }

  // Add arrow pointing to character
  balloon.innerHTML = `
    ${balloonContent}
    <div style="
      position: absolute;
      bottom: -8px;
      right: 32px;
      width: 0;
      height: 0;
      border-top: 8px solid #ffffff;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
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
    showBalloon(message.message, message.data);

    console.log("✅ Balloon display completed");
  }

  if (message.type === "TOGGLE_ONCHAIN_NOTIFICATION") {
    console.log("🔔 [onchain-notification] TOGGLE_ONCHAIN_NOTIFICATION received:", message.isEnabled);

    if (message.isEnabled) {
      // 활성화 시 캐릭터 생성 + 테스트 말풍선 표시
      createCharacterUI();
      console.log("🧪 [onchain-notification] Showing test balloon for activation");
    } else {
      // 비활성화 시 캐릭터 제거
      removeCharacterUI();
    }
  }

  return true; // Keep message channel open
});
