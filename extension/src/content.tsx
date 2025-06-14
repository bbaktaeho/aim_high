let isEnabled = false;
let selectedText = "";
let selectionRange: Range | null = null;
let isInitialized = false;

// Declare global UI elements
let floatingButton: HTMLButtonElement;
let popupBox: HTMLDivElement;
let popupContent: HTMLDivElement;

// Token pagination state
let tokenPaginationState: {
  [key: string]: {
    cursor?: string;
    hasMore: boolean;
    allTokens: any[];
    totalCount?: number;
  };
} = {};
// Tron asset (TRC-10) pagination state
let assetPaginationState: {
  [key: string]: {
    cursor?: string;
    hasMore: boolean;
    allAssets: any[];
    totalCount?: number;
  };
} = {};

// Account analysis function
const analyzeAccount = async (address: string, contentDiv: HTMLDivElement) => {
  try {
    // Show loading state
    contentDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; color: #6B7280;">
        <div style="width: 16px; height: 16px; border: 2px solid #E5E7EB; border-top: 2px solid #10B981; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        Analyzing account...
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    // Get API key from storage
    const result = await chrome.storage.local.get(["apiKey"]);
    const apiKey = result.apiKey;

    if (!apiKey) {
      contentDiv.innerHTML = `
        <div style="color: #EF4444; font-weight: 500;">
          ❌ API Key not found
        </div>
        <div style="color: #6B7280; font-size: 12px; margin-top: 4px;">
          Please set your Nodit API key in the extension popup.
        </div>
      `;
      return;
    }

    // 1. 주소 형식 확인
    let addressType = "";
    let activeNetworks: Array<{ protocol: string; network: string }> = [];

    if (address.startsWith("T") && address.length === 34) {
      addressType = "tron";
      activeNetworks = [{ protocol: "tron", network: "mainnet" }];
    } else if (address.startsWith("0x") && address.length === 42) {
      addressType = "evm";
      // EVM 멀티체인 목록 (Nodit 지원 체인)
      const evmChains = [
        { protocol: "ethereum", network: "mainnet" },
        { protocol: "polygon", network: "mainnet" },
        { protocol: "arbitrum", network: "mainnet" },
        { protocol: "base", network: "mainnet" },
        { protocol: "optimism", network: "mainnet" },
        { protocol: "kaia", network: "mainnet" },
      ];

      // 2. EVM 주소라면 각 체인에서 getAccountStats 먼저 호출하여 활성 체인 확인
      contentDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; color: #6B7280;">
          <div style="width: 16px; height: 16px; border: 2px solid #E5E7EB; border-top: 2px solid #10B981; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          Checking networks...
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;

      const accountStatsPromises = evmChains.map((chain) =>
        callNoditAPI(
          chain.protocol,
          chain.network,
          "getAccountStats",
          { account: address },
          apiKey
        )
          .then((result) => {
            console.log(
              `✅ ${chain.protocol}-${chain.network} getAccountStats success:`,
              result
            );
            return { ...chain, result, hasActivity: true };
          })
          .catch((error) => {
            console.log(
              `❌ ${chain.protocol}-${chain.network} getAccountStats failed:`,
              error
            );
            return { ...chain, result: null, hasActivity: false };
          })
      );

      const accountStatsResults = await Promise.all(accountStatsPromises);
      console.log("📊 All account stats results:", accountStatsResults);

      // 3. 활동이 있는 체인만 필터링 (더 관대한 조건)
      activeNetworks = accountStatsResults.filter((chain) => {
        if (!chain.result) return false;

        // API 호출이 성공했고 데이터가 있는지 확인
        if (chain.result.items) {
          const stats = chain.result.items;
          // 어떤 활동이라도 있으면 포함 (더 관대한 조건)
          const hasActivity =
            (stats.transactionCounts &&
              (stats.transactionCounts.external > 0 ||
                stats.transactionCounts.internal > 0)) ||
            (stats.transferCounts &&
              (stats.transferCounts.tokens > 0 ||
                stats.transferCounts.nfts > 0 ||
                stats.transferCounts.native > 0)) ||
            (stats.assets &&
              (stats.assets.tokens > 0 || stats.assets.nfts > 0)) ||
            // 네이티브 잔고가 있어도 포함
            (stats.balances &&
              stats.balances.native &&
              parseFloat(stats.balances.native) > 0);

          console.log(`🔍 ${chain.protocol}-${chain.network} activity check:`, {
            stats,
            hasActivity,
          });

          return hasActivity;
        }

        // API 호출은 성공했지만 데이터가 없는 경우도 포함 (주소가 유효할 수 있음)
        console.log(
          `⚠️ ${chain.protocol}-${chain.network} API success but no items`
        );
        return true;
      });

      console.log("🔍 Active networks found:", activeNetworks);

      if (activeNetworks.length === 0) {
        contentDiv.innerHTML = `
          <div style="color: #6B7280; text-align: center; padding: 20px;">
            <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
            <div style="font-weight: 500; margin-bottom: 4px;">No Activity Found</div>
            <div style="font-size: 12px;">This address has no recorded activity on supported networks.</div>
          </div>
        `;
        return;
      }
    } else {
      contentDiv.innerHTML = `
        <div style="color: #EF4444; font-weight: 500;">
          ❌ Invalid Address Format
        </div>
        <div style="color: #6B7280; font-size: 12px; margin-top: 4px;">
          Please select a valid Ethereum (0x...) or Tron (T...) address.
        </div>
      `;
      return;
    }

    // 활성 네트워크에 대해서만 상세 분석 수행
    contentDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; color: #6B7280;">
        <div style="width: 16px; height: 16px; border: 2px solid #E5E7EB; border-top: 2px solid #10B981; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        Analyzing ${activeNetworks.length} active network${
      activeNetworks.length > 1 ? "s" : ""
    }...
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    // 각 활성 네트워크에 대해 상세 정보 수집
    const networkAnalysisPromises = activeNetworks.map(async (network) => {
      let promises: Promise<any>[] = [
        callNoditAPI(
          network.protocol,
          network.network,
          "getAccountStats",
          { account: address },
          apiKey
        ),
        callNoditAPI(
          network.protocol,
          network.network,
          "getTokensOwnedByAccount",
          { account: address, rpp: 10, withCount: true },
          apiKey
        ),
        callNoditAPI(
          network.protocol,
          network.network,
          "getNativeBalanceByAccount",
          { account: address },
          apiKey
        ),
        callNoditAPI(
          network.protocol,
          network.network,
          "getTotalTransactionCountByAccount",
          { account: address },
          apiKey
        ),
      ];

      // Tron의 경우 TRC-10 에셋도 함께 조회
      if (network.protocol === "tron") {
        promises.push(
          callNoditAPI(
            network.protocol,
            network.network,
            "getAssetsOwnedByAccount",
            { account: address, rpp: 10, withCount: true },
            apiKey
          )
        );
      }

      // 이더리움 메인넷의 경우 ENS도 함께 조회
      if (network.protocol === "ethereum" && network.network === "mainnet") {
        promises.push(
          callNoditAPI(
            network.protocol,
            network.network,
            "getEnsNameByAddress",
            { account: address },
            apiKey
          )
        );
      }

      const results = await Promise.allSettled(promises);

      // 결과를 명시적으로 인덱스로 처리
      const accountStatsResult = results[0];
      const tokenBalancesResult = results[1];
      const nativeBalanceResult = results[2];
      const transactionCountResult = results[3];

      let assetBalancesResult = null;
      let ensResult = null;

      // Tron의 경우 TRC-10 에셋 결과 처리
      if (network.protocol === "tron") {
        assetBalancesResult = results[4];
        // 이더리움 메인넷이면서 Tron인 경우는 없으므로 ENS는 처리하지 않음
      }

      // 이더리움 메인넷의 경우 ENS 결과 처리
      if (network.protocol === "ethereum" && network.network === "mainnet") {
        ensResult = results[4]; // Tron이 아닌 이더리움 메인넷의 경우
        console.log(
          `🏷️ ENS result for ${network.protocol}-${network.network}:`,
          ensResult
        );
      }

      const networkKey = `${network.protocol}-${network.network}`;

      // 토큰 페이지네이션 상태 초기화
      if (
        tokenBalancesResult.status === "fulfilled" &&
        tokenBalancesResult.value
      ) {
        const tokenData = tokenBalancesResult.value;
        tokenPaginationState[networkKey] = {
          cursor: tokenData.cursor,
          hasMore: !!tokenData.cursor,
          allTokens: tokenData.items || [],
          totalCount: tokenData.count,
        };
      }

      // Tron TRC-10 에셋 페이지네이션 상태 초기화
      if (
        network.protocol === "tron" &&
        assetBalancesResult &&
        assetBalancesResult.status === "fulfilled" &&
        assetBalancesResult.value
      ) {
        const assetData = assetBalancesResult.value;
        assetPaginationState[networkKey] = {
          cursor: assetData.cursor,
          hasMore: !!assetData.cursor,
          allAssets: assetData.items || [],
          totalCount: assetData.count,
        };
      }

      return {
        ...network,
        accountStats:
          accountStatsResult.status === "fulfilled"
            ? accountStatsResult.value
            : null,
        tokenBalances:
          tokenBalancesResult.status === "fulfilled"
            ? tokenBalancesResult.value
            : null,
        assetBalances:
          network.protocol === "tron" &&
          assetBalancesResult &&
          assetBalancesResult.status === "fulfilled"
            ? assetBalancesResult.value
            : null,
        nativeBalance:
          nativeBalanceResult.status === "fulfilled"
            ? nativeBalanceResult.value
            : null,
        transactionCount:
          transactionCountResult.status === "fulfilled"
            ? transactionCountResult.value
            : null,
        ensName:
          network.protocol === "ethereum" &&
          network.network === "mainnet" &&
          ensResult &&
          ensResult.status === "fulfilled"
            ? ensResult.value
            : null,
      };
    });

    const networkAnalysisResults = await Promise.all(networkAnalysisPromises);
    console.log("🎯 Final network analysis results:", networkAnalysisResults);

    // 트랜잭션 카운트가 있는 네트워크만 필터링
    const networksWithTransactions = networkAnalysisResults.filter(
      (network) => {
        const transactionCount = network.transactionCount?.transactionCount;
        const hasTransactions = transactionCount && transactionCount > 0;

        console.log(
          `🔍 ${network.protocol}-${network.network} transaction check:`,
          {
            transactionCount,
            hasTransactions,
          }
        );

        return hasTransactions;
      }
    );

    console.log("🎯 Networks with transactions:", networksWithTransactions);

    if (networksWithTransactions.length === 0) {
      contentDiv.innerHTML = `
        <div style="color: #6B7280; text-align: center; padding: 20px;">
          <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
          <div style="font-weight: 500; margin-bottom: 4px;">No Transaction History</div>
          <div style="font-size: 12px;">This address has no recorded transactions on supported networks.</div>
        </div>
      `;
      return;
    }

    // 멀티체인 분석 결과 렌더링
    renderMultiChainAnalysis(contentDiv, {
      address,
      addressType,
      networks: networksWithTransactions,
    });
  } catch (error) {
    console.error("Error analyzing account:", error);
    contentDiv.innerHTML = `
      <div style="color: #EF4444; font-weight: 500;">
        ❌ Analysis failed
      </div>
      <div style="color: #6B7280; font-size: 12px; margin-top: 4px;">
        ${error instanceof Error ? error.message : "Unknown error occurred"}
      </div>
    `;
  }
};

