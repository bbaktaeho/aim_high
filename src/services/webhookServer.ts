/**
 * Webhook Server Alternative for Chrome Extension
 * Since Chrome extensions cannot directly receive webhooks,
 * we'll use a polling mechanism to check for webhook events
 */

import { WebhookEventData } from "./webhookService";

interface WebhookEventStorage {
  subscriptionId: string;
  events: WebhookEventData[];
  lastChecked: number;
}

const WEBHOOK_STORAGE_KEY = "webhookEvents";
const WEBHOOK_POLL_INTERVAL = 5000; // 5 seconds

/**
 * Store webhook event data
 * This would typically be called by an external webhook endpoint
 */
export const storeWebhookEvent = async (event: WebhookEventData): Promise<void> => {
  try {
    const result = await chrome.storage.local.get([WEBHOOK_STORAGE_KEY]);
    const storage: WebhookEventStorage = result[WEBHOOK_STORAGE_KEY] || {
      subscriptionId: "",
      events: [],
      lastChecked: 0,
    };

    // Add new event to the beginning of the array
    storage.events.unshift(event);

    // Keep only the last 50 events to prevent storage overflow
    if (storage.events.length > 50) {
      storage.events = storage.events.slice(0, 50);
    }

    await chrome.storage.local.set({
      [WEBHOOK_STORAGE_KEY]: storage,
    });

    console.log("📦 Webhook event stored:", event);
  } catch (error) {
    console.error("❌ Failed to store webhook event:", error);
  }
};

/**
 * Get new webhook events since last check
 */
export const getNewWebhookEvents = async (): Promise<WebhookEventData[]> => {
  try {
    const result = await chrome.storage.local.get([WEBHOOK_STORAGE_KEY]);
    const storage: WebhookEventStorage = result[WEBHOOK_STORAGE_KEY] || {
      subscriptionId: "",
      events: [],
      lastChecked: 0,
    };

    const now = Date.now();
    const newEvents = storage.events.filter((event) => event.timestamp * 1000 > storage.lastChecked);

    // Update last checked time
    storage.lastChecked = now;
    await chrome.storage.local.set({
      [WEBHOOK_STORAGE_KEY]: storage,
    });

    return newEvents;
  } catch (error) {
    console.error("❌ Failed to get webhook events:", error);
    return [];
  }
};

/**
 * Clear all webhook events
 */
export const clearWebhookEvents = async (): Promise<void> => {
  try {
    await chrome.storage.local.remove([WEBHOOK_STORAGE_KEY]);
    console.log("🗑️ Webhook events cleared");
  } catch (error) {
    console.error("❌ Failed to clear webhook events:", error);
  }
};

/**
 * Start webhook event polling
 * This simulates receiving webhook events by checking storage periodically
 */
export const startWebhookPolling = (callback: (events: WebhookEventData[]) => void): number => {
  const pollForEvents = async () => {
    const newEvents = await getNewWebhookEvents();
    if (newEvents.length > 0) {
      callback(newEvents);
    }
  };

  // Initial check
  pollForEvents();

  // Set up interval polling
  return window.setInterval(pollForEvents, WEBHOOK_POLL_INTERVAL);
};

/**
 * Stop webhook event polling
 */
export const stopWebhookPolling = (intervalId: number): void => {
  clearInterval(intervalId);
};

/**
 * Simulate webhook event for testing
 * This would typically come from an external webhook
 */
export const simulateWebhookEvent = async (from: string, to: string, value: string, network: string): Promise<void> => {
  const mockEvent: WebhookEventData = {
    subscriptionId: "test-subscription",
    eventType: "ADDRESS_ACTIVITY",
    network,
    blockNumber: Math.floor(Math.random() * 1000000),
    blockHash:
      "0x" +
      Array(64)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join(""),
    transactionHash:
      "0x" +
      Array(64)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join(""),
    transactionIndex: 0,
    from,
    to,
    value,
    gasPrice: "20000000000",
    gasUsed: "21000",
    timestamp: Math.floor(Date.now() / 1000),
    status: Math.random() > 0.1 ? "success" : "failed",
    tokenTransfers:
      Math.random() > 0.5
        ? [
            {
              from,
              to,
              value: (Math.random() * 1000).toString(),
              tokenAddress:
                "0x" +
                Array(40)
                  .fill(0)
                  .map(() => Math.floor(Math.random() * 16).toString(16))
                  .join(""),
              tokenName: "Test Token",
              tokenSymbol: "TEST",
              tokenDecimals: 18,
            },
          ]
        : undefined,
  };

  await storeWebhookEvent(mockEvent);
};
