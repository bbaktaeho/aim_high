// Network mapping helper
const getNetworkFromChainId = (chainId: string | number): { protocol: string; network: string } | null => {
  const id = typeof chainId === "string" ? parseInt(chainId, 16) : chainId;

  switch (id) {
    case 1:
      return { protocol: "ethereum", network: "mainnet" };
    case 5:
      return { protocol: "ethereum", network: "goerli" };
    case 11155111:
      return { protocol: "ethereum", network: "sepolia" };
    case 137:
      return { protocol: "polygon", network: "mainnet" };
    case 80001:
      return { protocol: "polygon", network: "mumbai" };
    case 42161:
      return { protocol: "arbitrum", network: "mainnet" };
    case 421613:
      return { protocol: "arbitrum", network: "goerli" };
    default:
      return null;
  }
};

// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    isEnabled: false,
    isTransactionCheckerEnabled: false,
    isOnchainNotificationEnabled: false,
  });
});

// Store active tab IDs where content script is loaded
const activeTabs = new Set<number>();

// Stream connection state
let socket: any = null;
let isStreamConnected = false;
let currentStreamAccount: string | null = null;
let currentChainId: number | null = null;
let messageId = "1234567890";
const eventType = "ADDRESS_ACTIVITY";
const streamUrl = "wss://web3.nodit.io/v1/websocket";

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

        if (changes.isOnchainNotificationEnabled) {
          await chrome.tabs.sendMessage(tab.id, {
            type: "TOGGLE_ONCHAIN_NOTIFICATION",
            isEnabled: changes.isOnchainNotificationEnabled.newValue,
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

  // Handle onchain notification stream connection
  if (changes.isOnchainNotificationEnabled) {
    console.log(`🔔 On-chain Notification toggled to: ${changes.isOnchainNotificationEnabled.newValue}`);
    if (changes.isOnchainNotificationEnabled.newValue) {
      connectToStreamIfReady();
    } else {
      disconnectFromStream();
    }
  }
};

// Connect to Nodit Stream via Content Script
const connectToStreamIfReady = async () => {
  try {
    // Get wallet and API key from storage
    const result = await chrome.storage.local.get(["walletAccount", "walletChainId", "noditApiKey"]);

    if (!result.walletAccount || !result.noditApiKey) {
      console.log("❌ Cannot connect to stream: missing wallet or API key");
      console.log("📋 Available data:", {
        hasWallet: !!result.walletAccount,
        hasApiKey: !!result.noditApiKey,
        wallet: result.walletAccount?.substring(0, 10) + "...",
        chainId: result.walletChainId,
      });
      return;
    }

    if (isStreamConnected && currentStreamAccount === result.walletAccount) {
      console.log("✅ Stream already connected for this account");
      return;
    }

    const networkInfo = getNetworkFromChainId(result.walletChainId || 1);
    if (!networkInfo) {
      console.log("❌ Unsupported network for stream connection:", result.walletChainId);
      return;
    }

    console.log("🚀 Requesting stream connection via content script...", {
      account: result.walletAccount,
      network: networkInfo,
      apiKey: result.noditApiKey?.substring(0, 10) + "...",
    });

    // Send connection request to any available tab with content script
    const tabs = await chrome.tabs.query({});
    const httpTabs = tabs.filter((tab) => tab.id && tab.url?.startsWith("http") && activeTabs.has(tab.id));

    if (httpTabs.length === 0) {
      console.log("ℹ️ No active content script tabs available for stream connection");
      return;
    }

    // Try to connect via the first available tab
    const tab = httpTabs[0];
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "CONNECT_STREAM",
          account: result.walletAccount,
          protocol: networkInfo.protocol,
          network: networkInfo.network,
          apiKey: result.noditApiKey,
          messageId: messageId,
          eventType: eventType,
        });

        console.log("✅ Stream connection request sent to tab", tab.id);
      } catch (error) {
        console.log("ℹ️ Content script not ready for connection:", error);
      }
    }
  } catch (error) {
    console.error("❌ Failed to connect to stream:", error);
  }
};