// Function to load more tokens for a specific network
const loadMoreTokens = async (
  address: string,
  protocol: string,
  network: string,
  apiKey: string
) => {
  const networkKey = `${protocol}-${network}`;
  const paginationState = tokenPaginationState[networkKey];

  if (!paginationState || !paginationState.hasMore) {
    return null;
  }

  try {
    const result = await callNoditAPI(
      protocol,
      network,
      "getTokensOwnedByAccount",
      {
        account: address,
        rpp: 10,
        cursor: paginationState.cursor,
        withCount: true,
      },
      apiKey
    );

    if (result && result.items) {
      // 새로운 토큰들을 기존 목록에 추가
      paginationState.allTokens.push(...result.items);
      paginationState.cursor = result.cursor;
      paginationState.hasMore = !!result.cursor;

      return result.items;
    }

    return null;
  } catch (error) {
    console.error("Error loading more tokens:", error);
    return null;
  }
};

// Function to load more assets (TRC-10) for Tron network
const loadMoreAssets = async (
  address: string,
  protocol: string,
  network: string,
  apiKey: string
) => {
  const networkKey = `${protocol}-${network}`;
  const paginationState = assetPaginationState[networkKey];

  if (!paginationState || !paginationState.hasMore) {
    return null;
  }

  try {
    const result = await callNoditAPI(
      protocol,
      network,
      "getAssetsOwnedByAccount",
      {
        account: address,
        rpp: 10,
        cursor: paginationState.cursor,
        withCount: true,
      },
      apiKey
    );

    if (result && result.items) {
      // 새로운 에셋들을 기존 목록에 추가
      paginationState.allAssets.push(...result.items);
      paginationState.cursor = result.cursor;
      paginationState.hasMore = !!result.cursor;

      return result.items;
    }

    return null;
  } catch (error) {
    console.error("Error loading more assets:", error);
    return null;
  }
};

