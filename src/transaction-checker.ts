// Transaction Tracker Content Script
// 이 스크립트는 트랜잭션 체커가 활성화될 때만 주입됩니다.

let isTransactionCheckerInitialized = false;

// Transaction Tracker page script 주입 함수
const injectTransactionCheckerScript = () => {
  // 이미 주입된 경우 중복 주입 방지
  if (document.getElementById("transaction-checker-script")) return;
  const script = document.createElement("script");
  script.id = "transaction-checker-script";
  script.src = chrome.runtime.getURL("page-script.js");
  (document.head || document.documentElement).appendChild(script);
  console.log("Transaction Tracker: page script injected");
};

// Transaction Tracker page script 제거 함수
const removeTransactionCheckerScript = () => {
  const script = document.getElementById("transaction-checker-script");
  if (script) {
    script.remove();
    console.log("Transaction Tracker: page script removed");
  }
};

// window에서 오는 트랜잭션 체크 메시지 수신 및 익스텐션으로 전달
const handleTransactionMessage = (event: MessageEvent) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === "TX_CHECKER_SEND") {
    console.log("Transaction Tracker: received TX_CHECKER_SEND", event.data.payload);
    chrome.runtime.sendMessage({ type: "TX_CHECKER_SEND", payload: event.data.payload });
  }
};

// Transaction Tracker 초기화
const initializeTransactionChecker = () => {
  if (isTransactionCheckerInitialized) return;

  console.log("Transaction Tracker: initializing...");

  // page script 주입
  injectTransactionCheckerScript();

  // window message 리스너 등록
  window.addEventListener("message", handleTransactionMessage);

  isTransactionCheckerInitialized = true;
  console.log("Transaction Tracker: initialized");
};

// Transaction Tracker 정리
const cleanupTransactionChecker = () => {
  if (!isTransactionCheckerInitialized) return;

  console.log("Transaction Tracker: cleaning up...");

  // page script 제거
  removeTransactionCheckerScript();

  // window message 리스너 제거
  window.removeEventListener("message", handleTransactionMessage);

  isTransactionCheckerInitialized = false;
  console.log("Transaction Tracker: cleaned up");
};

// 메시지 리스너 (background/popup에서 오는 메시지)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INIT_TRANSACTION_CHECKER") {
    initializeTransactionChecker();
    sendResponse({ success: true });
  }

  if (message.type === "CLEANUP_TRANSACTION_CHECKER") {
    cleanupTransactionChecker();
    sendResponse({ success: true });
  }
});

// 스크립트 로드 시 자동 초기화 (트랜잭션 체커가 활성화된 상태에서 주입되므로)
initializeTransactionChecker();
