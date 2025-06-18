import { noditStreamService } from "./services/noditStream";

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
let isStreamConnected = false;
let currentStreamAccount: string | null = null;
let currentChainId: number | null = null;

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
    if (changes.isOnchainNotificationEnabled.newValue) {
      // Connect to stream when enabled
      await connectToStreamIfReady();
    } else {
      // Disconnect from stream when disabled
      disconnectFromStream();
    }
  }
};

// Connect to Nodit Stream if conditions are met
const connectToStreamIfReady = async () => {
  try {
    const result = await chrome.storage.local.get([
      "isOnchainNotificationEnabled",
      "connectedAccount",
      "connectedChainId",
      "noditApiKey",
    ]);

    const { isOnchainNotificationEnabled, connectedAccount, connectedChainId, noditApiKey } = result;

    if (isOnchainNotificationEnabled && connectedAccount && connectedChainId && noditApiKey) {
      const networkInfo = getNetworkFromChainId(connectedChainId);

      if (networkInfo) {
        console.log("🚀 Connecting to Nodit Stream:", {
          account: connectedAccount,
          chainId: connectedChainId,
          protocol: networkInfo.protocol,
          network: networkInfo.network,
        });

        console.log("🔄 Attempting to connect to Nodit Stream...");
        const success = await noditStreamService.connect(
          connectedAccount,
          networkInfo.protocol,
          networkInfo.network,
          noditApiKey,
          handleStreamEvent
        );

        if (success) {
          isStreamConnected = true;
          currentStreamAccount = connectedAccount;
          currentChainId = connectedChainId;
          console.log("✅ Successfully connected to Nodit Stream");
          console.log("🔍 Connection status:", {
            isStreamConnected,
            currentStreamAccount,
            currentChainId,
            connectionInfo: noditStreamService.getConnectionInfo(),
          });
        } else {
          console.error("❌ Failed to connect to Nodit Stream");
          console.error("🔍 Connection failure details:", {
            account: connectedAccount,
            protocol: networkInfo.protocol,
            network: networkInfo.network,
            hasApiKey: !!noditApiKey,
            connectionInfo: noditStreamService.getConnectionInfo(),
          });
        }
      } else {
        console.error("❌ Unsupported chain ID for stream:", connectedChainId);
      }
    } else {
      console.log("⚠️ Missing required data for stream connection:", {
        isOnchainNotificationEnabled,
        connectedAccount: !!connectedAccount,
        connectedChainId: !!connectedChainId,
        noditApiKey: !!noditApiKey,
      });
    }
  } catch (error) {
    console.error("❌ Error connecting to stream:", error);
  }
};

// Disconnect from Nodit Stream
const disconnectFromStream = () => {
  if (isStreamConnected) {
    noditStreamService.disconnect();
    isStreamConnected = false;
    currentStreamAccount = null;
    currentChainId = null;
    console.log("🔌 Disconnected from Nodit Stream");
  }
};

// Handle stream events
const handleStreamEvent = (eventData: any) => {
  const timestamp = new Date().toLocaleTimeString("ko-KR");
  console.log(`📨 [${timestamp}] ===== STREAM EVENT RECEIVED =====`);
  console.log(`📨 [${timestamp}] Full raw stream data:`, JSON.stringify(eventData, null, 2));
  console.log(`📊 [${timestamp}] Stream event data type:`, typeof eventData);
  console.log(`📊 [${timestamp}] Stream event keys:`, Object.keys(eventData || {}));
  console.log(`📊 [${timestamp}] Stream event values:`, Object.values(eventData || {}));
  console.log(`📨 [${timestamp}] =====================================`);

  // Format the stream data for display
  const { from, to, value, hash, status } = eventData;
  const networkInfo = getNetworkFromChainId(currentChainId || 1);
  const chainName = networkInfo ? `${networkInfo.protocol}/${networkInfo.network}` : "Unknown Chain";

  const shortFrom = from ? `${from.slice(0, 6)}...${from.slice(-4)}` : "Unknown";
  const shortTo = to ? `${to.slice(0, 6)}...${to.slice(-4)}` : "Unknown";
  const statusIcon = status === "success" ? "✅" : status === "failed" ? "❌" : "⏳";

  // Format value to ETH if it's a valid number
  let displayValue = value || "0";
  if (value && value !== "0" && value !== "0x0") {
    try {
      const valueInWei = typeof value === "string" && value.startsWith("0x") ? parseInt(value, 16) : parseInt(value);
      const valueInEth = valueInWei / Math.pow(10, 18);
      displayValue = valueInEth > 0.001 ? `${valueInEth.toFixed(4)} ETH` : `${valueInWei} wei`;
    } catch (e) {
      displayValue = value;
    }
  }

  const displayMessage = `🔗 트랜잭션 감지! [${chainName}]
From: ${shortFrom}
To: ${shortTo}
Value: ${displayValue}
Status: ${statusIcon} ${status || "처리중"}`;

  const formattedData = {
    chain: chainName,
    from,
    to,
    value: displayValue,
    status: status || "processing",
    hash,
  };

  // Broadcast to all tabs
  broadcastStreamEventToAllTabs(displayMessage, formattedData);
};

// Broadcast stream events to all tabs
const broadcastStreamEventToAllTabs = async (message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString("ko-KR");
  const tabs = await chrome.tabs.query({});
  console.log(`📡 [${timestamp}] Broadcasting stream event to ${tabs.length} tabs`);

  const broadcastPromises = tabs.map(async (tab) => {
    if (tab.id && tab.url?.startsWith("http")) {
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
        console.log(`❌ [${timestamp}] Failed to send stream event to tab ${tab.id}:`, error);
        return { success: false, tabId: tab.id, error };
      }
    }
    return { success: false, tabId: tab.id, reason: "invalid_url" };
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

  // Handle stream management requests
  if (message.type === "MANAGE_STREAM") {
    const { action, account, chainId, apiKey } = message;

    if (action === "connect") {
      // Store connection data and connect
      chrome.storage.local
        .set({
          connectedAccount: account,
          connectedChainId: chainId,
          noditApiKey: apiKey,
        })
        .then(() => {
          connectToStreamIfReady()
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        });
    } else if (action === "disconnect") {
      disconnectFromStream();
      chrome.storage.local.remove(["connectedAccount", "connectedChainId"]);
      sendResponse({ success: true });
    }

    return true; // Keep message channel open for async response
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

// Initialize stream connection on startup if conditions are met
chrome.runtime.onStartup.addListener(() => {
  console.log("🚀 Extension startup, checking for stream connection...");
  connectToStreamIfReady();
});

// Also check on extension install/enable
setTimeout(() => {
  console.log("🔄 Extension loaded, checking for stream connection...");
  connectToStreamIfReady();
}, 1000);

// Test function for stream simulation
const testStreamEvent = () => {
  console.log("🧪 Testing stream event simulation...");

  const mockEventData = {
    from: "0x742d35Cc6634C0532925a3b8D4Cc23d3b8f5e5e5",
    to: "0x1234567890123456789012345678901234567890",
    value: "1000000000000000000", // 1 ETH in wei
    hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    blockNumber: 18500000,
    gasUsed: "21000",
    status: "success",
    timestamp: Date.now(),
  };

  console.log("🧪 Simulating stream event with mock data:", mockEventData);
  handleStreamEvent(mockEventData);
};

// Add test stream simulation after 10 seconds
setTimeout(() => {
  console.log("🧪 Running test stream event simulation...");
  testStreamEvent();
}, 10000);
