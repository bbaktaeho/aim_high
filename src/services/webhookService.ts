/**
 * Nodit Webhook Service
 * Handles webhook creation, deletion, and data processing
 */

export interface WebhookCreateRequest {
  url: string;
  eventType: "ADDRESS_ACTIVITY";
  addresses: string[];
  includeTransactionReceipts?: boolean;
  includeInternalTransactions?: boolean;
  includeTokenTransfers?: boolean;
  includeNftTransfers?: boolean;
  isInstant?: boolean;
}

export interface WebhookResponse {
  subscriptionId: string;
  url: string;
  eventType: string;
  addresses: string[];
  status: string;
  createdAt: string;
}

export interface WebhookEventData {
  subscriptionId: string;
  eventType: "ADDRESS_ACTIVITY";
  network: string;
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  value: string;
  gasPrice?: string;
  gasUsed?: string;
  timestamp: number;
  status: "success" | "failed";
  tokenTransfers?: Array<{
    from: string;
    to: string;
    value: string;
    tokenAddress: string;
    tokenName?: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
  }>;
}

const WEBHOOK_BASE_URL = "https://web3.nodit.io/v1";

/**
 * Create webhook for address activity
 * Note: For demo purposes, this creates a mock webhook since Chrome extensions
 * cannot directly receive webhook callbacks. In production, you would need
 * a real webhook endpoint URL.
 */
export const createWebhook = async (
  protocol: string,
  network: string,
  apiKey: string,
  request: WebhookCreateRequest
): Promise<WebhookResponse> => {
  const timestamp = new Date().toISOString();
  console.log(`🎣 [${timestamp}] Creating webhook for ${protocol}/${network}:`, {
    url: request.url,
    eventType: request.eventType,
    addresses: request.addresses,
    isInstant: request.isInstant,
    includeTransactionReceipts: request.includeTransactionReceipts,
    includeInternalTransactions: request.includeInternalTransactions,
    includeTokenTransfers: request.includeTokenTransfers,
    includeNftTransfers: request.includeNftTransfers,
  });

  // For demo purposes, create a mock webhook response
  // In production, you would make the actual API call to Nodit
  const mockResponse: WebhookResponse = {
    subscriptionId: `mock-${protocol}-${network}-${Date.now()}`,
    url: request.url,
    eventType: request.eventType,
    addresses: request.addresses,
    status: "active",
    createdAt: timestamp,
  };

  console.log(`✅ [${timestamp}] Mock webhook created successfully:`, {
    subscriptionId: mockResponse.subscriptionId,
    status: mockResponse.status,
    addresses: mockResponse.addresses,
    isInstant: request.isInstant,
  });

  // Log the actual API call that would be made in production
  console.log(`📋 [${timestamp}] Production API call would be:`, {
    method: "POST",
    url: `https://web3.nodit.io/v1/${protocol}/${network}/webhooks`,
    headers: { "X-API-KEY": apiKey.substring(0, 8) + "..." },
    body: request,
  });

  return mockResponse;

  // Uncomment below for actual webhook creation when you have a real endpoint:
  /*
  const url = `${WEBHOOK_BASE_URL}/${protocol}/${network}/webhooks`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Webhook creation failed:`, {
      status: response.status,
      statusText: response.statusText,
      errorText,
    });
    throw new Error(`Webhook creation failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ Webhook created successfully:`, result);
  return result;
  */
};

/**
 * Delete webhook by subscription ID
 */
export const deleteWebhook = async (
  protocol: string,
  network: string,
  apiKey: string,
  subscriptionId: string
): Promise<void> => {
  console.log(`🗑️ Deleting mock webhook: ${subscriptionId}`);

  // For demo purposes, just log the deletion
  // In production, you would make the actual API call to Nodit
  console.log(`✅ Mock webhook deleted successfully: ${subscriptionId}`);

  // Uncomment below for actual webhook deletion:
  /*
  const url = `${WEBHOOK_BASE_URL}/${protocol}/${network}/webhooks/${subscriptionId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-API-KEY': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Webhook deletion failed:`, {
      status: response.status,
      statusText: response.statusText,
      errorText,
    });
    throw new Error(`Webhook deletion failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  console.log(`✅ Webhook deleted successfully: ${subscriptionId}`);
  */
};