// Helper function to call Nodit API
const callNoditAPI = async (
  protocol: string,
  network: string,
  operationId: string,
  requestBody: any,
  apiKey: string
) => {
  // API 경로 매핑
  const apiPaths: { [key: string]: string } = {
    getAccountStats: "stats/getAccountStats",
    getTokensOwnedByAccount: "token/getTokensOwnedByAccount",
    getAssetsOwnedByAccount: "asset/getAssetsOwnedByAccount",
    getNativeBalanceByAccount: "native/getNativeBalanceByAccount",
    getTotalTransactionCountByAccount:
      "blockchain/getTotalTransactionCountByAccount",
    getEnsNameByAddress: "ens/getEnsNameByAddress",
  };

  const apiPath = apiPaths[operationId];
  if (!apiPath) {
    throw new Error(`Unknown operation: ${operationId}`);
  }

  // 요청 파라미터 변환 (API 스펙에 맞게)
  let transformedBody = requestBody;
  if (operationId === "getAccountStats") {
    transformedBody = { address: requestBody.account };
  } else if (operationId === "getTokensOwnedByAccount") {
    transformedBody = {
      accountAddress: requestBody.account,
      rpp: requestBody.rpp || 10,
      ...(requestBody.cursor && { cursor: requestBody.cursor }),
      ...(requestBody.withCount !== undefined && {
        withCount: requestBody.withCount,
      }),
    };
  } else if (operationId === "getAssetsOwnedByAccount") {
    transformedBody = {
      accountAddress: requestBody.account,
      rpp: requestBody.rpp || 10,
      ...(requestBody.cursor && { cursor: requestBody.cursor }),
      ...(requestBody.withCount !== undefined && {
        withCount: requestBody.withCount,
      }),
    };
  } else if (operationId === "getNativeBalanceByAccount") {
    transformedBody = { accountAddress: requestBody.account };
  } else if (operationId === "getTotalTransactionCountByAccount") {
    transformedBody = { accountAddress: requestBody.account };
  } else if (operationId === "getEnsNameByAddress") {
    transformedBody = { address: requestBody.account };
  }

  const url = `https://web3.nodit.io/v1/${protocol}/${network}/${apiPath}`;
  console.log(`🌐 API Call: ${operationId} to ${url}`, transformedBody);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify(transformedBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `❌ API call failed: ${operationId} to ${protocol}/${network}`,
      {
        status: response.status,
        statusText: response.statusText,
        errorText,
      }
    );
    throw new Error(
      `API call failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const result = await response.json();
  console.log(
    `✅ API Response: ${operationId} from ${protocol}/${network}`,
    result
  );
  return result;
};

// Function to render multi-chain analysis results
const renderMultiChainAnalysis = (contentDiv: HTMLDivElement, data: any) => {
  const { address, addressType, networks } = data;

  // Nodit 시그니처 컬러 (브랜드 컬러)
  const noditPrimary = "#10B981"; // Nodit 메인 컬러 (Emerald Green)
  const noditSecondary = "#059669"; // Nodit 보조 컬러 (Dark Green)
  const noditAccent = "#34D399"; // Nodit 액센트 컬러 (Light Green)

  // 네트워크별 색상 매핑
  const networkColors: { [key: string]: string } = {
    ethereum: "#627EEA",
    polygon: "#8247E5",
    arbitrum: "#28A0F0",
    base: "#0052FF",
    optimism: "#FF0420",
    kaia: "#FF6B35",
    tron: "#FF060A",
  };

  // 요약 정보 계산
  const totalTransactions = networks.reduce((sum: number, network: any) => {
    return sum + (network.transactionCount?.transactionCount || 0);
  }, 0);

  const totalTokenTypes = networks.reduce((sum: number, network: any) => {
    const networkKey = `${network.protocol}-${network.network}`;
    const tokenPaginationState_network = tokenPaginationState[networkKey];
    const assetPaginationState_network = assetPaginationState[networkKey];

    let tokenCount =
      tokenPaginationState_network?.totalCount ||
      network.tokenBalances?.items?.length ||
      0;
    let assetCount = 0;

    // Tron의 경우 TRC-10 에셋도 포함
    if (network.protocol === "tron") {
      assetCount =
        assetPaginationState_network?.totalCount ||
        network.assetBalances?.items?.length ||
        0;
    }

    return sum + tokenCount + assetCount;
  }, 0);

  // 이더리움 메인넷에서 ENS 정보 찾기
  const ethereumMainnet = networks.find(
    (network: any) =>
      network.protocol === "ethereum" && network.network === "mainnet"
  );
  const ensName = ethereumMainnet?.ensName?.name || null;

  console.log("🏷️ ENS Debug Info:", {
    ethereumMainnet,
    ensName,
    ensData: ethereumMainnet?.ensName,
  });

  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <!-- Header Section with Nodit Branding -->
      <div style="background: linear-gradient(135deg, ${noditPrimary} 0%, ${noditSecondary} 100%); color: white; padding: 20px; margin: -20px -20px 20px -20px; border-radius: 12px 12px 0 0;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">
            🔍
          </div>
          <div>
            <div style="font-weight: 700; font-size: 18px; margin-bottom: 2px;">Multi-Chain Analysis</div>
            <div style="font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">${addressType} Address • ${
    networks.length
  } Active Network${networks.length > 1 ? "s" : ""}</div>
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; font-family: 'SF Mono', Monaco, monospace; font-size: 13px; word-break: break-all; line-height: 1.4;">
          ${address}
          ${
            ensName
              ? `<div style="margin-top: 8px; padding: 6px 10px; background: rgba(255,255,255,0.2); border-radius: 6px; font-size: 12px; font-weight: 600; display: inline-block;">
            🏷️ ${ensName}
          </div>`
              : ""
          }
        </div>
        
        <!-- Quick Stats -->
        <div style="display: flex; gap: 16px; margin-top: 16px;">
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; margin-bottom: 2px;">${totalTransactions.toLocaleString()}</div>
            <div style="font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Total Transactions</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; margin-bottom: 2px;">${totalTokenTypes}</div>
            <div style="font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Token Types</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; margin-bottom: 2px;">${
              networks.length
            }</div>
            <div style="font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Active Chains</div>
          </div>
        </div>
      </div>

      <!-- Networks Section -->
      <div style="display: flex; flex-direction: column; gap: 16px;">
  `;

  // 각 네트워크별 정보 표시
  networks.forEach((network: any, index: number) => {
    const {
      protocol,
      network: networkName,
      accountStats,
      tokenBalances,
      assetBalances,
      nativeBalance,
      transactionCount,
    } = network;
    const networkColor = networkColors[protocol] || "#6B7280";
    const networkKey = `${protocol}-${networkName}`;
    const paginationState = tokenPaginationState[networkKey];
    const allTokens = paginationState?.allTokens || tokenBalances?.items || [];

    html += `
      <div style="border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; overflow: hidden; background: white; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);">
        <!-- Network Header -->
        <div style="background: ${networkColor}; color: white; padding: 16px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;">
              ${protocol.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 16px; text-transform: capitalize;">${protocol}</div>
              <div style="font-size: 11px; opacity: 0.8; text-transform: uppercase;">${networkName}</div>
            </div>
          </div>
          ${
            transactionCount && transactionCount.transactionCount !== undefined
              ? `<div style="text-align: right;">
              <div style="font-size: 20px; font-weight: 700;">${transactionCount.transactionCount.toLocaleString()}</div>
              <div style="font-size: 10px; opacity: 0.8;">TRANSACTIONS</div>
            </div>`
              : ""
          }
        </div>

        <!-- Network Details -->
        <div style="padding: 16px;">
          <div style="display: grid; grid-template-columns: ${
            protocol === "ethereum" &&
            networkName === "mainnet" &&
            network.ensName?.name
              ? "1fr 1fr 1fr"
              : "1fr 1fr"
          }; gap: 16px;">
    `;

    // 네이티브 잔고
    if (nativeBalance && nativeBalance.balance !== undefined) {
      let displayBalance = "0";
      let symbol = protocol.toUpperCase();

      if (protocol === "tron") {
        displayBalance = (parseFloat(nativeBalance.balance) / 1000000).toFixed(
          4
        );
        symbol = "TRX";
      } else {
        displayBalance = (
          parseFloat(nativeBalance.balance) / Math.pow(10, 18)
        ).toFixed(4);
        if (protocol === "ethereum") symbol = "ETH";
        else if (protocol === "polygon") symbol = "MATIC";
        else if (protocol === "arbitrum") symbol = "ETH";
        else if (protocol === "base") symbol = "ETH";
        else if (protocol === "optimism") symbol = "ETH";
        else if (protocol === "kaia") symbol = "KAIA";
      }

      html += `
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%); padding: 12px; border-radius: 8px; border-left: 4px solid ${networkColor}; border: 1px solid rgba(16, 185, 129, 0.1);">
          <div style="font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Native Balance</div>
          <div style="font-size: 18px; font-weight: 700; color: #1E293B;">${displayBalance}</div>
          <div style="font-size: 12px; color: #64748B; font-weight: 500;">${symbol}</div>
        </div>
      `;
    }

    // 토큰 보유량 (Tron의 경우 TRC-20 + TRC-10)
    const tokenCount =
      paginationState?.totalCount || tokenBalances?.items?.length || 0;
    const assetCount =
      protocol === "tron"
        ? assetPaginationState[networkKey]?.totalCount ||
          assetBalances?.items?.length ||
          0
        : 0;
    const totalTokenCount = tokenCount + assetCount;

    if (totalTokenCount > 0) {
      html += `
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%); padding: 12px; border-radius: 8px; border-left: 4px solid ${networkColor}; border: 1px solid rgba(16, 185, 129, 0.1);">
          <div style="font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Token Holdings</div>
          <div style="font-size: 18px; font-weight: 700; color: #1E293B;">${totalTokenCount}</div>
          <div style="font-size: 12px; color: #64748B; font-weight: 500;">Token Types${
            protocol === "tron"
              ? ` (TRC-20: ${tokenCount}, TRC-10: ${assetCount})`
              : ""
          }</div>
        </div>
      `;
    } else {
      html += `
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%); padding: 12px; border-radius: 8px; border-left: 4px solid rgba(16, 185, 129, 0.3); border: 1px solid rgba(16, 185, 129, 0.1);">
          <div style="font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Token Holdings</div>
          <div style="font-size: 18px; font-weight: 700; color: #94A3B8;">0</div>
          <div style="font-size: 12px; color: #64748B; font-weight: 500;">Token Types</div>
        </div>
      `;
    }

    // 이더리움 메인넷의 경우 ENS 정보 표시
    if (
      protocol === "ethereum" &&
      networkName === "mainnet" &&
      network.ensName
    ) {
      const ensData = network.ensName;
      if (ensData.name) {
        html += `
          <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%); padding: 12px; border-radius: 8px; border-left: 4px solid ${networkColor}; border: 1px solid rgba(16, 185, 129, 0.1);">
            <div style="font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">ENS Domain</div>
            <div style="font-size: 18px; font-weight: 700; color: #1E293B; display: flex; align-items: center; gap: 8px;">
              🏷️ ${ensData.name}
            </div>
            ${
              ensData.expiryDate
                ? `<div style="font-size: 12px; color: #64748B; font-weight: 500;">Expires: ${new Date(
                    ensData.expiryDate
                  ).toLocaleDateString()}</div>`
                : ""
            }
          </div>
        `;
      }
    }

    html += `
          </div>
    `;

    // 토큰/에셋 리스트 표시
    if (totalTokenCount > 0) {
      if (protocol === "tron") {
        // Tron의 경우 TRC-20과 TRC-10 탭으로 분리
        const allAssets =
          assetPaginationState[networkKey]?.allAssets ||
          assetBalances?.items ||
          [];

        html += `
          <div style="margin-top: 16px;">
            <!-- Tab Headers -->
            <div style="display: flex; border-bottom: 2px solid #F1F5F9; margin-bottom: 12px;">
              <button 
                class="tab-button" 
                data-tab="trc20" 
                data-network-key="${networkKey}"
                style="flex: 1; padding: 8px 12px; border: none; background: none; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; color: #10B981; border-bottom: 2px solid #10B981;"
              >
                TRC-20 (${tokenCount})
              </button>
              <button 
                class="tab-button" 
                data-tab="trc10" 
                data-network-key="${networkKey}"
                style="flex: 1; padding: 8px 12px; border: none; background: none; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; color: #64748B; border-bottom: 2px solid transparent;"
              >
                TRC-10 (${assetCount})
              </button>
            </div>
            
            <!-- TRC-20 Tab Content -->
            <div id="trc20-tab-${networkKey}" class="tab-content" style="display: block;">
        `;

        if (allTokens.length > 0) {
          const displayTokens = allTokens.slice(0, 10);
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="font-size: 12px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">TRC-20 Tokens</div>
              <div class="showing-count-trc20" style="font-size: 10px; color: #9CA3AF;">Showing ${Math.min(
                allTokens.length,
                10
              )} of ${tokenCount}</div>
            </div>
            <div id="token-list-${networkKey}" style="display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto;">
          `;

          html += renderTokenItems(displayTokens, 0);

          html += `
            </div>
          `;

          // TRC-20 More tokens 버튼
          if (paginationState?.hasMore) {
            html += `
              <div style="margin-top: 12px; text-align: center;">
                <button 
                  id="load-more-btn-${networkKey}"
                  class="load-more-tokens-btn"
                  data-address="${address}"
                  data-protocol="${protocol}"
                  data-network="${networkName}"
                  data-network-key="${networkKey}"
                  data-token-type="trc20"
                  style="background: linear-gradient(135deg, ${noditPrimary} 0%, ${noditSecondary} 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.5px;"
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                >
                  Load More TRC-20
                </button>
              </div>
            `;
          }
        } else {
          html += `
            <div style="text-align: center; padding: 20px; color: #64748B;">
              <div style="font-size: 14px;">No TRC-20 tokens found</div>
            </div>
          `;
        }

        html += `
            </div>
            
            <!-- TRC-10 Tab Content -->
            <div id="trc10-tab-${networkKey}" class="tab-content" style="display: none;">
        `;

        if (allAssets.length > 0) {
          const displayAssets = allAssets.slice(0, 10);
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="font-size: 12px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">TRC-10 Assets</div>
              <div class="showing-count-trc10" style="font-size: 10px; color: #9CA3AF;">Showing ${Math.min(
                allAssets.length,
                10
              )} of ${assetCount}</div>
            </div>
            <div id="asset-list-${networkKey}" style="display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto;">
          `;

          html += renderAssetItems(displayAssets, 0);

          html += `
            </div>
          `;

          // TRC-10 More assets 버튼
          if (assetPaginationState[networkKey]?.hasMore) {
            html += `
              <div style="margin-top: 12px; text-align: center;">
                <button 
                  id="load-more-assets-btn-${networkKey}"
                  class="load-more-assets-btn"
                  data-address="${address}"
                  data-protocol="${protocol}"
                  data-network="${networkName}"
                  data-network-key="${networkKey}"
                  data-token-type="trc10"
                  style="background: linear-gradient(135deg, ${noditPrimary} 0%, ${noditSecondary} 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.5px;"
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                >
                  Load More TRC-10
                </button>
              </div>
            `;
          }
        } else {
          html += `
            <div style="text-align: center; padding: 20px; color: #64748B;">
              <div style="font-size: 14px;">No TRC-10 assets found</div>
            </div>
          `;
        }

        html += `
            </div>
          </div>
        `;
      } else {
        // 다른 네트워크는 기존 방식 유지
        const displayTokens = allTokens.slice(0, 10);
        const totalTokenCount = paginationState?.totalCount || allTokens.length;
        html += `
          <div style="margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="font-size: 12px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Token Holdings</div>
              <div class="showing-count" style="font-size: 10px; color: #9CA3AF;">Showing ${Math.min(
                allTokens.length,
                10
              )} of ${totalTokenCount}</div>
            </div>
            <div id="token-list-${networkKey}" style="display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto;">
        `;

        html += renderTokenItems(displayTokens, 0);

        html += `
            </div>
        `;

        // More tokens 버튼
        if (paginationState?.hasMore) {
          html += `
            <div style="margin-top: 12px; text-align: center;">
              <button 
                id="load-more-btn-${networkKey}"
                class="load-more-tokens-btn"
                data-address="${address}"
                data-protocol="${protocol}"
                data-network="${networkName}"
                data-network-key="${networkKey}"
                style="background: linear-gradient(135deg, ${noditPrimary} 0%, ${noditSecondary} 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.5px;"
                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
              >
                Load More Tokens
              </button>
            </div>
          `;
        }

        html += `
          </div>
        `;
      }
    }

    html += `
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  contentDiv.innerHTML = html;

  // Add event listeners for tab buttons (Tron only)
  const tabButtons = contentDiv.querySelectorAll(".tab-button");
  tabButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const btn = event.target as HTMLButtonElement;
      const tab = btn.getAttribute("data-tab")!;
      const networkKey = btn.getAttribute("data-network-key")!;

      // Update tab button styles
      const allTabButtons = contentDiv.querySelectorAll(
        `[data-network-key="${networkKey}"].tab-button`
      );
      allTabButtons.forEach((tabBtn) => {
        (tabBtn as HTMLElement).style.color = "#64748B";
        (tabBtn as HTMLElement).style.borderBottom = "2px solid transparent";
      });

      btn.style.color = "#10B981";
      btn.style.borderBottom = "2px solid #10B981";

      // Show/hide tab content
      const trc20Tab = contentDiv.querySelector(`#trc20-tab-${networkKey}`);
      const trc10Tab = contentDiv.querySelector(`#trc10-tab-${networkKey}`);

      if (tab === "trc20") {
        if (trc20Tab) (trc20Tab as HTMLElement).style.display = "block";
        if (trc10Tab) (trc10Tab as HTMLElement).style.display = "none";
      } else if (tab === "trc10") {
        if (trc20Tab) (trc20Tab as HTMLElement).style.display = "none";
        if (trc10Tab) (trc10Tab as HTMLElement).style.display = "block";
      }
    });
  });

  // Add event listeners for "Load More Tokens" buttons
  const loadMoreButtons = contentDiv.querySelectorAll(".load-more-tokens-btn");
  loadMoreButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      const btn = event.target as HTMLButtonElement;
      const address = btn.getAttribute("data-address")!;
      const protocol = btn.getAttribute("data-protocol")!;
      const network = btn.getAttribute("data-network")!;
      const networkKey = btn.getAttribute("data-network-key")!;

      await handleLoadMoreTokens(address, protocol, network, networkKey, btn);
    });
  });

  // Add event listeners for "Load More Assets" buttons (TRC-10)
  const loadMoreAssetButtons = contentDiv.querySelectorAll(
    ".load-more-assets-btn"
  );
  loadMoreAssetButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      const btn = event.target as HTMLButtonElement;
      const address = btn.getAttribute("data-address")!;
      const protocol = btn.getAttribute("data-protocol")!;
      const network = btn.getAttribute("data-network")!;
      const networkKey = btn.getAttribute("data-network-key")!;

      await handleLoadMoreAssets(address, protocol, network, networkKey, btn);
    });
  });
};

