// Nodit Stream Content Script
import io from "socket.io-client";

let socket: any = null;
let isConnected = false;

// Listen for connection requests from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONNECT_STREAM") {
    console.log("🚀 Received stream connection request:", message);
    connectToStream(message);
    sendResponse({ success: true });
  }

  if (message.type === "DISCONNECT_STREAM") {
    console.log("🔌 Received stream disconnection request");
    disconnectFromStream();
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});

async function connectToStream(config: any) {
  try {
    if (isConnected) {
      console.log("✅ Stream already connected");
      return;
    }

    const { account, protocol, network, apiKey, messageId, eventType } = config;

    console.log("🚀 Connecting to Nodit Stream...", {
      account: account?.substring(0, 10) + "...",
      protocol,
      network,
      apiKey: apiKey?.substring(0, 10) + "...",
    });

    const url = "wss://web3.nodit.io/v1/websocket";

    const params = {
      description: `Monitoring address activity for ${account}`,
      isInstant: true,
      condition: {
        addresses: [account],
      },
    };

    const options = {
      rejectUnauthorized: false,
      transports: ["websocket", "polling"],
      path: "/v1/websocket/",
      auth: {
        apiKey: apiKey,
      },
      query: {
        protocol: protocol,
        network: network,
      },
    };

    socket = io(url, options);

    socket.on("connect", () => {
      console.log("🔌 ✅ Connected to Nodit Stream");
      isConnected = true;

      // Notify background of successful connection
      chrome.runtime.sendMessage({
        type: "STREAM_CONNECTED",
        account: account,
      });
    });

    socket.on("subscription_registered", (message: any) => {
      console.log("📝 ✅ Stream subscription registered:", message);
    });

    socket.on("subscription_connected", (message: any) => {
      console.log("🔗 ✅ Stream subscription connected:", message);
      socket.emit("subscription", messageId, eventType, JSON.stringify(params));
    });

    socket.on("subscription_error", (message: any) => {
      console.error("❌ Stream subscription error:", message);

      // Notify background of error
      chrome.runtime.sendMessage({
        type: "STREAM_ERROR",
        error: message,
      });
    });

    socket.on("subscription_event", (message: any) => {
      console.log("🔔 ✅ Stream event received:", message);

      // Forward event to background
      chrome.runtime.sendMessage({
        type: "STREAM_EVENT_RECEIVED",
        data: message,
      });
    });

    socket.on("disconnect", (reason: any) => {
      console.warn("🔌 Stream disconnected:", reason);
      isConnected = false;

      // Notify background of disconnection
      chrome.runtime.sendMessage({
        type: "STREAM_DISCONNECTED",
        reason: reason,
      });
    });

    socket.on("connect_error", (error: any) => {
      console.error("❌ Stream connection error:", error);
      isConnected = false;

      // Notify background of connection error
      chrome.runtime.sendMessage({
        type: "STREAM_CONNECTION_ERROR",
        error: error.message || error,
      });
    });
  } catch (error) {
    console.error("❌ Failed to connect to stream:", error);

    // Notify background of error
    chrome.runtime.sendMessage({
      type: "STREAM_CONNECTION_ERROR",
      error: error,
    });
  }
}

function disconnectFromStream() {
  if (socket) {
    console.log("🔌 Disconnecting from Nodit Stream");
    socket.disconnect();
    socket = null;
  }
  isConnected = false;

  // Notify background of disconnection
  chrome.runtime.sendMessage({
    type: "STREAM_DISCONNECTED",
    reason: "manual_disconnect",
  });
}

console.log("🚀 Nodit Stream content script loaded");
