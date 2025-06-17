import { useCallback, useEffect, useState } from "react";

export interface MetaMaskState {
  account: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  isMetaMaskInstalled: boolean | null;
  isContentScriptReady: boolean;
  isRequestPending: boolean;
  isInitializing: boolean;
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
    isInitializing: true,
  });

  // Storage에서 연결 상태 로드
  const loadConnectionStateFromStorage = useCallback(async () => {
    console.log("📦 [loadConnectionStateFromStorage] Starting to load connection state from storage...");

    try {
      const result = await chrome.storage.local.get(["walletAccount", "walletChainId"]);
      console.log("📦 [loadConnectionStateFromStorage] Raw storage result:", result);

      if (result.walletAccount) {
        // 연결된 상태가 저장되어 있는 경우 - 이 정보는 고정됩니다
        console.log("✅ [loadConnectionStateFromStorage] Found stored wallet data:", {
          account: result.walletAccount,
          chainId: result.walletChainId,
        });

        setState((prev) => {
          console.log("🔄 [loadConnectionStateFromStorage] Setting state - Previous:", {
            account: prev.account,
            chainId: prev.chainId,
            isInitializing: prev.isInitializing,
          });

          const newState = {
            ...prev,
            account: result.walletAccount,
            chainId: result.walletChainId || null,
            isInitializing: false, // 로딩 완료
            error: null, // 에러 상태 클리어
          };

          console.log("🔄 [loadConnectionStateFromStorage] Setting state - New:", {
            account: newState.account,
            chainId: newState.chainId,
            isInitializing: newState.isInitializing,
          });

          return newState;
        });

        console.log("✅ [loadConnectionStateFromStorage] CONNECTED state loaded from storage");
      } else {
        // 저장된 연결 상태가 없는 경우
        console.log("🆕 [loadConnectionStateFromStorage] No stored connection state found");

        setState((prev) => ({
          ...prev,
          account: null,
          chainId: null,
          isInitializing: false, // 로딩 완료
          error: null, // 에러 상태 클리어
        }));

        console.log("🆕 [loadConnectionStateFromStorage] DISCONNECTED state set - showing connection UI");
      }
    } catch (error) {
      console.error("❌ [loadConnectionStateFromStorage] Error loading connection state from storage:", error);
      // 에러 발생 시에도 로딩 완료로 설정
      setState((prev) => ({
        ...prev,
        account: null,
        chainId: null,
        isInitializing: false,
        error: null,
      }));
    }

    console.log("🏁 [loadConnectionStateFromStorage] Load connection state completed");
  }, []);

  // Storage에 연결 상태 저장 (모든 탭에서 공유)
  const saveConnectionStateToStorage = useCallback(async (account: string, chainId: number | null) => {
    try {
      await chrome.storage.local.set({
        walletAccount: account,
        walletChainId: chainId,
        walletConnectedAt: Date.now(), // 연결 시간 기록
      });
      console.log("💾 Saved connection state to storage (shared across all tabs):", { account, chainId });
    } catch (error) {
      console.error("❌ Error saving connection state to storage:", error);
    }
  }, []);

  // Storage 변경 이벤트 감지 (다른 탭에서 상태 변경 시 동기화)
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === "local") {
        let shouldUpdate = false;
        let newAccount = state.account;
        let newChainId = state.chainId;

        // 계정 변경 감지 (다른 탭에서 연결/해제 시)
        if (changes.walletAccount) {
          newAccount = changes.walletAccount.newValue || null;
          shouldUpdate = true;
          console.log("🔄 Account changed in storage (from another tab):", newAccount);
        }

        // 체인 변경 감지 (다른 탭에서 연결/해제 시)
        if (changes.walletChainId) {
          newChainId = changes.walletChainId.newValue || null;
          shouldUpdate = true;
          console.log("🔄 ChainId changed in storage (from another tab):", newChainId);
        }

        // 상태 업데이트 (모든 탭에서 동기화)
        if (shouldUpdate) {
          setState((prev) => ({
            ...prev,
            account: newAccount,
            chainId: newChainId,
          }));
          console.log("🔄 Updated state from storage sync (tab synchronization):", {
            account: newAccount,
            chainId: newChainId,
          });
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [state.account, state.chainId]);

  // 컴포넌트 마운트 시 저장된 상태 로드 (initializeMetaMask보다 먼저 실행)
  useEffect(() => {
    const initializeConnection = async () => {
      console.log("🎯 [useMetaMask] Component mounted - loading connection state first");

      // 🔥 Storage에서 연결 상태를 먼저 로드
      await loadConnectionStateFromStorage();

      console.log("✅ [useMetaMask] Connection state loaded from storage");
    };

    initializeConnection();
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

  // Initialize MetaMask connection (메타마스크 자동 연결 제거 - 수동 연결만 허용)
  const initializeMetaMask = useCallback(async () => {
    console.log("🚀 [initializeMetaMask] Starting initialization...");

    try {
      // Storage에서 연결 정보 확인
      const hasExistingConnection = !!state.account;

      if (hasExistingConnection) {
        console.log("✅ [initializeMetaMask] Found existing connection:", state.account);
        setState((prev) => ({
          ...prev,
          isMetaMaskInstalled: true,
          isContentScriptReady: true,
        }));
        return;
      }

      console.log("🔌 [initializeMetaMask] No existing connection, preparing for new connection");

      // 기본 MetaMask 설치 확인
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab?.id) {
        console.log("❌ [initializeMetaMask] Invalid tab");
        return;
      }

      // Content script 준비 상태 확인
      let isReady = await checkMetaMaskContentScriptReady(currentTab.id);

      if (!isReady) {
        console.log("💉 [initializeMetaMask] Injecting MetaMask content script...");
        const injected = await injectMetaMaskContentScript(currentTab.id);
        if (injected) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          isReady = await checkMetaMaskContentScriptReady(currentTab.id);
        }
      }

      setState((prev) => ({ ...prev, isContentScriptReady: isReady }));
      console.log("📋 [initializeMetaMask] Content script ready:", isReady);

      if (isReady) {
        // MetaMask 설치 확인
        try {
          const response = await chrome.tabs.sendMessage(currentTab.id, {
            type: "GET_METAMASK_INFO",
          });

          if (response.type === "METAMASK_INFO") {
            const ethereumInfo = response.data;
            const isInstalled = ethereumInfo && ethereumInfo.isMetaMask;

            setState((prev) => ({ ...prev, isMetaMaskInstalled: isInstalled }));
            console.log("🦊 [initializeMetaMask] MetaMask installed:", isInstalled);
          }
        } catch (err) {
          console.log("⚠️ [initializeMetaMask] Could not check MetaMask info");
          setState((prev) => ({ ...prev, isMetaMaskInstalled: false }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          isMetaMaskInstalled: false,
          error: "Failed to initialize content script",
        }));
      }
    } catch (err) {
      console.error("❌ [initializeMetaMask] Initialization error:", err);
      setState((prev) => ({ ...prev, error: "Failed to initialize MetaMask" }));
    }

    console.log("🏁 [initializeMetaMask] Initialization completed");
  }, [state.account, checkMetaMaskContentScriptReady, injectMetaMaskContentScript]);

  // Connect wallet (연결 시 계정/체인 정보 고정)
  const connectWallet = useCallback(async () => {
    console.log("🔗 [connectWallet] Starting connection...");

    // 🔥 중복 실행 방지 - 가장 먼저 체크
    if (state.isConnecting || state.isRequestPending) {
      console.log("⚠️ [connectWallet] Already connecting, ignoring request");
      return;
    }

    // 기본 검증
    if (!state.isMetaMaskInstalled) {
      console.log("❌ [connectWallet] MetaMask not installed");
      setState((prev) => ({ ...prev, error: "MetaMask is not installed" }));
      return;
    }

    // 🔥 즉시 연결 중 상태로 설정 (중복 방지)
    setState((prev) => ({
      ...prev,
      isConnecting: true,
      isRequestPending: true,
      error: null,
    }));

    console.log("🚀 [connectWallet] Connection state set, proceeding...");

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab?.id) {
        throw new Error("Invalid tab");
      }

      console.log("📋 [connectWallet] Current tab:", currentTab.id);

      // 🔥 간단한 MetaMask 연결 요청 - 복잡한 체크 제거
      console.log("🔄 [connectWallet] Sending connection request to MetaMask...");

      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: "REQUEST_ACCOUNTS",
      });

      console.log("📨 [connectWallet] MetaMask response:", response);

      if (response.type === "ACCOUNTS_RESULT") {
        const accounts = response.data;
        if (accounts && accounts.length > 0) {
          console.log("✅ [connectWallet] Accounts received:", accounts);

          // 기본 정보로 연결
          const finalAccount = accounts[0];
          let chainIdNum = null;

          // 추가 정보 가져오기 (실패해도 계속 진행)
          try {
            const infoResponse = await chrome.tabs.sendMessage(currentTab.id, {
              type: "GET_METAMASK_INFO_WITH_ACCOUNTS",
            });

            if (infoResponse.type === "METAMASK_INFO" && infoResponse.data) {
              const ethereumInfo = infoResponse.data;
              chainIdNum = ethereumInfo.chainId ? parseInt(ethereumInfo.chainId, 16) : null;
              console.log("✅ [connectWallet] Got chain info:", chainIdNum);
            }
          } catch (infoError) {
            console.warn("⚠️ [connectWallet] Could not get chain info, using fallback");
          }

          // 상태 업데이트
          setState((prev) => ({
            ...prev,
            account: finalAccount,
            chainId: chainIdNum,
            isConnecting: false,
            isRequestPending: false,
            error: null,
          }));

          // Storage에 저장
          await saveConnectionStateToStorage(finalAccount, chainIdNum);

          console.log("✅ [connectWallet] Connection successful:", {
            account: finalAccount,
            chainId: chainIdNum,
          });
        } else {
          console.log("❌ [connectWallet] No accounts returned");
          setState((prev) => ({
            ...prev,
            error: "unlock_required",
            isConnecting: false,
            isRequestPending: false,
          }));
        }
      } else if (response.type === "ACCOUNTS_ERROR") {
        const err = response.error;
        console.log("❌ [connectWallet] MetaMask error:", err);

        if (err.code === 4001) {
          setState((prev) => ({
            ...prev,
            error: "사용자가 연결을 거부했습니다.",
            isConnecting: false,
            isRequestPending: false,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            error: "unlock_required",
            isConnecting: false,
            isRequestPending: false,
          }));
        }
      } else {
        console.log("❌ [connectWallet] Unexpected response:", response);
        setState((prev) => ({
          ...prev,
          error: "unlock_required",
          isConnecting: false,
          isRequestPending: false,
        }));
      }
    } catch (err: any) {
      console.error("❌ [connectWallet] Connection error:", err);

      let errorMessage = "unlock_required";
      if (err.message?.includes("timeout")) {
        errorMessage = "MetaMask 응답 시간이 초과되었습니다. 다시 시도해주세요.";
      }

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isConnecting: false,
        isRequestPending: false,
      }));
    }

    console.log("🏁 [connectWallet] Connection attempt completed");
  }, [state.isMetaMaskInstalled, state.isConnecting, state.isRequestPending, saveConnectionStateToStorage]);

  // Disconnect wallet (연결 해제 시에만 상태 변경)
  const disconnectWallet = useCallback(async () => {
    console.log("🔌 [useMetaMask] Disconnecting wallet (will clear FIXED state)...");

    try {
      // 🔥 Storage에서 지갑 관련 정보 완전 삭제 (모든 탭에서 공유)
      await chrome.storage.local.remove(["walletAccount", "walletChainId", "walletDisconnected", "walletConnectedAt"]);
      console.log("🗑️ Completely cleared all wallet data from storage");

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

      console.log("✅ Wallet disconnected completely (ALL storage data cleared from all tabs)");
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
