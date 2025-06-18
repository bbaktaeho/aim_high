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

    return new Promise<void>((resolve) => {
      chrome.storage.local.get(["walletAccount", "walletChainId"], (result) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Error loading from storage:", chrome.runtime.lastError);
          setState((prev) => ({
            ...prev,
            isInitializing: false,
          }));
          resolve();
          return;
        }

        if (result.walletAccount) {
          console.log("✅ Found stored wallet:", result.walletAccount, "chainId:", result.walletChainId);
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
        resolve();
      });
    });
  }, []);

  // Storage에 연결 상태 저장
  const saveConnectionStateToStorage = useCallback(async (account: string, chainId: number | null): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set(
          {
            walletAccount: account,
            walletChainId: chainId,
            walletConnectedAt: Date.now(),
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error("❌ Error saving to storage:", chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              console.log("💾 Saved to storage:", { account, chainId });
              resolve();
            }
          }
        );
      } catch (error) {
        console.error("❌ Error saving to storage:", error);
        reject(error);
      }
    });
  }, []);

  // 컴포넌트 마운트 시 저장된 상태 로드
  useEffect(() => {
    loadConnectionStateFromStorage();
  }, [loadConnectionStateFromStorage]);

  // Storage 변경 이벤트 감지 (탭 동기화)
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.walletAccount || changes.walletChainId) {
        const newAccount = changes.walletAccount?.newValue || null;
        const newChainId = changes.walletChainId?.newValue || null;

        // 계정이나 체인 ID 중 하나라도 변경되면 상태 업데이트
        setState((prev) => ({
          ...prev,
          account: newAccount !== undefined ? newAccount : prev.account,
          chainId: newChainId !== undefined ? newChainId : prev.chainId,
        }));

        console.log("🔄 State synced from storage:", {
          account: newAccount !== undefined ? newAccount : "unchanged",
          chainId: newChainId !== undefined ? newChainId : "unchanged",
        });
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
        console.log("✅ Account received:", account);

        // 체인 정보 가져오기 - 반드시 성공할 때까지 재시도
        let chainId = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries && chainId === null) {
          try {
            console.log(`🔗 Attempting to get chain info (attempt ${retryCount + 1}/${maxRetries})`);

            const infoResponse = await chrome.tabs.sendMessage(currentTab.id, {
              type: "GET_METAMASK_INFO_WITH_ACCOUNTS",
            });

            console.log("🔗 Raw MetaMask info response:", infoResponse);

            if (infoResponse?.data?.chainId) {
              const rawChainId = infoResponse.data.chainId;
              console.log("🔗 Raw chainId from MetaMask:", rawChainId, typeof rawChainId);

              // Convert hex string to decimal number
              chainId = parseInt(rawChainId, 16);
              console.log("🔗 Converted chainId:", chainId, typeof chainId);
              break; // 성공하면 루프 종료
            } else {
              console.warn("❌ No chainId in response, retrying...");
            }
          } catch (e) {
            console.warn("❌ Failed to get chain info:", e);
          }

          retryCount++;
          if (retryCount < maxRetries) {
            // 재시도 전 잠시 대기
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        if (chainId === null) {
          console.error("❌ Failed to get chainId after all retries");
        }

        console.log("📦 Final connection data:", { account, chainId });

        // Storage에 먼저 저장 (동기적으로 완료 대기)
        await saveConnectionStateToStorage(account, chainId);
        console.log("💾 Storage save completed");

        // 그 다음 상태 업데이트
        setState((prev) => ({
          ...prev,
          account,
          chainId,
          isConnecting: false,
          isRequestPending: false,
          error: null,
        }));

        console.log("✅ Connection successful and state updated:", { account, chainId });
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