// Function to render token items HTML
const renderTokenItems = (tokens: any[], startIndex: number = 0) => {
  return tokens
    .map((token: any, index: number) => {
      const balance = parseFloat(token.balance || "0");
      const decimals = parseInt(token.contract?.decimals || "18");
      const displayBalance = (balance / Math.pow(10, decimals)).toFixed(4);
      const symbol = token.contract?.symbol || "Unknown";
      const name = token.contract?.name || "Unknown Token";
      const tokenIndex = startIndex + index;

      return `
      <div style="background: white; border: 1px solid rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(16, 185, 129, 0.05);">
        <div style="flex: 1;">
          <div style="font-size: 13px; font-weight: 600; color: #1E293B; margin-bottom: 2px;">${symbol}</div>
          <div style="font-size: 11px; color: #64748B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; font-weight: 600; color: #1E293B;">${displayBalance}</div>
          <div style="font-size: 10px; color: #64748B;">#${tokenIndex + 1}</div>
        </div>
      </div>
    `;
    })
    .join("");
};

// Function to render asset (TRC-10) items HTML
const renderAssetItems = (assets: any[], startIndex: number = 0) => {
  return assets
    .map((asset: any, index: number) => {
      const balance = parseFloat(asset.balance || "0");
      const decimals = parseInt(asset.asset?.decimals || "0");
      const displayBalance =
        decimals > 0
          ? (balance / Math.pow(10, decimals)).toFixed(4)
          : balance.toString();
      const symbol = asset.asset?.symbol || "Unknown";
      const name = asset.asset?.name || "Unknown Asset";
      const assetId = asset.asset?.id || "N/A";
      const assetIndex = startIndex + index;

      return `
      <div style="background: white; border: 1px solid rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(16, 185, 129, 0.05);">
        <div style="flex: 1;">
          <div style="font-size: 13px; font-weight: 600; color: #1E293B; margin-bottom: 2px;">${symbol}</div>
          <div style="font-size: 11px; color: #64748B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</div>
          <div style="font-size: 10px; color: #9CA3AF;">ID: ${assetId}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; font-weight: 600; color: #1E293B;">${displayBalance}</div>
          <div style="font-size: 10px; color: #64748B;">#${assetIndex + 1}</div>
        </div>
      </div>
    `;
    })
    .join("");
};