/**
 * Get webhook information
 */
export const getWebhook = async (
  protocol: string,
  network: string,
  apiKey: string,
  subscriptionId: string
): Promise<WebhookResponse> => {
  const url = `${WEBHOOK_BASE_URL}/${protocol}/${network}/webhooks/${subscriptionId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-KEY": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Webhook fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
};

/**
 * Get network name from chain ID
 * Accepts both hex string and decimal number formats
 */
export const getNetworkFromChainId = (chainId: string | number): { protocol: string; network: string } | null => {
  // Convert to decimal number for consistent lookup
  let decimalChainId: number;

  if (typeof chainId === "string") {
    // Handle hex string format (e.g., '0x1', '0xaa36a7')
    decimalChainId = chainId.startsWith("0x") ? parseInt(chainId, 16) : parseInt(chainId, 10);
  } else {
    // Handle decimal number format
    decimalChainId = chainId;
  }

  const networks: Record<number, { protocol: string; network: string }> = {
    // Mainnets
    1: { protocol: "ethereum", network: "mainnet" },
    137: { protocol: "polygon", network: "mainnet" },
    42161: { protocol: "arbitrum", network: "mainnet" },
    10: { protocol: "optimism", network: "mainnet" },
    8453: { protocol: "base", network: "mainnet" },

    // Testnets
    11155111: { protocol: "ethereum", network: "sepolia" },
    80002: { protocol: "polygon", network: "amoy" },
    421614: { protocol: "arbitrum", network: "sepolia" },
    84532: { protocol: "base", network: "sepolia" },
    11155420: { protocol: "optimism", network: "sepolia" },
  };

  const result = networks[decimalChainId] || null;
  console.log(
    `🔗 Chain ID mapping: ${chainId} (${typeof chainId}) -> ${decimalChainId} -> ${
      result ? `${result.protocol}/${result.network}` : "null"
    }`
  );

  return result;
};

/**
 * Format webhook data for display
 */
export const formatWebhookData = (
  data: WebhookEventData,
  chainId?: string | number
): { message: string; data: any } => {
  const rawValue = parseFloat(data.value) / Math.pow(10, 18);
  const timeStr = new Date(data.timestamp * 1000).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Get chain information
  let chainName = "Unknown Chain";
  if (chainId) {
    const networkInfo = getNetworkFromChainId(chainId);
    if (networkInfo) {
      chainName = `${networkInfo.protocol.charAt(0).toUpperCase() + networkInfo.protocol.slice(1)} ${
        networkInfo.network.charAt(0).toUpperCase() + networkInfo.network.slice(1)
      }`;
    }
  } else if (data.network) {
    chainName = data.network.charAt(0).toUpperCase() + data.network.slice(1);
  }

  let message = `🔗 트랜잭션 감지! [${chainName}]\n${timeStr}\n`;
  message += `From: ${data.from.slice(0, 6)}...${data.from.slice(-4)}\n`;
  message += `To: ${data.to.slice(0, 6)}...${data.to.slice(-4)}\n`;

  // Show raw value without ETH unit (could be tokens)
  if (rawValue > 0) {
    message += `Value: ${rawValue.toFixed(6)}\n`;
  }

  message += `Status: ${data.status === "success" ? "✅ 성공" : "❌ 실패"}`;

  // Add token transfers if available
  if (data.tokenTransfers && data.tokenTransfers.length > 0) {
    message += `\n\n📋 토큰 전송:`;
    data.tokenTransfers.slice(0, 2).forEach((transfer) => {
      const tokenValue = transfer.tokenDecimals
        ? parseFloat(transfer.value) / Math.pow(10, transfer.tokenDecimals)
        : parseFloat(transfer.value);
      message += `\n${tokenValue.toFixed(4)} ${transfer.tokenSymbol || "TOKEN"}`;
    });
  }

  // Return both message and structured data for onchain-notification
  return {
    message,
    data: {
      chain: chainName,
      from: data.from,
      to: data.to,
      value: rawValue > 0 ? rawValue.toFixed(6) : "0",
      status: data.status === "success" ? "성공" : "실패",
      timestamp: timeStr,
    },
  };
};
