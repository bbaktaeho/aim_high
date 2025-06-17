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

  // Storage에서 연결 상태 로드 - 단순화
  const loadConnectionStateFromStorage = useCallback(async () => {
    console.log("📦 Loading connection state from storage...");

    try {
      const result = await chrome.storage.local.get(["walletAccount", "walletChainId"]);

      if (result.walletAccount) {
        console.log("✅ Found stored wallet:", result.walletAccount);
        setState((prev) => ({
          ...prev,
          account: result.walletAccount,
          chainId: result.walletChainId || null,
          isInitializing: false,
          error: null,
        }));
      } else {
        console.log("🆕 No stored connection found");
        setState((prev) => ({
          ...prev,
          isInitializing: false,
        }));
      }
    } catch (error) {
      console.error("❌ Error loading from storage:", error);
      setState((prev) => ({
        ...prev,
        isInitializing: false,
      }));
    }
  }, []);

  // Storage에 연결 상태 저장
  const saveConnectionStateToStorage = useCallback(async (account: string, chainId: number | null) => {
    try {
      await chrome.storage.local.set({
        walletAccount: account,
        walletChainId: chainId,
        walletConnectedAt: Date.now(),
      });
      console.log("💾 Saved to storage:", { account, chainId });
    } catch (error) {
      console.error("❌ Error saving to storage:", error);
    }
  }, []);

  // 컴포넌트 마운트 시 저장된 상태 로드
  useEffect(() => {
    loadConnectionStateFromStorage();
  }, [loadConnectionStateFromStorage]);

  // Storage 변경 이벤트 감지 (탭 동기화)
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.walletAccount) {
        const newAccount = changes.walletAccount.newValue || null;
        const newChainId = changes.walletChainId?.newValue || null;

        setState((prev) => ({
          ...prev,
          account: newAccount,
          chainId: newChainId,
        }));

        console.log("🔄 State synced from storage:", { account: newAccount, chainId: newChainId });
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Content script 확인 및 주입
  const ensureContentScript = useCallback(async (): Promise<boolean> => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab?.id) {
        throw new Error("No active tab");
      }

      // Content script 확인
      try {
        const response = await chrome.tabs.sendMessage(currentTab.id, { type: "METAMASK_PING" });
        if (response?.type === "METAMASK_PONG") {
          console.log("✅ Content script ready");
          return true;
        }
      } catch (e) {
        console.log("📡 Content script not ready, injecting...");
      }

      // Content script 주입
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ["metamask-content.js"],
      });

      // 주입 후 확인
      await new Promise((resolve) => setTimeout(resolve, 500));
      const response = await chrome.tabs.sendMessage(currentTab.id, { type: "METAMASK_PING" });

      return response?.type === "METAMASK_PONG";
    } catch (error) {
      console.error("❌ Content script error:", error);
      return false;
    }
  }, []);

  // MetaMask 초기화 - 단순화
  const initializeMetaMask = useCallback(async () => {
    console.log("🚀 Initializing MetaMask...");

    try {
      // Content script 준비
      const isReady = await ensureContentScript();

      if (!isReady) {
        setState((prev) => ({
          ...prev,
          isMetaMaskInstalled: false,
          isContentScriptReady: false,
          error: "Content script initialization failed",
        }));
        return;
      }

      setState((prev) => ({ ...prev, isContentScriptReady: true }));

      // MetaMask 설치 확인
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab?.id) {
        try {
          const response = await chrome.tabs.sendMessage(currentTab.id, {
            type: "GET_METAMASK_INFO",
          });

          const isInstalled = response?.data?.isMetaMask === true;
          setState((prev) => ({ ...prev, isMetaMaskInstalled: isInstalled }));

          console.log("🦊 MetaMask installed:", isInstalled);
        } catch (error) {
          console.log("⚠️ Could not check MetaMask installation");
          setState((prev) => ({ ...prev, isMetaMaskInstalled: false }));
        }
      }
    } catch (error) {
      console.error("❌ MetaMask initialization error:", error);
      setState((prev) => ({
        ...prev,
        error: "MetaMask initialization failed",
        isMetaMaskInstalled: false,
        isContentScriptReady: false,
      }));
    }
  }, [ensureContentScript]);

  // 지갑 연결 - 핵심 로직만 유지
  const connectWallet = useCallback(async () => {
    console.log("🔗 [connectWallet] Starting connection...");

    // 중복 실행 방지
    if (state.isConnecting || state.isRequestPending) {
      console.log("⚠️ Already connecting, skipping...");
      return;
    }

    // MetaMask 설치 확인
    if (!state.isMetaMaskInstalled) {
      setState((prev) => ({ ...prev, error: "MetaMask is not installed" }));
      return;
    }

    // 연결 상태 설정
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
        throw new Error("No active tab");
      }

      console.log("📞 Requesting MetaMask accounts...");

      // MetaMask 계정 요청
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: "REQUEST_ACCOUNTS",
      });

      console.log("📨 MetaMask response:", response);

      if (response?.type === "ACCOUNTS_RESULT" && response.data?.length > 0) {
        const account = response.data[0];

        // 체인 정보 가져오기
        let chainId = null;
        try {
          const infoResponse = await chrome.tabs.sendMessage(currentTab.id, {
            type: "GET_METAMASK_INFO_WITH_ACCOUNTS",
          });

          if (infoResponse?.data?.chainId) {
            chainId = parseInt(infoResponse.data.chainId, 16);
          }
        } catch (e) {
          console.warn("Could not get chain info");
        }

        // 상태 업데이트
        setState((prev) => ({
          ...prev,
          account,
          chainId,
          isConnecting: false,
          isRequestPending: false,
          error: null,
        }));

        // Storage에 저장
        await saveConnectionStateToStorage(account, chainId);

        console.log("✅ Connection successful:", { account, chainId });
      } else if (response?.type === "ACCOUNTS_ERROR") {
        const error = response.error;
        let errorMessage = "Connection failed";

        if (error?.code === 4001) {
          errorMessage = "사용자가 연결을 거부했습니다.";
        } else if (error?.message?.includes("locked")) {
          errorMessage = "unlock_required";
        }

        setState((prev) => ({
          ...prev,
          error: errorMessage,
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
    } catch (error: any) {
      console.error("❌ Connection error:", error);

      let errorMessage = "unlock_required";
      if (error.message?.includes("timeout")) {
        errorMessage = "연결 시간이 초과되었습니다. 다시 시도해주세요.";
      }

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isConnecting: false,
        isRequestPending: false,
      }));
    }
  }, [state.isConnecting, state.isRequestPending, state.isMetaMaskInstalled, saveConnectionStateToStorage]);

  // 지갑 연결 해제
  const disconnectWallet = useCallback(async () => {
    console.log("🔌 Disconnecting wallet...");

    try {
      // Storage 완전 삭제
      await chrome.storage.local.remove(["walletAccount", "walletChainId", "walletConnectedAt"]);

      // 상태 초기화
      setState((prev) => ({
        ...prev,
        account: null,
        chainId: null,
        error: null,
        isConnecting: false,
        isRequestPending: false,
      }));

      console.log("✅ Wallet disconnected");
    } catch (error) {
      console.error("❌ Disconnect error:", error);
    }
  }, []);

  return {
    ...state,
    initializeMetaMask,
    connectWallet,
    disconnectWallet,
  };
};