// Function to handle loading more tokens
const handleLoadMoreTokens = async (
  address: string,
  protocol: string,
  network: string,
  networkKey: string,
  button: HTMLButtonElement
) => {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(["apiKey"]);
    const apiKey = result.apiKey;

    if (!apiKey) {
      console.error("API key not found");
      return;
    }

    // Show loading state on button
    const originalText = button.textContent;
    button.textContent = "Loading...";
    button.disabled = true;
    button.style.opacity = "0.6";

    // Load more tokens
    const newTokens = await loadMoreTokens(address, protocol, network, apiKey);

    if (newTokens && newTokens.length > 0) {
      // Update only the token list, not the entire popup
      const tokenListElement = document.getElementById(
        `token-list-${networkKey}`
      );
      const paginationState = tokenPaginationState[networkKey];

      if (tokenListElement && paginationState) {
        // Get current token count before adding new ones
        const currentTokenCount =
          paginationState.allTokens.length - newTokens.length;

        // Add new token items to the existing list
        const newTokensHTML = renderTokenItems(newTokens, currentTokenCount);
        tokenListElement.insertAdjacentHTML("beforeend", newTokensHTML);

        // Update the showing count (for Tron, use TRC-20 specific class)
        const showingElement = tokenListElement.parentElement?.querySelector(
          protocol === "tron" ? ".showing-count-trc20" : ".showing-count"
        );
        if (showingElement && paginationState.totalCount) {
          const currentShowing = paginationState.allTokens.length;
          showingElement.textContent = `Showing ${currentShowing} of ${paginationState.totalCount}`;
        }

        // Update button state
        if (paginationState.hasMore) {
          button.textContent = originalText;
          button.disabled = false;
          button.style.opacity = "1";
        } else {
          button.textContent = "No More Tokens";
          button.disabled = true;
          button.style.opacity = "0.4";
        }
      }
    } else {
      // No more tokens available
      button.textContent = "No More Tokens";
      button.disabled = true;
      button.style.opacity = "0.4";
    }
  } catch (error) {
    console.error("Error loading more tokens:", error);
    button.textContent = "Error - Try Again";
    button.disabled = false;
    button.style.opacity = "1";
  }
};