// Disconnect from Nodit Stream via Content Script
const disconnectFromStream = async () => {
  console.log("🔌 Requesting stream disconnection...");

  // Send disconnection request to any available tab with content script
  const tabs = await chrome.tabs.query({});
  const httpTabs = tabs.filter((tab) => tab.id && tab.url?.startsWith("http") && activeTabs.has(tab.id));

  if (httpTabs.length === 0) {
    console.log("ℹ️ No active content script tabs available for stream disconnection");
    // Safely reset local state without error
    isStreamConnected = false;
    currentStreamAccount = null;
    currentChainId = null;
    return;
  }

  // Try to disconnect via the first available tab with active content script
  const tab = httpTabs[0];
  if (tab.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "DISCONNECT_STREAM",
      });

      console.log("✅ Stream disconnection request sent to tab", tab.id);
    } catch (error) {
      console.log("ℹ️ Content script not ready for disconnection, resetting state locally:", error);
      // Force local state reset without throwing error
      isStreamConnected = false;
      currentStreamAccount = null;
      currentChainId = null;
    }
  }
};

// Handle stream events
const handleStreamEvent = (eventData: any) => {
  console.log("📨 Stream event received:", eventData);

  // Broadcast event to all tabs to show notification
  broadcastStreamEventToAllTabs("감지", eventData);
};

// Broadcast stream events to all tabs
const broadcastStreamEventToAllTabs = async (message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString("ko-KR");
  const tabs = await chrome.tabs.query({});
  const activeTabs_array = tabs.filter((tab) => tab.id && tab.url?.startsWith("http") && activeTabs.has(tab.id));

  console.log(`📡 [${timestamp}] Broadcasting stream event to ${activeTabs_array.length} active tabs`);

  if (activeTabs_array.length === 0) {
    console.log(`ℹ️ [${timestamp}] No active content script tabs for stream event broadcast`);
    return;
  }

  const broadcastPromises = activeTabs_array.map(async (tab) => {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "STREAM_EVENT",
          message,
          data,
          timestamp,
        });
        console.log(`📤 [${timestamp}] Stream event sent to tab ${tab.id}`);
        return { success: true, tabId: tab.id };
      } catch (error) {
        console.log(`ℹ️ [${timestamp}] Content script not ready in tab ${tab.id}:`, error);
        // Remove inactive tab from set
        activeTabs.delete(tab.id);
        return { success: false, tabId: tab.id, error };
      }
    }
    return { success: false, tabId: tab.id, reason: "no_tab_id" };
  });

  const results = await Promise.allSettled(broadcastPromises);
  const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
  const failed = results.length - successful;

  console.log(`📊 [${timestamp}] Stream broadcast complete: ${successful} successful, ${failed} failed`);
};

// Listen for storage changes and broadcast to all tabs
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    console.log("📦 Storage changed:", changes);
    broadcastStateToAllTabs(changes);

    // Auto-connect to stream when wallet is connected and onchain notification is enabled
    if (changes.walletAccount && changes.walletAccount.newValue) {
      console.log("💼 Wallet connected, checking if stream should be started");
      chrome.storage.local.get(["isOnchainNotificationEnabled"], (result) => {
        if (result.isOnchainNotificationEnabled) {
          console.log("🔔 On-chain notification is enabled, connecting to stream");
          connectToStreamIfReady();
        }
      });
    }

    // Disconnect stream when wallet is disconnected
    if (changes.walletAccount && !changes.walletAccount.newValue) {
      console.log("💼 Wallet disconnected, stopping stream");
      disconnectFromStream();
    }
  }
});

