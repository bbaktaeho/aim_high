// This script runs in the context of the webpage
// Export to make this file a module (required for global declarations)
export {};

declare global {
  interface Window {
    __transactionCheckerInjected?: boolean;
    __pageScriptInjected?: boolean;
    ethereum?: {
      isMetaMask?: boolean;
      networkVersion?: string;
      selectedAddress?: string;
      chainId?: string;
      isConnected: () => boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      removeAllListeners: (event?: string) => void;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

// Function to get MetaMask info with fresh data
async function getMetaMaskInfo() {
  const ethereum = window.ethereum;
  if (!ethereum) return null;

  try {
    // Get fresh account and chain data
    const [accounts, chainId] = await Promise.all([
      ethereum.request({ method: "eth_accounts" }),
      ethereum.request({ method: "eth_chainId" }),
    ]);

    const freshInfo = {
      isMetaMask: ethereum.isMetaMask ?? false,
      networkVersion: ethereum.networkVersion,
      selectedAddress: accounts && accounts.length > 0 ? accounts[0] : null,
      chainId: chainId,
      isConnected: ethereum.isConnected(),
    };

    console.log("🔄 Fresh MetaMask info:", freshInfo);
    return freshInfo;
  } catch (error) {
    console.error("❌ Error getting fresh MetaMask info:", error);
    // Return basic info without account details if there's an error
    return {
      isMetaMask: ethereum.isMetaMask ?? false,
      networkVersion: ethereum.networkVersion,
      selectedAddress: null, // Don't return cached address on error
      chainId: null, // Don't return cached chainId on error
      isConnected: ethereum.isConnected(),
    };
  }
}

// Function to request user approval and get accounts
async function requestAccounts() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  console.log("🔐 Requesting user approval for account access...");

  // This will show MetaMask popup for user approval
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

  console.log("✅ User approved account access:", accounts);

  // Return the approved accounts
  return accounts;
}

// Function to disconnect wallet
function disconnectWallet() {
  if (window.ethereum?.removeAllListeners) {
    window.ethereum.removeAllListeners("accountsChanged");
    window.ethereum.removeAllListeners("chainChanged");
  }
  return true;
}

// Listen for messages from content script
window.addEventListener("message", async (event) => {
  // Only accept messages from our window
  if (event.source !== window) return;

  const { type, messageId } = event.data;
  if (type !== "FROM_CONTENT_SCRIPT") return;

  try {
    let result;
    switch (event.data.action) {
      case "GET_METAMASK_INFO":
        result = await getMetaMaskInfo();
        break;
      case "REQUEST_ACCOUNTS":
        result = await requestAccounts();
        break;
      case "DISCONNECT_WALLET":
        result = disconnectWallet();
        break;
      default:
        throw new Error("Unknown action");
    }

    window.postMessage(
      {
        type: "FROM_PAGE",
        messageId,
        success: true,
        data: result,
      },
      "*"
    );
  } catch (error: any) {
    window.postMessage(
      {
        type: "FROM_PAGE",
        messageId,
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      },
      "*"
    );
  }
});

// Transaction Checker: eth_sendTransaction 후킹
(function () {
  console.log("Transaction Checker: script injected");
  if (window.__transactionCheckerInjected) return;
  window.__transactionCheckerInjected = true;
  if (!window.ethereum || !window.ethereum.request) return;

  const originalRequest = window.ethereum.request;

  window.ethereum.request = async function (...args) {
    console.log("Transaction Checker: received", args);
    const [payload] = args;
    if (payload.method === "eth_sendTransaction") {
      console.log("🚀 트랜잭션 요청:", payload);

      const chainId = await originalRequest.call(this, {
        method: "eth_chainId",
        params: [],
      });
      // @ts-ignore
      payload.chainId = chainId;
      window.postMessage({ type: "TX_CHECKER_SEND", payload }, "*");
    }
    return originalRequest.apply(this, args);
  };
})();