// Function to handle loading more assets (TRC-10)
const handleLoadMoreAssets = async (
  address: string,
  protocol: string,
  network: string,
  networkKey: string,
  button: HTMLButtonElement
) => {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(["apiKey"]);
    const apiKey = result.apiKey;

    if (!apiKey) {
      console.error("API key not found");
      return;
    }

    // Show loading state on button
    const originalText = button.textContent;
    button.textContent = "Loading...";
    button.disabled = true;
    button.style.opacity = "0.6";

    // Load more assets
    const newAssets = await loadMoreAssets(address, protocol, network, apiKey);

    if (newAssets && newAssets.length > 0) {
      // Update only the asset list, not the entire popup
      const assetListElement = document.getElementById(
        `asset-list-${networkKey}`
      );
      const paginationState = assetPaginationState[networkKey];

      if (assetListElement && paginationState) {
        // Get current asset count before adding new ones
        const currentAssetCount =
          paginationState.allAssets.length - newAssets.length;

        // Add new asset items to the existing list
        const newAssetsHTML = renderAssetItems(newAssets, currentAssetCount);
        assetListElement.insertAdjacentHTML("beforeend", newAssetsHTML);

        // Update the showing count
        const showingElement = assetListElement.parentElement?.querySelector(
          ".showing-count-trc10"
        );
        if (showingElement && paginationState.totalCount) {
          const currentShowing = paginationState.allAssets.length;
          showingElement.textContent = `Showing ${currentShowing} of ${paginationState.totalCount}`;
        }

        // Update button state
        if (paginationState.hasMore) {
          button.textContent = originalText;
          button.disabled = false;
          button.style.opacity = "1";
        } else {
          button.textContent = "No More Assets";
          button.disabled = true;
          button.style.opacity = "0.4";
        }
      }
    } else {
      // No more assets available
      button.textContent = "No More Assets";
      button.disabled = true;
      button.style.opacity = "0.4";
    }
  } catch (error) {
    console.error("Error loading more assets:", error);
    button.textContent = "Error - Try Again";
    button.disabled = false;
    button.style.opacity = "1";
  }
};

