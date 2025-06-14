// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    isEnabled: false,
    isTransactionCheckerEnabled: false,
  });
});

// Store active tab IDs where content script is loaded
const activeTabs = new Set<number>();

// Broadcast state changes to all active tabs
const broadcastStateToAllTabs = async (changes: any) => {
  console.log("🔄 Broadcasting state changes to all tabs:", changes);

  const tabs = await chrome.tabs.query({});
  const broadcastPromises = tabs.map(async (tab) => {
    if (tab.id && tab.url?.startsWith("http") && activeTabs.has(tab.id)) {
      try {
        // Send state changes to each tab
        if (changes.isEnabled) {
          await chrome.tabs.sendMessage(tab.id, {
            type: "TOGGLE_EXTENSION",
            isEnabled: changes.isEnabled.newValue,
          });
        }

        if (changes.isTransactionCheckerEnabled) {
          await chrome.tabs.sendMessage(tab.id, {
            type: "TOGGLE_TRANSACTION_CHECKER",
            isEnabled: changes.isTransactionCheckerEnabled.newValue,
          });
        }

        console.log(`✅ State broadcasted to tab ${tab.id}`);
      } catch (error) {
        console.log(`❌ Failed to broadcast to tab ${tab.id}:`, error);
        // Remove inactive tab from set
        activeTabs.delete(tab.id);
      }
    }
  });

  await Promise.allSettled(broadcastPromises);
};

// Listen for storage changes and broadcast to all tabs
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    console.log("📦 Storage changed:", changes);
    broadcastStateToAllTabs(changes);
  }
});

// Listen for content script ready message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONTENT_SCRIPT_READY" && sender.tab?.id) {
    activeTabs.add(sender.tab.id);
    console.log(`📝 Content script ready in tab ${sender.tab.id}`);

    // Send current state to the newly loaded content script
    chrome.storage.local.get(["isEnabled", "isTransactionCheckerEnabled"], (result) => {
      const tabId = sender.tab?.id;
      if (tabId) {
        // Send extension state
        chrome.tabs
          .sendMessage(tabId, {
            type: "TOGGLE_EXTENSION",
            isEnabled: result.isEnabled ?? false,
          })
          .catch(() => {
            console.log(`Failed to send initial extension state to tab ${tabId}`);
          });

        // Send transaction checker state
        chrome.tabs
          .sendMessage(tabId, {
            type: "TOGGLE_TRANSACTION_CHECKER",
            isEnabled: result.isTransactionCheckerEnabled ?? false,
          })
          .catch(() => {
            console.log(`Failed to send initial transaction checker state to tab ${tabId}`);
          });

        console.log(`🚀 Initial state sent to tab ${tabId}:`, result);
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

  // Handle manual state sync request
  if (message.type === "REQUEST_STATE_SYNC" && sender.tab?.id) {
    const tabId = sender.tab.id;
    chrome.storage.local.get(["isEnabled", "isTransactionCheckerEnabled"], (result) => {
      chrome.tabs
        .sendMessage(tabId, {
          type: "STATE_SYNC_RESPONSE",
          state: result,
        })
        .catch(() => {
          console.log(`Failed to send state sync response to tab ${tabId}`);
        });
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
