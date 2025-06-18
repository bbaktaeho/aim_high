import { simulateWebhookEvent, startWebhookPolling, stopWebhookPolling } from "./services/webhookServer";
import {
  createWebhook,
  deleteWebhook,
  formatWebhookData,
  getNetworkFromChainId,
  WebhookCreateRequest,
  WebhookEventData,
} from "./services/webhookService";

// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    isEnabled: false,
    isTransactionCheckerEnabled: false,
    isWebhookEnabled: false,
    webhookSubscriptions: {},
  });
});

// Store active tab IDs where content script is loaded
const activeTabs = new Set<number>();

// Webhook polling management
let webhookPollingInterval: number | null = null;
const activeWebhooks = new Map<string | number, string>(); // chainId -> subscriptionId

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
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});

// Webhook Management Functions
async function createWebhookForAccount(account: string, chainId: string | number, apiKey: string): Promise<void> {
  try {
    const networkInfo = getNetworkFromChainId(chainId);
    if (!networkInfo) {
      console.error(`❌ Unsupported chain ID: ${chainId}`);
      return;
    }

    // Check if webhook already exists for this chain
    if (activeWebhooks.has(chainId)) {
      console.log(`📎 Webhook already exists for chain ${chainId}`);
      return;
    }

    // Create webhook URL (for demo purposes, we'll use a placeholder)
    // In production, you would need a real webhook endpoint
    const webhookUrl = "https://webhook.site/unique-url-here";

    const webhookRequest: WebhookCreateRequest = {
      url: webhookUrl,
      eventType: "ADDRESS_ACTIVITY",
      addresses: [account],
      includeTransactionReceipts: true,
      includeInternalTransactions: true,
      includeTokenTransfers: true,
      includeNftTransfers: true,
      isInstant: true,
    };

    console.log(`🎣 Creating webhook with request:`, webhookRequest);
    const response = await createWebhook(networkInfo.protocol, networkInfo.network, apiKey, webhookRequest);
    console.log(`🎣 Webhook creation response:`, response);

    // Store webhook subscription
    activeWebhooks.set(chainId, response.subscriptionId);

    // Update storage
    const result = await chrome.storage.local.get(["webhookSubscriptions"]);
    const subscriptions = result.webhookSubscriptions || {};
    subscriptions[chainId] = {
      subscriptionId: response.subscriptionId,
      account,
      network: networkInfo,
      createdAt: Date.now(),
      webhookUrl: webhookRequest.url,
      isInstant: webhookRequest.isInstant,
    };

    await chrome.storage.local.set({ webhookSubscriptions: subscriptions });

    console.log(`✅ Webhook successfully created and stored:`, {
      subscriptionId: response.subscriptionId,
      account,
      chainId,
      network: `${networkInfo.protocol}/${networkInfo.network}`,
      isInstant: webhookRequest.isInstant,
      url: webhookRequest.url,
    });

    // Start polling for webhook events if not already started
    if (!webhookPollingInterval) {
      startWebhookEventPolling();
    }
  } catch (error) {
    console.error("❌ Failed to create webhook:", error);
  }
}

async function deleteWebhookForChain(chainId: string | number, apiKey: string): Promise<void> {
  try {
    const subscriptionId = activeWebhooks.get(chainId);
    if (!subscriptionId) {
      console.log(`❌ No webhook found for chain ${chainId}`);
      return;
    }

    const networkInfo = getNetworkFromChainId(chainId);
    if (!networkInfo) {
      console.error(`❌ Unsupported chain ID: ${chainId}`);
      return;
    }

    console.log(`🗑️ Deleting webhook:`, {
      subscriptionId,
      chainId,
      network: `${networkInfo.protocol}/${networkInfo.network}`,
    });

    await deleteWebhook(networkInfo.protocol, networkInfo.network, apiKey, subscriptionId);

    // Remove from active webhooks
    activeWebhooks.delete(chainId);

    // Update storage
    const result = await chrome.storage.local.get(["webhookSubscriptions"]);
    const subscriptions = result.webhookSubscriptions || {};
    const deletedSubscription = subscriptions[chainId];
    delete subscriptions[chainId];
    await chrome.storage.local.set({ webhookSubscriptions: subscriptions });

    console.log(`✅ Webhook successfully deleted:`, {
      subscriptionId,
      chainId,
      network: `${networkInfo.protocol}/${networkInfo.network}`,
      deletedSubscription,
    });

    // Stop polling if no active webhooks
    if (activeWebhooks.size === 0 && webhookPollingInterval) {
      stopWebhookPolling(webhookPollingInterval);
      webhookPollingInterval = null;
    }
  } catch (error) {
    console.error("❌ Failed to delete webhook:", error);
  }
}

function startWebhookEventPolling(): void {
  if (webhookPollingInterval) return;

  webhookPollingInterval = startWebhookPolling((events: WebhookEventData[]) => {
    const timestamp = new Date().toLocaleTimeString("ko-KR");
    console.log(`📨 [${timestamp}] Received ${events.length} webhook events:`, events);

    events.forEach((event, index) => {
      // Get chain ID from event context (you might need to pass this from the webhook response)
      const chainId = event.network || "1"; // Default to Ethereum mainnet if not provided

      // Format the webhook data for display
      const formattedData = formatWebhookData(event, chainId);
      console.log(`🔄 [${timestamp}] Processing event ${index + 1}/${events.length}:`, {
        subscriptionId: event.subscriptionId,
        from: event.from,
        to: event.to,
        value: event.value,
        status: event.status,
        formattedMessage: formattedData.message.substring(0, 100) + "...",
        chainData: formattedData.data,
      });

      // Send to onchain notification with both message and data
      broadcastWebhookEventToAllTabs(formattedData.message, formattedData.data);
    });
  });

  console.log("🔄 Webhook event polling started");
}

async function broadcastWebhookEventToAllTabs(message: string, data?: any): Promise<void> {
  const timestamp = new Date().toLocaleTimeString("ko-KR");
  const tabs = await chrome.tabs.query({});
  console.log(`📡 [${timestamp}] Broadcasting webhook event to ${tabs.length} tabs`);

  const broadcastPromises = tabs.map(async (tab) => {
    if (tab.id && tab.url?.startsWith("http")) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "WEBHOOK_EVENT",
          message,
          data,
          timestamp,
        });
        console.log(`📤 [${timestamp}] Webhook event sent to tab ${tab.id} (${tab.url})`);
        return { success: true, tabId: tab.id, url: tab.url };
      } catch (error) {
        // Tab might not have the content script loaded
        console.log(`❌ [${timestamp}] Failed to send webhook event to tab ${tab.id} (${tab.url}):`, error);
        return { success: false, tabId: tab.id, url: tab.url, error };
      }
    }
    return { success: false, tabId: tab.id, reason: "invalid_url" };
  });

  const results = await Promise.allSettled(broadcastPromises);
  const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
  const failed = results.length - successful;

  console.log(`📊 [${timestamp}] Webhook broadcast complete: ${successful} successful, ${failed} failed`);
}

// Handle webhook management messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "MANAGE_WEBHOOK") {
    const { action, account, chainId, apiKey } = message;

    if (action === "create") {
      createWebhookForAccount(account, chainId, apiKey)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
    } else if (action === "delete") {
      deleteWebhookForChain(chainId, apiKey)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
    }

    return true; // Keep message channel open for async response
  }

  // Test webhook simulation
  if (message.type === "SIMULATE_WEBHOOK") {
    const { from, to, value, network } = message;
    simulateWebhookEvent(from, to, value, network)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  }
});