// Common styles
const styles = {
  floatingButton: {
    position: "fixed",
    display: "none",
    padding: "10px 20px",
    backgroundColor: "#10B981",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    zIndex: 10000,
    fontSize: "14px",
    fontWeight: "500",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
    transition: "all 0.2s ease",
    transform: "translate(-50%, 0)", // Center horizontally
    "&:hover": {
      backgroundColor: "#059669",
      boxShadow: "0 4px 6px rgba(16, 185, 129, 0.3)",
    },
  },
  popupBox: {
    position: "fixed",
    display: "none",
    padding: "0",
    backgroundColor: "#FFFFFF",
    border: "2px solid #10B981",
    borderRadius: "12px",
    boxShadow:
      "0 10px 25px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(16, 185, 129, 0.1)",
    zIndex: 10001,
    maxWidth: "500px",
    minWidth: "380px",
    maxHeight: "500px",
    fontSize: "14px",
    lineHeight: "1.5",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: "#1A1A1A",
    boxSizing: "border-box",
    overflowY: "auto",
    backdropFilter: "blur(10px)",
  },
  popupContent: {
    padding: "20px",
    margin: "0",
  },

  popupContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
};

// Create floating button element
const createFloatingButton = () => {
  const button = document.createElement("button");
  Object.assign(button.style, styles.floatingButton);
  button.textContent = "Account Analyze";

  // Add hover effect
  button.addEventListener("mouseover", () => {
    button.style.backgroundColor = "#059669";
    button.style.boxShadow = "0 4px 6px rgba(16, 185, 129, 0.3)";
  });

  button.addEventListener("mouseout", () => {
    button.style.backgroundColor = "#10B981";
    button.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.2)";
  });

  return button;
};

// Create popup box element
const createPopupBox = () => {
  const container = document.createElement("div");
  Object.assign(container.style, styles.popupBox);

  const contentDiv = document.createElement("div");
  Object.assign(contentDiv.style, styles.popupContent);
  container.appendChild(contentDiv);

  // 분석 버튼은 제거 - 바로 분석 결과를 표시
  return { container, contentDiv };
};

