// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ isEnabled: false });
});

// Store active tab IDs where content script is loaded
const activeTabs = new Set<number>();

// Listen for content script ready message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONTENT_SCRIPT_READY" && sender.tab?.id) {
    activeTabs.add(sender.tab.id);
    // Send current state to the newly loaded content script
    chrome.storage.local.get(["isEnabled"], (result) => {
      if (sender.tab?.id) {
        chrome.tabs
          .sendMessage(sender.tab.id, {
            type: "TOGGLE_EXTENSION",
            isEnabled: result.isEnabled ?? false,
          })
          .catch(() => {
            // Ignore errors for initial state
          });
      }
    });
  }
  if (message.type === "TX_CHECKER_SEND") {
    // 트랜잭션 정보를 쿼리스트링으로 encode
    const txData = encodeURIComponent(JSON.stringify(message.payload));
    chrome.windows.create({
      url: chrome.runtime.getURL("transaction.html?tx=" + txData),
      type: "popup",
      width: 420,
      height: 600,
    });
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.startsWith("http")) {
    try {
      // Check if content script is already injected
      await chrome.tabs.sendMessage(tabId, { type: "PING" });
    } catch (error) {
      // Content script is not loaded, inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["content.js"],
        });
        activeTabs.add(tabId);
      } catch (err) {
        console.error("Failed to inject content script:", err);
      }
    }
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});
