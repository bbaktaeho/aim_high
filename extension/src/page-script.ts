// This script runs in the context of the webpage
declare global {
  interface Window {
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

// Function to get MetaMask info
export function getMetaMaskInfo() {
  const ethereum = window.ethereum;
  if (!ethereum) return null;

  return {
    isMetaMask: ethereum.isMetaMask ?? false,
    networkVersion: ethereum.networkVersion,
    selectedAddress: ethereum.selectedAddress,
    chainId: ethereum.chainId,
    isConnected: ethereum.isConnected(),
  };
}

// Function to request accounts
export async function requestAccounts() {
  return window.ethereum?.request({ method: "eth_requestAccounts" });
}

// Function to disconnect wallet
export function disconnectWallet() {
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
        result = getMetaMaskInfo();
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