// Auto-inject onchain-notification script when needed
const autoInjectOnchainNotification = async (tabId: number) => {
  try {
    const result = await chrome.storage.local.get(["isOnchainNotificationEnabled"]);

    if (result.isOnchainNotificationEnabled) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["onchain-notification.js"],
        });
        console.log(`🔔 On-chain notification auto-injected in tab ${tabId}`);
      } catch (err) {
        console.log(`❌ Failed to auto-inject on-chain notification in tab ${tabId}:`, err);
      }
    }
  } catch (storageErr) {
    console.error("Failed to check on-chain notification state:", storageErr);
  }
};

// Listen for content script ready message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONTENT_SCRIPT_READY" && sender.tab?.id) {
    activeTabs.add(sender.tab.id);
    console.log(`📝 Content script ready in tab ${sender.tab.id}`);

    // Send current state to the newly loaded content script
    chrome.storage.local.get(["isEnabled", "isTransactionCheckerEnabled", "isOnchainNotificationEnabled"], (result) => {
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

        // Send Transaction Tracker state
        chrome.tabs
          .sendMessage(tabId, {
            type: "TOGGLE_TRANSACTION_CHECKER",
            isEnabled: result.isTransactionCheckerEnabled ?? false,
          })
          .catch(() => {
            console.log(`Failed to send initial Transaction Tracker state to tab ${tabId}`);
          });

        console.log(`🚀 Initial state sent to tab ${tabId}:`, result);
      }
    });

    // Auto-inject onchain notification if enabled
    autoInjectOnchainNotification(sender.tab.id);
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
    chrome.storage.local.get(["isEnabled", "isTransactionCheckerEnabled", "isOnchainNotificationEnabled"], (result) => {
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

  // Handle stream events from content script
  if (message.type === "STREAM_CONNECTED") {
    console.log("✅ Stream connected for account:", message.account);
    isStreamConnected = true;
    currentStreamAccount = message.account;
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "STREAM_EVENT_RECEIVED") {
    console.log("🔔 Stream event received from content script:", message.data);
    handleStreamEvent(message.data);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "STREAM_DISCONNECTED") {
    console.log("🔌 Stream disconnected:", message.reason);
    isStreamConnected = false;
    currentStreamAccount = null;
    currentChainId = null;
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "STREAM_CONNECTION_ERROR" || message.type === "STREAM_ERROR") {
    console.error("❌ Stream error:", message.error);
    isStreamConnected = false;
    sendResponse({ success: true });
    return true;
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

    // Auto-inject Transaction Tracker if enabled
    try {
      const result = await chrome.storage.local.get(["isTransactionCheckerEnabled"]);

      if (result.isTransactionCheckerEnabled) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ["transaction-checker.js"],
          });
          console.log(`🆕 Transaction Tracker auto-injected in new tab ${tabId}: ${tab.url}`);
        } catch (err) {
          console.log(`❌ Failed to auto-inject Transaction Tracker in tab ${tabId}:`, err);
        }
      }
    } catch (storageErr) {
      console.error("Failed to check Transaction Tracker state:", storageErr);
    }

    // Auto-inject onchain notification if enabled
    autoInjectOnchainNotification(tabId);
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});

// Initialize stream connection on startup if conditions are met (temporarily disabled)
// TODO: Re-implement startup stream connection
/*
chrome.runtime.onStartup.addListener(() => {
  console.log("🚀 Extension startup, checking for stream connection...");
  connectToStreamIfReady();
});

// Also check on extension install/enable
setTimeout(() => {
  console.log("🔄 Extension loaded, checking for stream connection...");
  connectToStreamIfReady();
}, 1000);
*/

// Test function for stream simulation (temporarily disabled)
// TODO: Re-implement stream testing
/*
const testStreamEvent = () => {
  console.log("🧪 Stream testing temporarily disabled");
};

// Add test stream simulation after 10 seconds
setTimeout(() => {
  console.log("🧪 Stream testing temporarily disabled");
}, 10000);
*/
