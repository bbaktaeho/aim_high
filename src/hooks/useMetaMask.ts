import { useCallback, useState } from "react";

export interface MetaMaskState {
  account: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  isMetaMaskInstalled: boolean | null;
  isContentScriptReady: boolean;
  isRequestPending: boolean;
}

export const useMetaMask = () => {
  const [state, setState] = useState<MetaMaskState>({
    account: null,
    chainId: null,
    isConnecting: false,
    error: null,
    isMetaMaskInstalled: null,
    isContentScriptReady: false,
    isRequestPending: false,
  });

  // Check if MetaMask content script is ready
  const checkMetaMaskContentScriptReady = useCallback(async (tabId: number): Promise<boolean> => {
    try {
      console.log("🔍 Checking MetaMask content script readiness...");
      const response = await chrome.tabs.sendMessage(tabId, { type: "METAMASK_PING" });
      console.log("📡 MetaMask content script ping response:", response);
      return response?.type === "METAMASK_PONG" && response?.initialized === true;
    } catch (err) {
      console.error("❌ Error checking MetaMask content script:", err);
      return false;
    }
  }, []);

  // Inject MetaMask content script if not ready
  const injectMetaMaskContentScript = useCallback(async (tabId: number) => {
    try {
      console.log("💉 Injecting MetaMask content script...");
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["metamask-content.js"],
      });
      console.log("✅ MetaMask content script injected");
      return true;
    } catch (err) {
      console.error("❌ Error injecting MetaMask content script:", err);
      return false;
    }
  }, []);

  // Initialize MetaMask connection
  const initializeMetaMask = useCallback(async () => {
    console.log("🚀 [useMetaMask] Initializing MetaMask connection...");

    try {
      // Check if user manually disconnected
      const result = await chrome.storage.local.get(["walletDisconnected"]);
      const isManuallyDisconnected = result.walletDisconnected === true;

      if (isManuallyDisconnected) {
        console.log("🔌 User manually disconnected, skipping auto-connection");
        setState((prev) => ({
          ...prev,
          account: null,
          chainId: null,
          isMetaMaskInstalled: true,
          isContentScriptReady: true,
        }));
        return;
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab?.id) {
        console.log("❌ Invalid tab:", currentTab);
        return;
      }

      // Check if MetaMask content script is ready
      let isReady = await checkMetaMaskContentScriptReady(currentTab.id);

      // If not ready, try to inject it
      if (!isReady) {
        console.log("⚠️ MetaMask content script not ready, attempting to inject...");
        const injected = await injectMetaMaskContentScript(currentTab.id);
        if (injected) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          isReady = await checkMetaMaskContentScriptReady(currentTab.id);
        }
      }

      setState((prev) => ({ ...prev, isContentScriptReady: isReady }));
      console.log("📋 Content script ready:", isReady);

      if (isReady) {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          type: "GET_METAMASK_INFO",
        });
        console.log("📨 MetaMask info response:", response);

        if (response.type === "METAMASK_INFO") {
          const ethereumInfo = response.data;
          console.log("🦊 MetaMask info:", ethereumInfo);

          if (!ethereumInfo) {
            setState((prev) => ({
              ...prev,
              error: "MetaMask is not installed or not available",
              isMetaMaskInstalled: false,
            }));
            return;
          }

          setState((prev) => ({ ...prev, isMetaMaskInstalled: ethereumInfo.isMetaMask }));

          if (ethereumInfo.isMetaMask) {
            console.log("🦊 MetaMask detected, ready for user connection");
            // Don't auto-connect during initialization
            // User must explicitly click Connect button
          } else {
            setState((prev) => ({ ...prev, error: "MetaMask is not installed" }));
          }
        }
      } else {
        setState((prev) => ({ ...prev, error: "Failed to initialize content script" }));
      }
    } catch (err) {
      console.error("❌ Error in initializeMetaMask:", err);
      setState((prev) => ({ ...prev, error: "Failed to access MetaMask" }));
    }

    console.log("🏁 [useMetaMask] Initialize MetaMask completed");
  }, [checkMetaMaskContentScriptReady, injectMetaMaskContentScript]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    console.log("🔗 [useMetaMask] Connecting wallet...");

    if (!state.isMetaMaskInstalled) {
      setState((prev) => ({ ...prev, error: "MetaMask is not installed" }));
      return;
    }

    if (!state.isContentScriptReady) {
      setState((prev) => ({ ...prev, error: "Content script not ready" }));
      return;
    }

    if (state.isConnecting || state.isRequestPending) {
      console.log("⚠️ Connection already in progress, skipping...");
      return;
    }

    setState((prev) => ({
      ...prev,
      isConnecting: true,
      isRequestPending: true,
      error: null,
    }));

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab?.id) {
        throw new Error("Invalid tab");
      }

      // Clear disconnected flag when connecting
      await chrome.storage.local.remove(["walletDisconnected"]);

      // Request user approval for connection
      console.log("🔄 Requesting MetaMask connection approval...");
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: "REQUEST_ACCOUNTS",
      });
      console.log("📨 Request accounts response:", response);

      if (response.type === "ACCOUNTS_RESULT") {
        const accounts = response.data;
        if (accounts && accounts.length > 0) {
          // After successful approval, get fresh account and chain info
          const infoResponse = await chrome.tabs.sendMessage(currentTab.id, {
            type: "GET_METAMASK_INFO_WITH_ACCOUNTS",
          });

          if (infoResponse.type === "METAMASK_INFO" && infoResponse.data) {
            const ethereumInfo = infoResponse.data;
            const chainIdNum = ethereumInfo.chainId ? parseInt(ethereumInfo.chainId, 16) : null;

            setState((prev) => ({
              ...prev,
              account: ethereumInfo.selectedAddress || accounts[0],
              chainId: chainIdNum,
            }));

            console.log("✅ Connection approved and account info updated:", {
              account: ethereumInfo.selectedAddress || accounts[0],
              chainId: chainIdNum,
            });
          } else {
            // Fallback if info request fails
            setState((prev) => ({
              ...prev,
              account: accounts[0],
              chainId: null,
            }));
            console.log("✅ Connection approved (fallback):", accounts[0]);
          }
        } else {
          setState((prev) => ({ ...prev, error: "No accounts found" }));
        }
      } else if (response.type === "ACCOUNTS_ERROR") {
        const err = response.error;
        let errorMessage = "Failed to connect to MetaMask";

        if (err.code === 4001) {
          errorMessage = "User rejected the connection request";
        } else if (err.code === -32002) {
          errorMessage = "Connection request already pending. Please check MetaMask popup.";
        } else if (err.message) {
          errorMessage = err.message;
        }

        setState((prev) => ({ ...prev, error: errorMessage }));
        console.log("❌ Connection rejected or failed:", errorMessage);
      }
    } catch (err: any) {
      console.error("❌ MetaMask connection error:", err);
      let errorMessage = "Failed to connect to MetaMask";

      if (err.message?.includes("already pending")) {
        errorMessage = "Connection request is already pending. Please check MetaMask popup.";
      }

      setState((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setState((prev) => ({ ...prev, isConnecting: false }));
      setTimeout(() => {
        setState((prev) => ({ ...prev, isRequestPending: false }));
      }, 1000);
    }
  }, [state.isMetaMaskInstalled, state.isContentScriptReady, state.isConnecting, state.isRequestPending]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    console.log("🔌 [useMetaMask] Disconnecting wallet...");

    try {
      // Set disconnected flag in storage
      await chrome.storage.local.set({ walletDisconnected: true });

      // Clear all wallet-related state
      setState((prev) => ({
        ...prev,
        account: null,
        chainId: null,
        error: null,
        isConnecting: false,
        isRequestPending: false,
      }));

      // Try to send disconnect message to content script (optional)
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];

        if (currentTab?.id && currentTab.url?.startsWith("http")) {
          await chrome.tabs.sendMessage(currentTab.id, {
            type: "DISCONNECT_WALLET",
          });
        }
      } catch (err) {
        // Content script message is optional, don't fail if it doesn't work
        console.log("⚠️ Could not send disconnect message to content script:", err);
      }

      console.log("✅ Wallet disconnected completely");
    } catch (err) {
      console.error("❌ Error disconnecting:", err);
    }
  }, []);

  return {
    ...state,
    initializeMetaMask,
    connectWallet,
    disconnectWallet,
  };
};