// Initialize content script
const initializeContentScript = () => {
  console.log("Initializing content script...");

  // Load extension state from storage
  chrome.storage.local.get(["isEnabled"], (result) => {
    console.log("Content script loaded extension state:", result);
    isEnabled = result.isEnabled ?? false;
    console.log("Nodit Supporter enabled:", isEnabled);
  });

  // Inject page script
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page-script.js");
  script.onload = () => {
    console.log("Page script loaded");
    script.remove();
    isInitialized = true;
  };
  script.onerror = (error) => {
    console.error("Failed to load page script:", error);
  };
  (document.head || document.documentElement).appendChild(script);

  // Create and append UI elements
  floatingButton = createFloatingButton();
  const popupElements = createPopupBox();
  popupBox = popupElements.container;
  popupContent = popupElements.contentDiv;

  document.body.appendChild(floatingButton);
  document.body.appendChild(popupBox);

  // 드래그 후 텍스트 선택 시 floatingButton 표시
  document.addEventListener("mouseup", (event) => {
    if (!isEnabled) {
      floatingButton.style.display = "none";
      popupBox.style.display = "none";
      return;
    }
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      // 이더리움 주소: 0x + 40자리 16진수, 트론 주소: T로 시작 34자리
      const ethRegex = /^0x[a-fA-F0-9]{40}$/;
      const tronRegex = /^T[a-zA-Z0-9]{33}$/;
      if (ethRegex.test(text) || tronRegex.test(text)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        // floatingButton 위치 조정
        floatingButton.style.left = `${
          rect.left + rect.width / 2 + window.scrollX
        }px`;
        floatingButton.style.top = `${rect.bottom + 8 + window.scrollY}px`;
        floatingButton.style.display = "block";
        selectedText = text;
        selectionRange = range;
      } else {
        floatingButton.style.display = "none";
        popupBox.style.display = "none";
      }
    } else {
      floatingButton.style.display = "none";
      popupBox.style.display = "none";
    }
  });

  // floatingButton 클릭 시 바로 분석 실행
  floatingButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (selectedText && selectionRange) {
      const rect = selectionRange.getBoundingClientRect();

      // Calculate popup position to avoid going off-screen
      let left = rect.left + window.scrollX;
      let top = rect.bottom + 12 + window.scrollY;

      // Adjust horizontal position if popup would go off-screen
      const popupWidth = 450; // maxWidth from styles
      if (left + popupWidth > window.innerWidth) {
        left = window.innerWidth - popupWidth - 20;
      }
      if (left < 20) {
        left = 20;
      }

      // Adjust vertical position if popup would go off-screen
      const popupHeight = 400; // maxHeight from styles
      if (top + popupHeight > window.innerHeight + window.scrollY) {
        top = rect.top + window.scrollY - popupHeight - 12;
      }

      popupBox.style.left = `${left}px`;
      popupBox.style.top = `${top}px`;
      popupBox.style.display = "block";

      // 바로 계정 분석 실행
      await analyzeAccount(selectedText, popupContent);
    }
  });

  // 바깥 클릭 시 팝업/버튼 숨김
  document.addEventListener("mousedown", (event) => {
    if (
      !floatingButton.contains(event.target as Node) &&
      !popupBox.contains(event.target as Node)
    ) {
      floatingButton.style.display = "none";
      popupBox.style.display = "none";
    }
  });

  // Notify that content script is ready
  console.log("Content script initialized, sending CONTENT_SCRIPT_READY");
  chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_READY" });
};

// Initialize immediately
initializeContentScript();

// Listen for storage changes (다른 탭에서 설정 변경 시 동기화)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.isEnabled) {
    console.log("Extension state changed:", changes.isEnabled);
    isEnabled = changes.isEnabled.newValue ?? false;

    // 상태가 비활성화되면 UI 숨김
    if (!isEnabled && floatingButton && popupBox) {
      floatingButton.style.display = "none";
      popupBox.style.display = "none";
    }
  }
});

// Helper function to send message to page script
const sendMessageToPage = (action: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const messageId = Date.now().toString();

      // Set up message listener
      const messageHandler = (event: MessageEvent) => {
        if (
          event.data?.type === "FROM_PAGE" &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener("message", messageHandler);

          if (event.data.success) {
            resolve(event.data.data);
          } else {
            reject(new Error(event.data.error.message));
          }
        }
      };

      // Add timeout
      const timeout = setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        reject(new Error("Message timeout"));
      }, 10000); // 10 second timeout

      window.addEventListener("message", messageHandler);

      // Send message to page
      window.postMessage(
        {
          type: "FROM_CONTENT_SCRIPT",
          messageId,
          action,
        },
        "*"
      );
    } catch (error) {
      reject(error);
    }
  });
};

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message, "from:", sender);

  if (message.type === "PING") {
    console.log("PING received, sending PONG");
    sendResponse({ type: "PONG", initialized: isInitialized });
    return true;
  }

  if (message.type === "TOGGLE_EXTENSION") {
    console.log("TOGGLE_EXTENSION received:", message.isEnabled);
    isEnabled = message.isEnabled;
    if (!isEnabled && floatingButton && popupBox) {
      floatingButton.style.display = "none";
      popupBox.style.display = "none";
    }
  }

  if (message.type === "GET_METAMASK_INFO") {
    console.log("GET_METAMASK_INFO received");

    sendMessageToPage("GET_METAMASK_INFO")
      .then((ethereumInfo) => {
        console.log("Received ethereum info:", ethereumInfo);
        sendResponse({
          type: "METAMASK_INFO",
          data: ethereumInfo,
        });
      })
      .catch((error) => {
        console.error("Error getting MetaMask info:", error);
        sendResponse({
          type: "METAMASK_INFO",
          data: null,
        });
      });

    return true; // Will respond asynchronously
  }

  if (message.type === "REQUEST_ACCOUNTS") {
    console.log("REQUEST_ACCOUNTS received");

    sendMessageToPage("REQUEST_ACCOUNTS")
      .then((accounts) => {
        console.log("Accounts received:", accounts);
        sendResponse({
          type: "ACCOUNTS_RESULT",
          data: accounts,
        });
      })
      .catch((error) => {
        console.error("Error requesting accounts:", error);
        sendResponse({
          type: "ACCOUNTS_ERROR",
          error: {
            code: error.code,
            message: error.message,
          },
        });
      });

    return true; // Will respond asynchronously
  }

  if (message.type === "DISCONNECT_WALLET") {
    console.log("DISCONNECT_WALLET received");

    sendMessageToPage("DISCONNECT_WALLET")
      .then(() => {
        console.log("Wallet disconnected");
        sendResponse({ type: "DISCONNECTED" });
      })
      .catch((error) => {
        console.error("Error disconnecting wallet:", error);
        sendResponse({ type: "DISCONNECTED" }); // Still send success even if there's an error
      });

    return true; // Will respond asynchronously
  }
});
