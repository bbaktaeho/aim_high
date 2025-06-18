// Nodit Stream WebSocket Service
// @ts-ignore: socket.io-client types may not be available
import io from "socket.io-client";
type Socket = any; // Fallback type definition

interface NoditStreamParams {
  description: string;
  condition: {
    addresses: string[];
  };
}

interface NoditStreamOptions {
  rejectUnauthorized: boolean;
  transports: string[];
  path: string;
  auth: {
    apiKey: string;
  };
  query: {
    protocol: string;
    network: string;
  };
}

interface StreamEventData {
  from?: string;
  to?: string;
  value?: string;
  hash?: string;
  blockNumber?: number;
  gasUsed?: string;
  status?: string;
  timestamp?: number;
}

export class NoditStreamService {
  private socket: Socket | null = null;
  private messageId: string;
  private url: string = "wss://web3.nodit.io/v1/websocket";
  private eventType: string = "ADDRESS_ACTIVITY";
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private onEventCallback?: (data: StreamEventData) => void;

  constructor(messageId?: string) {
    this.messageId = messageId || `nodit_stream_${Date.now()}`;
  }

  // Connect to Nodit Stream with account and chain information
  async connect(
    account: string,
    protocol: string,
    network: string,
    apiKey: string,
    onEvent?: (data: StreamEventData) => void
  ): Promise<boolean> {
    try {
      if (this.isConnected && this.socket?.connected) {
        console.log("🔌 WebSocket already connected");
        return true;
      }

      this.onEventCallback = onEvent;

      const params: NoditStreamParams = {
        description: `Monitoring address activity for ${account}`,
        condition: {
          addresses: [account],
        },
      };

      const options: NoditStreamOptions = {
        rejectUnauthorized: false,
        transports: ["websocket"],
        path: "/v1/websocket/",
        auth: {
          apiKey: apiKey,
        },
        query: {
          protocol: protocol,
          network: network,
        },
      };

      console.log("🚀 Connecting to Nodit Stream:", {
        account,
        protocol,
        network,
        messageId: this.messageId,
        eventType: this.eventType,
        url: this.url,
        params: JSON.stringify(params),
        options: JSON.stringify(options, null, 2),
      });

      return new Promise((resolve, reject) => {
        this.socket = io(this.url, options);

        // Log all socket events for debugging
        this.socket.onAny((eventName: string, ...args: any[]) => {
          console.log(`🔍 Socket event received: ${eventName}`, args);
        });

        this.socket.on("connect", () => {
          console.log("✅ Connected to Nodit Stream");
          console.log("✅ Socket.io connection ID:", this.socket!.id);
          console.log("✅ Socket.io transport:", this.socket!.io.engine?.transport?.name);
          this.isConnected = true;
          this.reconnectAttempts = 0;

          this.socket!.on("subscription_registered", (message: any) => {
            console.log("📝 Subscription registered:", message);
          });

          this.socket!.on("subscription_connected", (message: any) => {
            console.log("🔗 Subscription connected:", message);

            // Emit subscription with parameters
            const subscriptionPayload = {
              messageId: this.messageId,
              eventType: this.eventType,
              params: JSON.stringify(params),
            };

            console.log("📤 Emitting subscription:", subscriptionPayload);
            this.socket!.emit("subscription", this.messageId, this.eventType, JSON.stringify(params));

            console.log("✅ Subscription emission completed, resolving connection promise");
            resolve(true);
          });

          this.socket!.on("subscription_error", (message: any) => {
            console.error("❌ Subscription error:", message);
            reject(new Error(message));
          });

          this.socket!.on("subscription_event", (message: any) => {
            console.log("📨 ===== RAW SUBSCRIPTION EVENT =====");
            console.log("📨 Raw stream message received:", JSON.stringify(message, null, 2));
            console.log("📨 Raw event message type:", typeof message);
            console.log("📨 Raw event message keys:", Object.keys(message || {}));
            console.log("📨 Raw event message values:", Object.values(message || {}));
            console.log("📨 Message constructor:", message?.constructor?.name);
            console.log("📨 ====================================");
            this.handleStreamEvent(message);
          });

          this.socket!.on("disconnect", (reason: any) => {
            console.warn("⚠️ Disconnected from Nodit Stream:", reason);
            this.isConnected = false;
            this.handleReconnection();
          });
        });

        this.socket.on("connect_error", (error: any) => {
          console.error("❌ Socket connection error:", error);
          console.error("❌ Error details:", {
            message: error.message,
            type: error.type,
            description: error.description,
          });
          this.isConnected = false;
          reject(error);
        });

        // Set timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error("Connection timeout"));
          }
        }, 10000);
      });
    } catch (error) {
      console.error("❌ Failed to connect to Nodit Stream:", error);
      return false;
    }
  }

  // Handle incoming stream events
  private handleStreamEvent(message: any): void {
    try {
      console.log("🔧 ===== PROCESSING STREAM EVENT =====");
      console.log("🔧 Original message structure:", {
        hasFrom: "from" in message,
        hasTo: "to" in message,
        hasValue: "value" in message,
        hasHash: "hash" in message,
        hasTransaction: "transaction" in message,
        hasBlock: "block" in message,
        hasData: "data" in message,
        topLevelKeys: Object.keys(message || {}),
        messageType: typeof message,
      });

      // Parse the message and extract transaction data
      const eventData: StreamEventData = {
        from: message.from || message.transaction?.from || message.block?.from || message.data?.from,
        to: message.to || message.transaction?.to || message.block?.to || message.data?.to,
        value: message.value || message.transaction?.value || message.block?.value || message.data?.value,
        hash: message.hash || message.transaction?.hash || message.block?.hash || message.data?.hash,
        blockNumber:
          message.blockNumber ||
          message.transaction?.blockNumber ||
          message.block?.blockNumber ||
          message.data?.blockNumber,
        gasUsed: message.gasUsed || message.transaction?.gasUsed || message.block?.gasUsed || message.data?.gasUsed,
        status:
          message.status || message.transaction?.status || message.block?.status || message.data?.status || "confirmed",
        timestamp:
          message.timestamp ||
          message.transaction?.timestamp ||
          message.block?.timestamp ||
          message.data?.timestamp ||
          Date.now(),
      };

      console.log("🔄 Extracted event data:", JSON.stringify(eventData, null, 2));
      console.log("🔧 ===================================");

      // Call the callback function if provided
      if (this.onEventCallback) {
        console.log("📞 Calling onEventCallback with processed data");
        this.onEventCallback(eventData);
      } else {
        console.log("⚠️ No onEventCallback registered");
      }
    } catch (error: any) {
      console.error("❌ Error processing stream event:", error);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Original message that caused error:", JSON.stringify(message, null, 2));
    }
  }

  // Handle reconnection logic
  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error("❌ Max reconnection attempts reached");
    }
  }

  // Disconnect from stream
  disconnect(): void {
    if (this.socket) {
      console.log("🔌 Disconnecting from Nodit Stream");
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  // Check connection status
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Get connection info
  getConnectionInfo(): { connected: boolean; messageId: string } {
    return {
      connected: this.isSocketConnected(),
      messageId: this.messageId,
    };
  }
}

// Singleton instance
export const noditStreamService = new NoditStreamService();
