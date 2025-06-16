import { useCallback, useEffect, useState } from "react";

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

  // Storage에서 연결 상태 로드
  const loadConnectionStateFromStorage = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get(["walletAccount", "walletChainId", "walletDisconnected"]);

      if (result.walletDisconnected) {
        // 수동으로 연결 해제한 경우
        setState((prev) => ({
          ...prev,
          account: null,
          chainId: null,
        }));
        console.log("🔌 Loaded disconnected state from storage");
      } else if (result.walletAccount) {
        // 연결된 상태가 저장되어 있는 경우
        setState((prev) => ({
          ...prev,
          account: result.walletAccount,
          chainId: result.walletChainId || null,
        }));
        console.log("✅ Loaded connection state from storage:", {
          account: result.walletAccount,
          chainId: result.walletChainId,
        });
      }
    } catch (error) {
      console.error("❌ Error loading connection state from storage:", error);
    }
  }, []);

  // Storage에 연결 상태 저장
  const saveConnectionStateToStorage = useCallback(async (account: string | null, chainId: number | null) => {
    try {
      if (account) {
        await chrome.storage.local.set({
          walletAccount: account,
          walletChainId: chainId,
          walletDisconnected: false,
        });
        console.log("💾 Saved connection state to storage:", { account, chainId });
      } else {
        await chrome.storage.local.set({
          walletAccount: null,
          walletChainId: null,
          walletDisconnected: true,
        });
        console.log("💾 Saved disconnected state to storage");
      }
    } catch (error) {
      console.error("❌ Error saving connection state to storage:", error);
    }
  }, []);

  // Storage 변경 이벤트 감지 (다른 탭에서 상태 변경 시)
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === "local") {
        let shouldUpdate = false;
        let newAccount = state.account;
        let newChainId = state.chainId;

        // 계정 변경 감지
        if (changes.walletAccount) {
          newAccount = changes.walletAccount.newValue || null;
          shouldUpdate = true;
          console.log("🔄 Account changed in storage:", newAccount);
        }

        // 체인 변경 감지
        if (changes.walletChainId) {
          newChainId = changes.walletChainId.newValue || null;
          shouldUpdate = true;
          console.log("🔄 ChainId changed in storage:", newChainId);
        }

        // 연결 해제 감지
        if (changes.walletDisconnected) {
          const isDisconnected = changes.walletDisconnected.newValue;
          if (isDisconnected) {
            newAccount = null;
            newChainId = null;
            shouldUpdate = true;
            console.log("🔄 Disconnected in storage");
          }
        }

        // 상태 업데이트
        if (shouldUpdate) {
          setState((prev) => ({
            ...prev,
            account: newAccount,
            chainId: newChainId,
          }));
          console.log("🔄 Updated state from storage sync:", { account: newAccount, chainId: newChainId });
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [state.account, state.chainId]);

  // 컴포넌트 마운트 시 저장된 상태 로드
  useEffect(() => {
    loadConnectionStateFromStorage();
  }, [loadConnectionStateFromStorage]);

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
      // 먼저 storage에서 상태 로드
      await loadConnectionStateFromStorage();

      // Check if user manually disconnected
      const result = await chrome.storage.local.get(["walletDisconnected"]);
      const isManuallyDisconnected = result.walletDisconnected === true;

      if (isManuallyDisconnected) {
        console.log("🔌 User manually disconnected, skipping auto-connection");
        setState((prev) => ({
          ...prev,
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
        // 먼저 기본 MetaMask 정보 확인
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
            console.log("🦊 MetaMask detected, checking existing connection...");

            // 이미 연결된 계정이 있는지 확인
            try {
              const accountsResponse = await chrome.tabs.sendMessage(currentTab.id, {
                type: "GET_METAMASK_INFO_WITH_ACCOUNTS",
              });

              if (accountsResponse.type === "METAMASK_INFO" && accountsResponse.data) {
                const detailedInfo = accountsResponse.data;

                // 이미 연결된 계정이 있으면 자동으로 로드
                if (detailedInfo.selectedAddress) {
                  const chainIdNum = detailedInfo.chainId ? parseInt(detailedInfo.chainId, 16) : null;

                  setState((prev) => ({
                    ...prev,
                    account: detailedInfo.selectedAddress,
                    chainId: chainIdNum,
                  }));

                  // Storage에 저장
                  await saveConnectionStateToStorage(detailedInfo.selectedAddress, chainIdNum);

                  console.log("✅ Auto-loaded existing connection:", {
                    account: detailedInfo.selectedAddress,
                    chainId: chainIdNum,
                  });
                } else {
                  console.log("🔗 No existing connection found, user needs to connect manually");
                }
              }
            } catch (accountsError) {
              console.log("ℹ️ No existing accounts accessible (user needs to connect):", accountsError);
              // 이는 정상적인 경우 - 사용자가 아직 연결하지 않았음
            }
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
  }, [
    checkMetaMaskContentScriptReady,
    injectMetaMaskContentScript,
    loadConnectionStateFromStorage,
    saveConnectionStateToStorage,
  ]);

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

            const finalAccount = ethereumInfo.selectedAddress || accounts[0];

            setState((prev) => ({
              ...prev,
              account: finalAccount,
              chainId: chainIdNum,
            }));

            // Storage에 저장
            await saveConnectionStateToStorage(finalAccount, chainIdNum);

            console.log("✅ Connection approved and account info updated:", {
              account: finalAccount,
              chainId: chainIdNum,
            });
          } else {
            // Fallback if info request fails
            setState((prev) => ({
              ...prev,
              account: accounts[0],
              chainId: null,
            }));

            // Storage에 저장 (fallback)
            await saveConnectionStateToStorage(accounts[0], null);

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
  }, [
    state.isMetaMaskInstalled,
    state.isContentScriptReady,
    state.isConnecting,
    state.isRequestPending,
    saveConnectionStateToStorage,
  ]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    console.log("🔌 [useMetaMask] Disconnecting wallet...");

    try {
      // Storage에 연결 해제 상태 저장
      await saveConnectionStateToStorage(null, null);

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
  }, [saveConnectionStateToStorage]);

  return {
    ...state,
    initializeMetaMask,
    connectWallet,
    disconnectWallet,
  };
};
