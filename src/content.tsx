let isEnabled = false;
let selectedText = '';
let selectionRange: Range | null = null;
let isInitialized = false;

// Declare global UI elements
let floatingButton: HTMLButtonElement;
let popupBox: HTMLDivElement;
let popupContent: HTMLDivElement;

// Token pagination state
let tokenPaginationState: { [key: string]: { cursor?: string; hasMore: boolean; allTokens: any[]; totalCount?: number } } = {};
// Tron asset (TRC-10) pagination state
let assetPaginationState: { [key: string]: { cursor?: string; hasMore: boolean; allAssets: any[]; totalCount?: number } } = {};
// Transaction pagination state
let transactionPaginationState: { [key: string]: { cursor?: string; hasMore: boolean; allTransactions: any[]; totalCount?: number } } = {};

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
    const result = await chrome.storage.local.get(['noditApiKey']);
    const apiKey = result.noditApiKey;
    
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
    let addressType = '';
    let activeNetworks: Array<{protocol: string, network: string}> = [];
    
    if (address.startsWith('T') && address.length === 34) {
      addressType = 'tron';
      
      // Tron 주소인 경우 먼저 트랜잭션 개수 확인
      try {
        const tronTransactionCountResult = await callNoditAPI('tron', 'mainnet', 'getTotalTransactionCountByAccount', { account: address }, apiKey);
        const transactionCount = tronTransactionCountResult?.transactionCount || 0;
        
        if (transactionCount > 0) {
          activeNetworks = [{ protocol: 'tron', network: 'mainnet' }];
        } else {
          contentDiv.innerHTML = `
            <div style="color: #6B7280; text-align: center; padding: 20px;">
              <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
              <div style="font-weight: 500; margin-bottom: 4px;">No Transaction History</div>
              <div style="font-size: 12px;">This address has no recorded transactions on Tron network.</div>
            </div>
          `;
          return;
        }
      } catch (error) {
        console.error('Error checking Tron transaction count:', error);
        contentDiv.innerHTML = `
          <div style="color: #EF4444; font-weight: 500;">
            ❌ Failed to check Tron transactions
          </div>
          <div style="color: #6B7280; font-size: 12px; margin-top: 4px;">
            ${error instanceof Error ? error.message : 'Unknown error occurred'}
          </div>
        `;
        return;
      }
    } else if (address.startsWith('0x') && address.length === 42) {
      addressType = 'evm';
      // EVM 멀티체인 목록 (Nodit Data API 지원 체인)
      const evmChains = [
        { protocol: 'ethereum', network: 'mainnet' },
        { protocol: 'polygon', network: 'mainnet' },
        { protocol: 'arbitrum', network: 'mainnet' },
        { protocol: 'base', network: 'mainnet' },
        { protocol: 'optimism', network: 'mainnet' },
        { protocol: 'kaia', network: 'mainnet' },
        { protocol: 'bnb', network: 'mainnet' },
        { protocol: 'chiliz', network: 'mainnet' },
        { protocol: 'ethereumclassic', network: 'mainnet' },
        { protocol: 'giwa', network: 'sepolia' },
        { protocol: 'arc', network: 'testnet' },
      ];
      
      // 2. EVM 주소라면 각 체인에서 getTotalTransactionCountByAccount 먼저 호출하여 활성 체인 확인
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
      
      const transactionCountPromises = evmChains.map(chain => 
        callNoditAPI(chain.protocol, chain.network, 'getTotalTransactionCountByAccount', { account: address }, apiKey)
          .then(result => {
            console.log(`✅ ${chain.protocol}-${chain.network} getTotalTransactionCountByAccount success:`, result);
            const transactionCount = result?.transactionCount || 0;
            return { ...chain, result, transactionCount, hasActivity: transactionCount > 0 };
          })
          .catch(error => {
            console.log(`❌ ${chain.protocol}-${chain.network} getTotalTransactionCountByAccount failed:`, error);
            return { ...chain, result: null, transactionCount: 0, hasActivity: false };
          })
      );
      
      const transactionCountResults = await Promise.all(transactionCountPromises);
      console.log('📊 All transaction count results:', transactionCountResults);
      
      // 3. 트랜잭션이 있는 체인만 필터링
      activeNetworks = transactionCountResults.filter(chain => {
        console.log(`🔍 ${chain.protocol}-${chain.network} transaction check:`, {
          transactionCount: chain.transactionCount,
          hasActivity: chain.hasActivity
        });
        
        return chain.hasActivity;
      });
      
      console.log('🔍 Active networks found:', activeNetworks);
      
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
        Analyzing ${activeNetworks.length} active network${activeNetworks.length > 1 ? 's' : ''}...
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
        callNoditAPI(network.protocol, network.network, 'getTokensOwnedByAccount', { account: address, rpp: 10, withCount: true }, apiKey),
        callNoditAPI(network.protocol, network.network, 'getNativeBalanceByAccount', { account: address }, apiKey),
        callNoditAPI(network.protocol, network.network, 'getTotalTransactionCountByAccount', { account: address }, apiKey),
        callNoditAPI(network.protocol, network.network, 'getTransactionsByAccount', { account: address, rpp: 10 }, apiKey)
      ];

      // Tron의 경우 TRC-10 에셋도 함께 조회
      if (network.protocol === 'tron') {
        promises.push(callNoditAPI(network.protocol, network.network, 'getAssetsOwnedByAccount', { account: address, rpp: 10, withCount: true }, apiKey));
      }

      // 이더리움 메인넷의 경우 ENS도 함께 조회
      if (network.protocol === 'ethereum' && network.network === 'mainnet') {
        promises.push(callNoditAPI(network.protocol, network.network, 'getEnsNameByAddress', { account: address }, apiKey));
      }

      const results = await Promise.allSettled(promises);
      
      // 결과를 명시적으로 인덱스로 처리
      const tokenBalancesResult = results[0];
      const nativeBalanceResult = results[1];
      const transactionCountResult = results[2];
      const recentTransactionsResult = results[3];
      
      let assetBalancesResult = null;
      let ensResult = null;
      
      // Tron의 경우 TRC-10 에셋 결과 처리
      if (network.protocol === 'tron') {
        assetBalancesResult = results[4];
        // 이더리움 메인넷이면서 Tron인 경우는 없으므로 ENS는 처리하지 않음
      }
      
      // 이더리움 메인넷의 경우 ENS 결과 처리
      if (network.protocol === 'ethereum' && network.network === 'mainnet') {
        ensResult = results[promises.length - 1]; // ENS는 마지막 promise
        console.log(`🏷️ ENS result for ${network.protocol}-${network.network}:`, ensResult);
      }

      const networkKey = `${network.protocol}-${network.network}`;
      
      // 토큰 페이지네이션 상태 초기화
      if (tokenBalancesResult.status === 'fulfilled' && tokenBalancesResult.value) {
        const tokenData = tokenBalancesResult.value;
        tokenPaginationState[networkKey] = {
          cursor: tokenData.cursor,
          hasMore: !!tokenData.cursor,
          allTokens: tokenData.items || [],
          totalCount: tokenData.count
        };
      }

      // Tron TRC-10 에셋 페이지네이션 상태 초기화
      if (network.protocol === 'tron' && assetBalancesResult && assetBalancesResult.status === 'fulfilled' && assetBalancesResult.value) {
        const assetData = assetBalancesResult.value;
        assetPaginationState[networkKey] = {
          cursor: assetData.cursor,
          hasMore: !!assetData.cursor,
          allAssets: assetData.items || [],
          totalCount: assetData.count
        };
      }

      // 트랜잭션 페이지네이션 상태 초기화
      if (recentTransactionsResult.status === 'fulfilled' && recentTransactionsResult.value) {
        const transactionData = recentTransactionsResult.value;
        transactionPaginationState[networkKey] = {
          cursor: transactionData.cursor,
          hasMore: !!transactionData.cursor,
          allTransactions: transactionData.items || [],
          totalCount: undefined // 트랜잭션은 보통 totalCount가 없음
        };
      }

      return {
        ...network,
        tokenBalances: tokenBalancesResult.status === 'fulfilled' ? tokenBalancesResult.value : null,
        assetBalances: network.protocol === 'tron' && assetBalancesResult && assetBalancesResult.status === 'fulfilled' ? assetBalancesResult.value : null,
        nativeBalance: nativeBalanceResult.status === 'fulfilled' ? nativeBalanceResult.value : null,
        transactionCount: transactionCountResult.status === 'fulfilled' ? transactionCountResult.value : null,
        recentTransactions: recentTransactionsResult.status === 'fulfilled' ? recentTransactionsResult.value : null,
        ensName: network.protocol === 'ethereum' && network.network === 'mainnet' && ensResult && ensResult.status === 'fulfilled' ? ensResult.value : null
      };
    });

    const networkAnalysisResults = await Promise.all(networkAnalysisPromises);
    console.log('🎯 Final network analysis results:', networkAnalysisResults);

    // 이미 트랜잭션이 있는 네트워크들만 분석했으므로 바로 렌더링
    renderMultiChainAnalysis(contentDiv, {
      address,
      addressType,
      networks: networkAnalysisResults
    });

  } catch (error) {
    console.error('Error analyzing account:', error);
    const isContextInvalidated = error instanceof Error && error.message.includes('Extension context invalidated');
    contentDiv.innerHTML = `
      <div style="color: #EF4444; font-weight: 500;">
        ${isContextInvalidated ? '⚠️ Extension reloaded' : '❌ Analysis failed'}
      </div>
      <div style="color: #6B7280; font-size: 12px; margin-top: 4px;">
        ${isContextInvalidated
          ? 'Please reload this page (Cmd+R / F5) to reconnect the extension.'
          : error instanceof Error ? error.message : 'Unknown error occurred'}
      </div>
    `;
  }
};

// Function to load more tokens for a specific network
const loadMoreTokens = async (address: string, protocol: string, network: string, apiKey: string) => {
  const networkKey = `${protocol}-${network}`;
  const paginationState = tokenPaginationState[networkKey];
  
  if (!paginationState || !paginationState.hasMore) {
    return null;
  }

  try {
    const result = await callNoditAPI(protocol, network, 'getTokensOwnedByAccount', { 
      account: address, 
      rpp: 10,
      cursor: paginationState.cursor,
      withCount: true
    }, apiKey);

    if (result && result.items) {
      // 새로운 토큰들을 기존 목록에 추가
      paginationState.allTokens.push(...result.items);
      paginationState.cursor = result.cursor;
      paginationState.hasMore = !!result.cursor;
      
      return result.items;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading more tokens:', error);
    return null;
  }
};

// Function to load more assets (TRC-10) for Tron network
const loadMoreAssets = async (address: string, protocol: string, network: string, apiKey: string) => {
  const networkKey = `${protocol}-${network}`;
  const paginationState = assetPaginationState[networkKey];
  
  if (!paginationState || !paginationState.hasMore) {
    return null;
  }

  try {
    const result = await callNoditAPI(protocol, network, 'getAssetsOwnedByAccount', { 
      account: address, 
      rpp: 10,
      cursor: paginationState.cursor,
      withCount: true
    }, apiKey);

    if (result && result.items) {
      // 새로운 에셋들을 기존 목록에 추가
      paginationState.allAssets.push(...result.items);
      paginationState.cursor = result.cursor;
      paginationState.hasMore = !!result.cursor;
      
      return result.items;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading more assets:', error);
    return null;
  }
};

// Function to load more transactions for a specific network
const loadMoreTransactions = async (address: string, protocol: string, network: string, apiKey: string) => {
  const networkKey = `${protocol}-${network}`;
  const paginationState = transactionPaginationState[networkKey];
  
  if (!paginationState || !paginationState.hasMore) {
    return null;
  }

  try {
    const result = await callNoditAPI(protocol, network, 'getTransactionsByAccount', { 
      account: address, 
      rpp: 10,
      cursor: paginationState.cursor
    }, apiKey);

    if (result && result.items) {
      // 새로운 트랜잭션들을 기존 목록에 추가
      paginationState.allTransactions.push(...result.items);
      paginationState.cursor = result.cursor;
      paginationState.hasMore = !!result.cursor;
      
      return result.items;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading more transactions:', error);
    return null;
  }
};

// Helper function to call Nodit API
const callNoditAPI = async (protocol: string, network: string, operationId: string, requestBody: any, apiKey: string) => {
  // API 경로 매핑
  const apiPaths: { [key: string]: string } = {
    'getTokensOwnedByAccount': 'token/getTokensOwnedByAccount',
    'getAssetsOwnedByAccount': 'asset/getAssetsOwnedByAccount',
    'getNativeBalanceByAccount': 'native/getNativeBalanceByAccount',
    'getTotalTransactionCountByAccount': 'blockchain/getTotalTransactionCountByAccount',
    'getTransactionsByAccount': 'blockchain/getTransactionsByAccount',
    'getEnsNameByAddress': 'ens/getEnsNameByAddress'
  };

  const apiPath = apiPaths[operationId];
  if (!apiPath) {
    throw new Error(`Unknown operation: ${operationId}`);
  }

  // 요청 파라미터 변환 (API 스펙에 맞게)
  let transformedBody = requestBody;
  if (operationId === 'getTokensOwnedByAccount') {
    transformedBody = { 
      accountAddress: requestBody.account,
      rpp: requestBody.rpp || 10,
      ...(requestBody.cursor && { cursor: requestBody.cursor }),
      ...(requestBody.withCount !== undefined && { withCount: requestBody.withCount })
    };
  } else if (operationId === 'getAssetsOwnedByAccount') {
    transformedBody = { 
      accountAddress: requestBody.account,
      rpp: requestBody.rpp || 10,
      ...(requestBody.cursor && { cursor: requestBody.cursor }),
      ...(requestBody.withCount !== undefined && { withCount: requestBody.withCount })
    };
  } else if (operationId === 'getNativeBalanceByAccount') {
    transformedBody = { accountAddress: requestBody.account };
  } else if (operationId === 'getTotalTransactionCountByAccount') {
    transformedBody = { accountAddress: requestBody.account };
  } else if (operationId === 'getTransactionsByAccount') {
    transformedBody = { 
      accountAddress: requestBody.account,
      rpp: requestBody.rpp || 10,
      ...(requestBody.cursor && { cursor: requestBody.cursor }),
      withCount: false,
      withLogs: false,
      withDecode: true
    };
  } else if (operationId === 'getEnsNameByAddress') {
    transformedBody = { address: requestBody.account };
  }

  const url = `https://web3.nodit.io/v1/${protocol}/${network}/${apiPath}`;
  console.log(`🌐 API Call: ${operationId} to ${url}`, transformedBody);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify(transformedBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API call failed: ${operationId} to ${protocol}/${network}`, {
      status: response.status,
      statusText: response.statusText,
      errorText
    });
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ API Response: ${operationId} from ${protocol}/${network}`, result);
  return result;
};

// Function to render multi-chain analysis results
const renderMultiChainAnalysis = (contentDiv: HTMLDivElement, data: any) => {
  const { address, addressType, networks } = data;
  
  // Professional color scheme inspired by the CSS example
  const primaryColor = '#00ffab'; // Mint green accent
  const backgroundColor = '#111'; // Dark background
  const cardColor = '#222'; // Card background
  const borderColor = '#444'; // Border color
  const textSecondary = '#aaa'; // Secondary text
  const textPrimary = '#fff'; // Primary text
  
  // 네트워크별 색상 매핑
  const networkColors: { [key: string]: string } = {
    'ethereum': '#627EEA',
    'polygon': '#8247E5',
    'arbitrum': '#28A0F0',
    'base': '#0052FF',
    'optimism': '#FF0420',
    'kaia': '#FF6B35',
    'tron': '#FF060A',
    'bnb': '#F3BA2F',
    'chiliz': '#CD0124',
    'ethereumclassic': '#328432',
    'giwa': '#6C63FF',
    'arc': '#00C2FF',
  };

  // 네트워크별 아이콘
  const networkIcons: { [key: string]: string } = {
    'ethereum': '⟠',
    'polygon': '⬟',
    'arbitrum': '◆',
    'base': '🔷',
    'optimism': '○',
    'kaia': '🟡',
    'tron': '🔴',
    'bnb': '🟨',
    'chiliz': '🌶️',
    'ethereumclassic': '💚',
    'giwa': '🔮',
    'arc': '🔵',
  };

  // 요약 정보 계산
  const totalTransactions = networks.reduce((sum: number, network: any) => {
    return sum + (network.transactionCount?.transactionCount || 0);
  }, 0);

  const totalTokenTypes = networks.reduce((sum: number, network: any) => {
    const networkKey = `${network.protocol}-${network.network}`;
    const tokenPaginationState_network = tokenPaginationState[networkKey];
    const assetPaginationState_network = assetPaginationState[networkKey];
    
    let tokenCount = tokenPaginationState_network?.totalCount || network.tokenBalances?.items?.length || 0;
    let assetCount = 0;
    
    // Tron의 경우 TRC-10 에셋도 포함
    if (network.protocol === 'tron') {
      assetCount = assetPaginationState_network?.totalCount || network.assetBalances?.items?.length || 0;
    }
    
    return sum + tokenCount + assetCount;
  }, 0);

  // 이더리움 메인넷에서 ENS 정보 찾기
  const ethereumMainnet = networks.find((network: any) => network.protocol === 'ethereum' && network.network === 'mainnet');
  const ensName = ethereumMainnet?.ensName?.name || null;
  
  console.log('🏷️ ENS Debug Info:', {
    ethereumMainnet,
    ensName,
    ensData: ethereumMainnet?.ensName
  });

  let html = `
    <div style="
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${backgroundColor};
      color: ${textPrimary};
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      max-width: 480px;
      margin: 20px auto;
      min-height: auto;
    ">
      <!-- Header Section -->
      <header style="
        position: relative;
        background: #1a1a1a;
        padding: 20px;
        border-bottom: 1px solid ${borderColor};
      ">
        <h2 style="
          margin: 0;
          font-size: 22px;
          font-weight: 700;
        ">Multi-Chain Analysis</h2>
        <p style="
          margin: 6px 0 0;
          color: #8fe7b7;
          font-size: 15px;
        ">
          <span style="color: ${primaryColor};">${addressType.toUpperCase()} 주소</span> - ${networks.length}개의 활성 네트워크가 감지되었습니다.
        </p>
      </header>

      <!-- Address Info Section -->
      <section style="padding: 20px; margin-bottom: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 17px;">분석 대상 주소</h3>
        <div style="
          background: #0fc18c;
          color: #000;
          padding: 12px;
          border-radius: 12px;
          font-size: 14px;
          margin-top: 8px;
          word-break: break-all;
          text-align: center;
          font-family: 'SF Mono', Monaco, monospace;
          font-weight: 600;
        ">${address}</div>
        
        ${ensName ? `
          <div style="
            background: rgba(0, 255, 171, 0.15);
            color: ${primaryColor};
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            margin-top: 8px;
            text-align: center;
            font-weight: 600;
          ">🏷️ ${ensName}</div>
        ` : ''}
        
        <!-- Quick Stats -->
        <div style="
          display: flex;
          justify-content: space-around;
          margin-top: 16px;
          gap: 8px;
        ">
          <div style="text-align: center; flex: 1;">
            <strong style="
              display: block;
              font-size: 20px;
              color: ${primaryColor};
              margin-bottom: 6px;
            ">${networks.length}</strong>
            <span style="
              font-size: 12px;
              color: ${textSecondary};
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">활성 체인 수</span>
          </div>
          <div style="text-align: center; flex: 1;">
            <strong style="
              display: block;
              font-size: 20px;
              color: ${primaryColor};
              margin-bottom: 6px;
            ">${totalTransactions.toLocaleString()}</strong>
            <span style="
              font-size: 12px;
              color: ${textSecondary};
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">전체 트랜잭션 수</span>
          </div>
          <div style="text-align: center; flex: 1;">
            <strong style="
              display: block;
              font-size: 20px;
              color: ${primaryColor};
              margin-bottom: 6px;
            ">${totalTokenTypes}</strong>
            <span style="
              font-size: 12px;
              color: ${textSecondary};
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">보유 토큰 종류</span>
          </div>
        </div>
      </section>

      <!-- Networks Section -->
      <div style="padding: 0 16px 16px; overflow: hidden;">
  `;

      // 각 네트워크별 정보 표시
    networks.forEach((network: any, index: number) => {
      const { protocol, network: networkName, tokenBalances, assetBalances, nativeBalance, transactionCount } = network;
      const networkColor = networkColors[protocol] || '#6B7280';
      const networkIcon = networkIcons[protocol] || '🌐';
      const networkKey = `${protocol}-${networkName}`;
      const paginationState = tokenPaginationState[networkKey];
      const allTokens = paginationState?.allTokens || tokenBalances?.items || [];
      
      html += `
        <section style="
          background: ${cardColor};
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          position: relative;
          z-index: 1;
          clear: both;
          display: block;
        ">
          <!-- Network Header -->
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="
                font-size: 30px;
                color: ${networkColor};
              ">${networkIcon}</div>
              <div>
                <h4 style="
                  margin: 0;
                  font-size: 17px;
                  font-weight: 700;
                  text-transform: capitalize;
                  color: ${textPrimary};
                ">${protocol}</h4>
                <p style="
                  margin: 0;
                  font-size: 13px;
                  color: ${textSecondary};
                  text-transform: uppercase;
                ">${networkName}</p>
              </div>
            </div>
            ${transactionCount && transactionCount.transactionCount !== undefined ? 
              `<div style="
                text-align: right;
                color: ${textSecondary};
                font-size: 15px;
              ">${transactionCount.transactionCount.toLocaleString()} 트랜잭션</div>` : ''
            }
          </div>

          <!-- Metrics -->
          <div style="
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            gap: 8px;
          ">
      `;

          // 네이티브 잔고
      if (nativeBalance && nativeBalance.balance !== undefined) {
        let displayBalance = '0';
        let symbol = protocol.toUpperCase();
        
        if (protocol === 'tron') {
          displayBalance = (parseFloat(nativeBalance.balance) / 1000000).toFixed(4);
          symbol = 'TRX';
        } else {
          displayBalance = (parseFloat(nativeBalance.balance) / Math.pow(10, 18)).toFixed(4);
          if (protocol === 'ethereum') symbol = 'ETH';
          else if (protocol === 'polygon') symbol = 'MATIC';
          else if (protocol === 'arbitrum') symbol = 'ETH';
          else if (protocol === 'base') symbol = 'ETH';
          else if (protocol === 'optimism') symbol = 'ETH';
          else if (protocol === 'kaia') symbol = 'KAIA';
        }
        
        html += `
          <div style="
            flex: 1;
            background: #333;
            border-radius: 10px;
            padding: 12px;
            font-size: 12px;
          ">
            <p style="
              margin: 0;
              color: ${textSecondary};
              font-size: 11px;
            ">기본통화</p>
            <strong style="
              display: block;
              margin-top: 8px;
              font-size: 14px;
              color: ${textPrimary};
            ">${displayBalance} ${symbol}</strong>
          </div>
        `;
      }

          // 토큰 보유량 (Tron의 경우 TRC-20 + TRC-10)
      const tokenCount = paginationState?.totalCount || tokenBalances?.items?.length || 0;
      const assetCount = protocol === 'tron' ? (assetPaginationState[networkKey]?.totalCount || assetBalances?.items?.length || 0) : 0;
      const totalTokenCount = tokenCount + assetCount;
      
      html += `
        <div style="
          flex: 1;
          background: #333;
          border-radius: 10px;
          padding: 12px;
          font-size: 12px;
        ">
          <p style="
            margin: 0;
            color: ${textSecondary};
            font-size: 11px;
          ">보유 토큰</p>
          <strong style="
            display: block;
            margin-top: 8px;
            font-size: 14px;
            color: ${textPrimary};
          ">${totalTokenCount} 토큰 종류</strong>
          ${protocol === 'tron' && (tokenCount > 0 || assetCount > 0) ? `
            <span style="
              font-size: 10px;
              color: ${textSecondary};
            ">TRC-20: ${tokenCount}, TRC-10: ${assetCount}</span>
          ` : ''}
        </div>
      `;

          // 이더리움 메인넷의 경우 ENS 정보 표시
      if (protocol === 'ethereum' && networkName === 'mainnet' && network.ensName) {
        const ensData = network.ensName;
        if (ensData.name) {
          html += `
            <div style="
              flex: 1;
              background: #333;
              border-radius: 10px;
              padding: 12px;
              font-size: 12px;
            ">
              <p style="
                margin: 0;
                color: ${textSecondary};
                font-size: 11px;
              ">ENS 주소</p>
              <strong style="
                display: block;
                margin-top: 8px;
                font-size: 14px;
                color: ${textPrimary};
              ">🏷️ ${ensData.name}</strong>
              ${ensData.expiryDate ? `
                <span style="
                  font-size: 10px;
                  color: ${textSecondary};
                ">만료: ${new Date(ensData.expiryDate).toLocaleDateString('ko-KR')}</span>
              ` : ''}
            </div>
          `;
        }
      }

      html += `
            </div>
      `;

    // 토큰/에셋/트랜잭션 리스트 표시 (모든 네트워크에 탭 추가)
    const allTransactions = transactionPaginationState[networkKey]?.allTransactions || network.recentTransactions?.items || [];
    const recentTransactionCount = allTransactions.length;

    if (totalTokenCount > 0 || recentTransactionCount > 0) {
      if (protocol === 'tron') {
      // Tron의 경우 TRC-20, TRC-10, 최근 활동 탭으로 분리
      const allAssets = assetPaginationState[networkKey]?.allAssets || assetBalances?.items || [];
      
      html += `
        <div style="margin-top: 16px;">
          <!-- Tab Headers -->
          <div style="
            display: flex;
            border-bottom: 1px solid ${borderColor};
            margin-bottom: 16px;
          ">
            <button 
              class="tab-button" 
              data-tab="trc20" 
              data-network-key="${networkKey}"
              style="
                flex: 1;
                padding: 12px;
                background: none;
                border: none;
                color: ${primaryColor};
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                border-bottom: 2px solid ${primaryColor};
              "
            >
              TRC-20 (${tokenCount})
            </button>
            <button 
              class="tab-button" 
              data-tab="trc10" 
              data-network-key="${networkKey}"
              style="
                flex: 1;
                padding: 12px;
                background: none;
                border: none;
                color: ${textSecondary};
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                border-bottom: 2px solid transparent;
              "
            >
              TRC-10 (${assetCount})
            </button>
            <button 
              class="tab-button" 
              data-tab="transactions" 
              data-network-key="${networkKey}"
              style="
                flex: 1;
                padding: 12px;
                background: none;
                border: none;
                color: ${textSecondary};
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                border-bottom: 2px solid transparent;
              "
            >
              최근 활동 (${recentTransactionCount})
            </button>
          </div>
            
            <!-- TRC-20 Tab Content -->
            <div id="trc20-tab-${networkKey}" class="tab-content" style="display: block;">
        `;
        
        if (allTokens.length > 0) {
          const displayTokens = allTokens.slice(0, 10);
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="font-size: 14px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">TRC-20 Tokens</div>
              <div class="showing-count-trc20" style="font-size: 12px; color: #9CA3AF;">Showing ${Math.min(allTokens.length, 10)} of ${tokenCount}</div>
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
                  style="background: ${primaryColor}; color: #000; border: none; padding: 8px 16px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.5px;"
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0, 255, 171, 0.3)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                >
                  Load More TRC-20
                </button>
              </div>
            `;
          }
        } else {
          html += `
            <div style="text-align: center; padding: 24px; color: #64748B;">
              <div style="font-size: 15px;">No TRC-20 tokens found</div>
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
              <div class="showing-count-trc10" style="font-size: 10px; color: #9CA3AF;">Showing ${Math.min(allAssets.length, 10)} of ${assetCount}</div>
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
                  style="background: ${primaryColor}; color: #000; border: none; padding: 8px 16px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.5px;"
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0, 255, 171, 0.3)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                >
                  Load More TRC-10
                </button>
              </div>
            `;
          }
        } else {
          html += `
            <div style="text-align: center; padding: 24px; color: #64748B;">
              <div style="font-size: 15px;">No TRC-10 assets found</div>
            </div>
          `;
        }
        
        html += `
            </div>
            
            <!-- Transactions Tab Content -->
            <div id="transactions-tab-${networkKey}" class="tab-content" style="display: none;">
        `;
        
        if (allTransactions.length > 0) {
          const displayTransactions = allTransactions.slice(0, 10);
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="font-size: 12px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">최근 활동</div>
              <div class="showing-count-transactions" style="font-size: 10px; color: #9CA3AF;">Showing ${Math.min(allTransactions.length, 10)} recent transactions</div>
            </div>
            <div id="transaction-list-${networkKey}" style="display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto;">
          `;
          
          html += renderTransactionItems(displayTransactions, 0, address);
          
          html += `
            </div>
          `;
          
          // More transactions 버튼
          if (transactionPaginationState[networkKey]?.hasMore) {
            html += `
              <div style="margin-top: 12px; text-align: center;">
                <button 
                  id="load-more-transactions-btn-${networkKey}"
                  class="load-more-transactions-btn"
                  data-address="${address}"
                  data-protocol="${protocol}"
                  data-network="${networkName}"
                  data-network-key="${networkKey}"
                  style="background: ${primaryColor}; color: #000; border: none; padding: 8px 16px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.5px;"
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0, 255, 171, 0.3)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                >
                  Load More Transactions
                </button>
              </div>
            `;
          }
        } else {
          html += `
            <div style="text-align: center; padding: 24px; color: #64748B;">
              <div style="font-size: 16px;">No recent transactions found</div>
            </div>
          `;
        }
        
        html += `
            </div>
          </div>
        `;
      } else {
        // EVM 네트워크의 경우 토큰과 최근 활동 탭으로 분리
        html += `
          <div style="margin-top: 16px;">
            <!-- Tab Headers -->
            <div style="display: flex; border-bottom: 2px solid #F1F5F9; margin-bottom: 12px;">
              <button 
                class="tab-button" 
                data-tab="tokens" 
                data-network-key="${networkKey}"
                style="flex: 1; padding: 8px 12px; border: none; background: none; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; color: #10B981; border-bottom: 2px solid #10B981;"
              >
                토큰 (${tokenCount})
              </button>
              <button 
                class="tab-button" 
                data-tab="transactions" 
                data-network-key="${networkKey}"
                style="flex: 1; padding: 8px 12px; border: none; background: none; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; color: #64748B; border-bottom: 2px solid transparent;"
              >
                최근 활동 (${recentTransactionCount})
              </button>
            </div>
            
            <!-- Tokens Tab Content -->
            <div id="tokens-tab-${networkKey}" class="tab-content" style="display: block;">
        `;
        
        const displayTokens = allTokens.slice(0, 10);
        const totalTokenCount = paginationState?.totalCount || allTokens.length;
        if (allTokens.length > 0) {
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="font-size: 12px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Token Holdings</div>
              <div class="showing-count" style="font-size: 10px; color: #9CA3AF;">Showing ${Math.min(allTokens.length, 10)} of ${totalTokenCount}</div>
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
                  style="background: ${primaryColor}; color: #000; border: none; padding: 8px 16px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.5px;"
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0, 255, 171, 0.3)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                >
                  Load More Tokens
                </button>
              </div>
            `;
          }
        } else {
          html += `
            <div style="text-align: center; padding: 24px; color: #64748B;">
              <div style="font-size: 15px;">No tokens found</div>
            </div>
          `;
        }
        
        html += `
            </div>
            
            <!-- Transactions Tab Content -->
            <div id="transactions-tab-${networkKey}" class="tab-content" style="display: none;">
        `;
        
        if (allTransactions.length > 0) {
          const displayTransactions = allTransactions.slice(0, 10);
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="font-size: 12px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">최근 활동</div>
              <div class="showing-count-transactions" style="font-size: 10px; color: #9CA3AF;">Showing ${Math.min(allTransactions.length, 10)} recent transactions</div>
            </div>
            <div id="transaction-list-${networkKey}" style="display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto;">
          `;
          
          html += renderTransactionItems(displayTransactions, 0, address);
          
          html += `
            </div>
          `;
          
          // More transactions 버튼
          if (transactionPaginationState[networkKey]?.hasMore) {
            html += `
              <div style="margin-top: 12px; text-align: center;">
                <button 
                  id="load-more-transactions-btn-${networkKey}"
                  class="load-more-transactions-btn"
                  data-address="${address}"
                  data-protocol="${protocol}"
                  data-network="${networkName}"
                  data-network-key="${networkKey}"
                  style="background: ${primaryColor}; color: #000; border: none; padding: 8px 16px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.5px;"
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0, 255, 171, 0.3)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                >
                  Load More Transactions
                </button>
              </div>
            `;
          }
        } else {
          html += `
            <div style="text-align: center; padding: 24px; color: #64748B;">
              <div style="font-size: 16px;">No recent transactions found</div>
            </div>
          `;
        }
        
        html += `
            </div>
          </div>
        `;
      }
    }

            html += `
        </section>
    `;
  });

  html += `
      </div>
      
      <!-- Footer -->
      <footer style="
        text-align: center;
        font-size: 13px;
        padding: 12px 16px;
        color: #888;
        border-top: 1px solid ${borderColor};
        margin-top: 8px;
      ">
        <p style="margin: 0;">Powered by Nodit</p>
      </footer>
    </div>
  `;

  contentDiv.innerHTML = html;
  
  // Add event listeners for tab buttons (Tron only)
  const tabButtons = contentDiv.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      const btn = event.target as HTMLButtonElement;
      const tab = btn.getAttribute('data-tab')!;
      const networkKey = btn.getAttribute('data-network-key')!;
      
      // Update tab button styles
      const allTabButtons = contentDiv.querySelectorAll(`[data-network-key="${networkKey}"].tab-button`);
      allTabButtons.forEach(tabBtn => {
        (tabBtn as HTMLElement).style.color = '#aaa';
        (tabBtn as HTMLElement).style.borderBottom = '2px solid transparent';
      });
      
      btn.style.color = '#00ffab';
      btn.style.borderBottom = '2px solid #00ffab';
      
      // Show/hide tab content
      const trc20Tab = contentDiv.querySelector(`#trc20-tab-${networkKey}`);
      const trc10Tab = contentDiv.querySelector(`#trc10-tab-${networkKey}`);
      const transactionsTab = contentDiv.querySelector(`#transactions-tab-${networkKey}`);
      const tokensTab = contentDiv.querySelector(`#tokens-tab-${networkKey}`);
      
      // Hide all tabs first
      if (trc20Tab) (trc20Tab as HTMLElement).style.display = 'none';
      if (trc10Tab) (trc10Tab as HTMLElement).style.display = 'none';
      if (transactionsTab) (transactionsTab as HTMLElement).style.display = 'none';
      if (tokensTab) (tokensTab as HTMLElement).style.display = 'none';
      
      // Show selected tab
      if (tab === 'trc20') {
        if (trc20Tab) (trc20Tab as HTMLElement).style.display = 'block';
      } else if (tab === 'trc10') {
        if (trc10Tab) (trc10Tab as HTMLElement).style.display = 'block';
      } else if (tab === 'transactions') {
        if (transactionsTab) (transactionsTab as HTMLElement).style.display = 'block';
      } else if (tab === 'tokens') {
        if (tokensTab) (tokensTab as HTMLElement).style.display = 'block';
      }
    });
  });
  
  // Add event listeners for "Load More Tokens" buttons
  const loadMoreButtons = contentDiv.querySelectorAll('.load-more-tokens-btn');
  loadMoreButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const btn = event.target as HTMLButtonElement;
      const address = btn.getAttribute('data-address')!;
      const protocol = btn.getAttribute('data-protocol')!;
      const network = btn.getAttribute('data-network')!;
      const networkKey = btn.getAttribute('data-network-key')!;
      
      await handleLoadMoreTokens(address, protocol, network, networkKey, btn);
    });
  });
  
  // Add event listeners for "Load More Assets" buttons (TRC-10)
  const loadMoreAssetButtons = contentDiv.querySelectorAll('.load-more-assets-btn');
  loadMoreAssetButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const btn = event.target as HTMLButtonElement;
      const address = btn.getAttribute('data-address')!;
      const protocol = btn.getAttribute('data-protocol')!;
      const network = btn.getAttribute('data-network')!;
      const networkKey = btn.getAttribute('data-network-key')!;
      
      await handleLoadMoreAssets(address, protocol, network, networkKey, btn);
    });
  });
  
  // Add event listeners for "Load More Transactions" buttons
  const loadMoreTransactionButtons = contentDiv.querySelectorAll('.load-more-transactions-btn');
  loadMoreTransactionButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const btn = event.target as HTMLButtonElement;
      const address = btn.getAttribute('data-address')!;
      const protocol = btn.getAttribute('data-protocol')!;
      const network = btn.getAttribute('data-network')!;
      const networkKey = btn.getAttribute('data-network-key')!;
      
      await handleLoadMoreTransactions(address, protocol, network, networkKey, btn);
    });
  });
  
  // Add event listeners for hash copy buttons
  const copyHashButtons = contentDiv.querySelectorAll('.copy-hash-btn');
  copyHashButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const btn = event.target as HTMLButtonElement;
      const hash = btn.getAttribute('data-hash');
      
      if (hash) {
        try {
          await navigator.clipboard.writeText(hash);
          btn.textContent = '✅ 복사됨';
          setTimeout(() => {
            btn.textContent = '📋 Hash';
          }, 2000);
        } catch (error) {
          console.error('복사 실패:', error);
        }
      }
    });
  });
};

// Function to render token items HTML
const renderTokenItems = (tokens: any[], startIndex: number = 0) => {
  return tokens.map((token: any, index: number) => {
    const balance = parseFloat(token.balance || '0');
    const decimals = parseInt(token.contract?.decimals || '18');
    const displayBalance = (balance / Math.pow(10, decimals)).toFixed(4);
    const symbol = token.contract?.symbol || 'Unknown';
    const name = token.contract?.name || 'Unknown Token';
    const tokenIndex = startIndex + index;
    
    return `
      <div style="
        background: #1a1a1a;
        padding: 14px;
        border-radius: 10px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="flex: 1;">
          <div style="
            font-weight: bold;
            color: #fff;
            font-size: 15px;
            margin-bottom: 4px;
          ">${symbol}</div>
          <div style="
            font-size: 13px;
            color: #aaa;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${name}</div>
        </div>
        <div style="text-align: right;">
          <div style="
            font-size: 15px;
            color: #fff;
            font-weight: 600;
          ">${displayBalance}</div>
          <div style="
            color: #aaa;
            font-size: 12px;
          ">#${tokenIndex + 1}</div>
        </div>
      </div>
    `;
  }).join('');
};

// Function to render asset (TRC-10) items HTML
const renderAssetItems = (assets: any[], startIndex: number = 0) => {
  return assets.map((asset: any, index: number) => {
    const balance = parseFloat(asset.balance || '0');
    const decimals = parseInt(asset.asset?.decimals || '0');
    const displayBalance = decimals > 0 ? (balance / Math.pow(10, decimals)).toFixed(4) : balance.toString();
    const symbol = asset.asset?.symbol || 'Unknown';
    const name = asset.asset?.name || 'Unknown Asset';
    const assetId = asset.asset?.id || 'N/A';
    const assetIndex = startIndex + index;
    
    return `
      <div style="
        background: #1a1a1a;
        padding: 14px;
        border-radius: 10px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="flex: 1;">
          <div style="
            font-weight: bold;
            color: #fff;
            font-size: 15px;
            margin-bottom: 4px;
          ">${symbol}</div>
          <div style="
            font-size: 13px;
            color: #aaa;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${name}</div>
          <div style="
            font-size: 11px;
            color: #aaa;
          ">ID: ${assetId}</div>
        </div>
        <div style="text-align: right;">
          <div style="
            font-size: 15px;
            color: #fff;
            font-weight: 600;
          ">${displayBalance}</div>
          <div style="
            color: #aaa;
            font-size: 12px;
          ">#${assetIndex + 1}</div>
        </div>
      </div>
    `;
  }).join('');
};

// Function to render transaction items HTML
const renderTransactionItems = (transactions: any[], startIndex: number = 0, account: string = '') => {
  return transactions.map((tx: any, index: number) => {
    const txIndex = startIndex + index;
    const isOutgoing = tx.from?.toLowerCase() === account.toLowerCase();
    const timestamp = new Date(tx.timestamp * 1000);
    const value = parseFloat(tx.value || '0');
    const displayValue = (value / Math.pow(10, 18)).toFixed(4);
    const hash = tx.hash || tx.transactionHash || '';
    
    return `
      <div style="
        background: #1a1a1a;
        padding: 14px;
        border-radius: 10px;
        margin-bottom: 10px;
      ">
        <!-- Header: 시간과 오른쪽 정렬 요소들 -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        ">
          <div style="
            font-size: 10px;
            color: #aaa;
            font-weight: 500;
          ">
            ${timestamp.toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          
          <div style="
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
          ">
            <div style="display: flex; align-items: center; gap: 6px;">
              <button 
                class="copy-hash-btn" 
                data-hash="${hash}"
                style="
                  background: transparent;
                  border: 1px solid #00ffab;
                  color: #00ffab;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-size: 9px;
                  cursor: pointer;
                  font-weight: 500;
                "
              >
                📋 Hash
              </button>
              <div style="
                background: ${isOutgoing ? '#EF4444' : '#00ffab'};
                color: ${isOutgoing ? 'white' : '#000'};
                font-size: 8px;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 600;
              ">
                ${isOutgoing ? '↗️ 송신' : '↙️ 수신'}
              </div>
            </div>
            
            <div style="
              font-size: 15px;
              font-weight: 600;
              color: ${isOutgoing ? '#EF4444' : '#00ffab'};
              text-align: right;
            ">
              ${isOutgoing ? '-' : '+'}${displayValue} ETH
            </div>
          </div>
        </div>
        
        <!-- Body: 주소 정보 -->
        <div style="margin-bottom: 8px;">
          <div style="
            font-size: 10px;
            color: #aaa;
            margin-bottom: 4px;
            word-break: break-all;
          ">
            From: <span style="font-family: monospace; color: #ccc;">${tx.from || 'N/A'}</span>
          </div>
          <div style="
            font-size: 10px;
            color: #aaa;
            word-break: break-all;
          ">
            To: <span style="font-family: monospace; color: #ccc;">${tx.to || 'N/A'}</span>
          </div>
        </div>
        
        <!-- Footer: Gas와 성공 상태 -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div style="
            font-size: 9px;
            color: #aaa;
          ">
            Gas: ${tx.gasUsed ? parseInt(tx.gasUsed).toLocaleString() : 'N/A'}
          </div>
          
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <div style="
              font-size: 9px;
              color: ${tx.status === '1' || tx.status === 'success' ? '#00ffab' : '#EF4444'};
              font-weight: 600;
            ">
              ${tx.status === '1' || tx.status === 'success' ? '✅ 성공' : '❌ 실패'}
            </div>
            <div style="
              font-size: 10px;
              color: #aaa;
            ">
              #${txIndex + 1}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

// Function to handle loading more tokens
const handleLoadMoreTokens = async (address: string, protocol: string, network: string, networkKey: string, button: HTMLButtonElement) => {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(['noditApiKey']);
    const apiKey = result.noditApiKey;
    
    if (!apiKey) {
      console.error('API key not found');
      return;
    }

    // Show loading state on button
    const originalText = button.textContent;
    button.textContent = 'Loading...';
    button.disabled = true;
    button.style.opacity = '0.6';

    // Load more tokens
    const newTokens = await loadMoreTokens(address, protocol, network, apiKey);
    
    if (newTokens && newTokens.length > 0) {
      // Update only the token list, not the entire popup
      const tokenListElement = document.getElementById(`token-list-${networkKey}`);
      const paginationState = tokenPaginationState[networkKey];
      
      if (tokenListElement && paginationState) {
        // Get current token count before adding new ones
        const currentTokenCount = paginationState.allTokens.length - newTokens.length;
        
        // Add new token items to the existing list
        const newTokensHTML = renderTokenItems(newTokens, currentTokenCount);
        tokenListElement.insertAdjacentHTML('beforeend', newTokensHTML);
        
        // Update the showing count (for Tron, use TRC-20 specific class)
        const showingElement = tokenListElement.parentElement?.querySelector(protocol === 'tron' ? '.showing-count-trc20' : '.showing-count');
        if (showingElement && paginationState.totalCount) {
          const currentShowing = paginationState.allTokens.length;
          showingElement.textContent = `Showing ${currentShowing} of ${paginationState.totalCount}`;
        }
        
        // Update button state
        if (paginationState.hasMore) {
          button.textContent = originalText;
          button.disabled = false;
          button.style.opacity = '1';
        } else {
          button.textContent = 'No More Tokens';
          button.disabled = true;
          button.style.opacity = '0.4';
        }
      }
    } else {
      // No more tokens available
      button.textContent = 'No More Tokens';
      button.disabled = true;
      button.style.opacity = '0.4';
    }
  } catch (error) {
    console.error('Error loading more tokens:', error);
    button.textContent = 'Error - Try Again';
    button.disabled = false;
    button.style.opacity = '1';
  }
};

// Function to handle loading more assets (TRC-10)
const handleLoadMoreAssets = async (address: string, protocol: string, network: string, networkKey: string, button: HTMLButtonElement) => {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(['noditApiKey']);
    const apiKey = result.noditApiKey;
    
    if (!apiKey) {
      console.error('API key not found');
      return;
    }

    // Show loading state on button
    const originalText = button.textContent;
    button.textContent = 'Loading...';
    button.disabled = true;
    button.style.opacity = '0.6';

    // Load more assets
    const newAssets = await loadMoreAssets(address, protocol, network, apiKey);
    
    if (newAssets && newAssets.length > 0) {
      // Update only the asset list, not the entire popup
      const assetListElement = document.getElementById(`asset-list-${networkKey}`);
      const paginationState = assetPaginationState[networkKey];
      
      if (assetListElement && paginationState) {
        // Get current asset count before adding new ones
        const currentAssetCount = paginationState.allAssets.length - newAssets.length;
        
        // Add new asset items to the existing list
        const newAssetsHTML = renderAssetItems(newAssets, currentAssetCount);
        assetListElement.insertAdjacentHTML('beforeend', newAssetsHTML);
        
        // Update the showing count
        const showingElement = assetListElement.parentElement?.querySelector('.showing-count-trc10');
        if (showingElement && paginationState.totalCount) {
          const currentShowing = paginationState.allAssets.length;
          showingElement.textContent = `Showing ${currentShowing} of ${paginationState.totalCount}`;
        }
        
        // Update button state
        if (paginationState.hasMore) {
          button.textContent = originalText;
          button.disabled = false;
          button.style.opacity = '1';
        } else {
          button.textContent = 'No More Assets';
          button.disabled = true;
          button.style.opacity = '0.4';
        }
      }
    } else {
      // No more assets available
      button.textContent = 'No More Assets';
      button.disabled = true;
      button.style.opacity = '0.4';
    }
  } catch (error) {
    console.error('Error loading more assets:', error);
    button.textContent = 'Error - Try Again';
    button.disabled = false;
    button.style.opacity = '1';
  }
};

// Function to handle loading more transactions
const handleLoadMoreTransactions = async (address: string, protocol: string, network: string, networkKey: string, button: HTMLButtonElement) => {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(['noditApiKey']);
    const apiKey = result.noditApiKey;
    
    if (!apiKey) {
      console.error('API key not found');
      return;
    }

    // Show loading state on button
    const originalText = button.textContent;
    button.textContent = 'Loading...';
    button.disabled = true;
    button.style.opacity = '0.6';

    // Load more transactions
    const newTransactions = await loadMoreTransactions(address, protocol, network, apiKey);
    
    if (newTransactions && newTransactions.length > 0) {
      // Update only the transaction list, not the entire popup
      const transactionListElement = document.getElementById(`transaction-list-${networkKey}`);
      const paginationState = transactionPaginationState[networkKey];
      
      if (transactionListElement && paginationState) {
        // Get current transaction count before adding new ones
        const currentTransactionCount = paginationState.allTransactions.length - newTransactions.length;
        
        // Add new transaction items to the existing list
        const newTransactionsHTML = renderTransactionItems(newTransactions, currentTransactionCount, address);
        transactionListElement.insertAdjacentHTML('beforeend', newTransactionsHTML);
        
        // Add event listeners to new copy buttons
        const newCopyButtons = transactionListElement.querySelectorAll('.copy-hash-btn:not([data-listener-added])');
        newCopyButtons.forEach(btn => {
          btn.setAttribute('data-listener-added', 'true');
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const hash = (e.target as HTMLElement).getAttribute('data-hash');
            if (hash) {
              try {
                await navigator.clipboard.writeText(hash);
                (e.target as HTMLElement).textContent = '✅ 복사됨';
                setTimeout(() => {
                  (e.target as HTMLElement).textContent = '📋 Hash';
                }, 2000);
              } catch (error) {
                console.error('복사 실패:', error);
              }
            }
          });
        });
        
        // Update the showing count
        const showingElement = transactionListElement.parentElement?.querySelector('.showing-count-transactions');
        if (showingElement) {
          const currentShowing = paginationState.allTransactions.length;
          showingElement.textContent = `Showing ${currentShowing} recent transactions`;
        }
        
        // Update button state
        if (paginationState.hasMore) {
          button.textContent = originalText;
          button.disabled = false;
          button.style.opacity = '1';
        } else {
          button.textContent = 'No More Transactions';
          button.disabled = true;
          button.style.opacity = '0.4';
        }
      }
    } else {
      // No more transactions available
      button.textContent = 'No More Transactions';
      button.disabled = true;
      button.style.opacity = '0.4';
    }
  } catch (error) {
    console.error('Error loading more transactions:', error);
    button.textContent = 'Error - Try Again';
    button.disabled = false;
    button.style.opacity = '1';
  }
};

// Common styles
const styles = {
  floatingButton: {
    position: 'fixed',
    display: 'none',
    padding: '12px 24px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    zIndex: 999999,
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    transform: 'translate(-50%, 0)', // Center horizontally
    whiteSpace: 'nowrap',
    userSelect: 'none',
    pointerEvents: 'auto',
    '&:hover': {
      backgroundColor: '#059669',
      boxShadow: '0 6px 16px rgba(16, 185, 129, 0.4), 0 4px 8px rgba(0, 0, 0, 0.15)',
      transform: 'translate(-50%, -2px)',
    },
  },
  popupBox: {
    position: 'fixed',
    display: 'none',
    padding: '0',
    backgroundColor: '#111',
    border: 'none',
    borderRadius: '0',
    boxShadow: 'none',
    zIndex: 2147483647, // Maximum z-index value
    maxWidth: '480px',
    minWidth: '380px',
    maxHeight: '500px',
    fontSize: '14px',
    lineHeight: '1.5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: '#FFFFFF',
    boxSizing: 'border-box',
    overflowY: 'auto',
    // CSS 격리를 위한 추가 속성들
    isolation: 'isolate',
    contain: 'layout style paint',
    pointerEvents: 'auto',
    // 모든 CSS 속성을 명시적으로 설정하여 사이트 CSS의 영향을 최소화
    margin: '0',
    transform: 'none',
    filter: 'none',
    opacity: '1',
    visibility: 'visible',
  },
  popupContent: {
    padding: '20px',
    margin: '0',
  },

  popupContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
};

// Create floating button element
const createFloatingButton = () => {
  const button = document.createElement('button');
  Object.assign(button.style, styles.floatingButton);
  button.textContent = 'Account Analyze';
  
  // Add hover effect
  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#059669';
    button.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.3)';
  });
  
  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = '#10B981';
    button.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
  });
  
  return button;
};

// Create popup box element
const createPopupBox = () => {
  const container = document.createElement('div');
  
  // 기본 스타일 적용
  Object.assign(container.style, styles.popupBox);
  
  // 추가적인 강제 스타일 적용 (사이트 CSS 오버라이드 방지)
  container.style.cssText = `
    position: fixed !important;
    display: none !important;
    padding: 0 !important;
    margin: 0 !important;
    background-color: #111 !important;
    border: none !important;
    border-radius: 20px !important;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8) !important;
    z-index: 2147483647 !important;
    max-width: 480px !important;
    min-width: 380px !important;
    max-height: 500px !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    color: #FFFFFF !important;
    box-sizing: border-box !important;
    overflow-y: auto !important;
    isolation: isolate !important;
    contain: layout style paint !important;
    pointer-events: auto !important;
    transform: none !important;
    filter: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    width: auto !important;
    height: auto !important;
  `;
  
  // 고유한 ID 설정 (디버깅용)
  container.id = 'nodit-analysis-popup';
  container.setAttribute('data-nodit-popup', 'true');
  
  const contentDiv = document.createElement('div');
  Object.assign(contentDiv.style, styles.popupContent);
  
  // 콘텐츠 div에도 강제 스타일 적용
  contentDiv.style.cssText = `
    padding: 20px !important;
    margin: 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    position: relative !important;
    z-index: auto !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  `;
  
  container.appendChild(contentDiv);
  
  // 팝업 내부 클릭 시 이벤트 전파 방지 (floating button이 나타나지 않도록)
  container.addEventListener('mouseup', (event) => {
    event.stopPropagation();
  });
  
  container.addEventListener('mousedown', (event) => {
    event.stopPropagation();
  });
  
  container.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  
  // 분석 버튼은 제거 - 바로 분석 결과를 표시
  return { container, contentDiv };
};

// Initialize content script
const initializeContentScript = () => {
  console.log('Initializing content script...');
  
  // Load extension state from storage
  chrome.storage.local.get(['isEnabled'], (result) => {
    console.log('Content script loaded extension state:', result);
    isEnabled = result.isEnabled ?? false;
    console.log('Nodit Supporter enabled:', isEnabled);
    
    // 상태 확인을 위한 추가 로그
    if (isEnabled) {
      console.log('✅ Nodit Supporter is ENABLED - Address detection will work');
    } else {
      console.log('❌ Nodit Supporter is DISABLED - Please enable it in the extension popup');
    }
  });
  
  // Request current state from background script
  chrome.runtime.sendMessage({ type: 'REQUEST_STATE_SYNC' }).catch(() => {
    console.log('Failed to request state sync from background');
  });
  
  // Mark as initialized (page script is now handled by metamask-content.tsx)
  isInitialized = true;

  // Create and append UI elements
  floatingButton = createFloatingButton();
  const popupElements = createPopupBox();
  popupBox = popupElements.container;
  popupContent = popupElements.contentDiv;
  
  document.body.appendChild(floatingButton);
  document.body.appendChild(popupBox);

  // 텍스트 선택 감지를 위한 함수
  const handleTextSelection = (eventType: string) => {
    console.log(`🖱️ ${eventType} event triggered`);
    
    if (!isEnabled) {
      console.log('❌ Extension is disabled');
      floatingButton.style.display = 'none';
      popupBox.style.display = 'none';
      return;
    }
    
    // 팝업이 이미 열려있으면 floating button을 표시하지 않음
    if (popupBox.style.display === 'block') {
      console.log('❌ Popup is already open, not showing floating button');
      floatingButton.style.display = 'none';
      return;
    }
    
    const selection = window.getSelection();
    console.log('📝 Selection object:', selection);
    
    if (selection && selection.toString().trim().length > 0) {
      let text = selection.toString().trim();
      console.log('📋 Selected text (raw):', JSON.stringify(text));
      
      // 텍스트 정리: 공백, 줄바꿈, 특수문자 제거
      text = text.replace(/[\s\n\r\t]/g, '');
      console.log('🧹 Cleaned text:', JSON.stringify(text));
      
      // 이더리움 주소: 0x + 40자리 16진수, 트론 주소: T로 시작 34자리 Base58
      const ethRegex = /^0x[a-fA-F0-9]{40}$/;
      const tronRegex = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
      
      // 더 유연한 주소 감지: 텍스트 내에서 주소 패턴 찾기
      const ethMatch = text.match(/0x[a-fA-F0-9]{40}/);
      const tronMatch = text.match(/T[1-9A-HJ-NP-Za-km-z]{33}/);
      
      let detectedAddress = null;
      if (ethRegex.test(text)) {
        detectedAddress = text;
        console.log('✅ Direct ETH address match:', detectedAddress);
      } else if (tronRegex.test(text)) {
        detectedAddress = text;
        console.log('✅ Direct TRON address match:', detectedAddress);
      } else if (ethMatch) {
        detectedAddress = ethMatch[0];
        console.log('✅ ETH address found in text:', detectedAddress);
      } else if (tronMatch) {
        detectedAddress = tronMatch[0];
        console.log('✅ TRON address found in text:', detectedAddress);
      }
      
      if (detectedAddress) {
        console.log('🎯 Address detected:', detectedAddress);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        console.log('📐 Selection rect:', rect);
        
        // 뷰포트 정보 확인
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        
        console.log('📱 Viewport info:', {
          viewportWidth,
          viewportHeight,
          scrollX,
          scrollY
        });
        
        // 버튼 크기 (대략적인 값)
        const buttonWidth = 140;
        const buttonHeight = 40;
        
        // 기본 위치: 선택 영역 중앙 하단
        let left = rect.left + (rect.width / 2) - (buttonWidth / 2) + scrollX;
        let top = rect.bottom + 10 + scrollY;
        
        // 화면 경계 체크 및 보정
        if (left < 10) {
          left = 10;
        } else if (left + buttonWidth > viewportWidth - 10) {
          left = viewportWidth - buttonWidth - 10;
        }
        
        // 세로 위치 보정 - 화면 하단을 벗어나면 선택 영역 위쪽에 표시
        if (top + buttonHeight > scrollY + viewportHeight - 10) {
          top = rect.top - buttonHeight - 10 + scrollY;
          console.log('📍 Button moved above selection due to viewport constraints');
        }
        
        // 최종 위치 설정
        floatingButton.style.left = `${left}px`;
        floatingButton.style.top = `${top}px`;
        floatingButton.style.display = 'block';
        floatingButton.style.zIndex = '999999'; // 매우 높은 z-index
        floatingButton.style.position = 'absolute';
        
        // 버튼을 더 눈에 띄게 만들기
        floatingButton.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.4), 0 0 0 2px rgba(16, 185, 129, 0.2)';
        floatingButton.style.animation = 'pulse 2s infinite';
        
        // CSS 애니메이션 추가
        if (!document.getElementById('nodit-button-animation')) {
          const style = document.createElement('style');
          style.id = 'nodit-button-animation';
          style.textContent = `
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }
          `;
          document.head.appendChild(style);
        }
        
        selectedText = detectedAddress;
        selectionRange = range;
        
        console.log('🔘 Floating button positioned at:', {
          left: `${left}px`,
          top: `${top}px`,
          selectionRect: rect,
          finalPosition: {
            left: floatingButton.style.left,
            top: floatingButton.style.top,
            display: floatingButton.style.display,
            zIndex: floatingButton.style.zIndex
          }
        });
        
        // 버튼이 실제로 화면에 보이는지 확인
        setTimeout(() => {
          const buttonRect = floatingButton.getBoundingClientRect();
          const isVisible = buttonRect.top >= 0 && 
                           buttonRect.left >= 0 && 
                           buttonRect.bottom <= viewportHeight && 
                           buttonRect.right <= viewportWidth;
          
          console.log('👁️ Button visibility check:', {
            buttonRect,
            isVisible,
            computedStyle: window.getComputedStyle(floatingButton)
          });
          
          if (!isVisible) {
            console.warn('⚠️ Button may not be visible in viewport!');
          }
        }, 100);
      } else {
        console.log('❌ No valid address found in text:', JSON.stringify(text));
        floatingButton.style.display = 'none';
        popupBox.style.display = 'none';
      }
    } else {
      console.log('❌ No text selected');
      floatingButton.style.display = 'none';
      popupBox.style.display = 'none';
    }
  };

  // 드래그 후 텍스트 선택 시 floatingButton 표시 (mouseup 이벤트)
  document.addEventListener('mouseup', () => handleTextSelection('mouseup'));
  
  // 텍스트 선택 변경 시 floatingButton 표시 (selectionchange 이벤트)
  document.addEventListener('selectionchange', () => {
    // selectionchange는 너무 자주 발생하므로 디바운스 적용
    clearTimeout((window as any).selectionTimeout);
    (window as any).selectionTimeout = setTimeout(() => {
      handleTextSelection('selectionchange');
    }, 100);
  });

  // floatingButton 클릭 시 바로 분석 실행
  floatingButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    console.log('🔘 Floating button clicked');
    
    if (selectedText && selectionRange) {
      // 버튼 클릭 시 즉시 버튼 숨기기
      floatingButton.style.display = 'none';
      console.log('👻 Floating button hidden after click');
      
      const rect = selectionRange.getBoundingClientRect();
      
      // Calculate popup position to avoid going off-screen
      let left = rect.left + window.scrollX;
      let top = rect.bottom + 12 + window.scrollY;
      
      // Adjust horizontal position if popup would go off-screen
      const popupWidth = 480; // maxWidth from styles
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
      
      // 팝업 위치 설정 (강제 적용)
      popupBox.style.setProperty('left', `${left}px`, 'important');
      popupBox.style.setProperty('top', `${top}px`, 'important');
      popupBox.style.setProperty('display', 'block', 'important');
      popupBox.style.setProperty('visibility', 'visible', 'important');
      popupBox.style.setProperty('opacity', '1', 'important');
      popupBox.style.setProperty('z-index', '2147483647', 'important');
      
      console.log('📦 Popup box displayed at:', { left: `${left}px`, top: `${top}px` });
      
      // 팝업이 실제로 보이는지 확인
      setTimeout(() => {
        const popupRect = popupBox.getBoundingClientRect();
        const isPopupVisible = popupRect.width > 0 && popupRect.height > 0 && 
                              popupRect.top >= 0 && popupRect.left >= 0 &&
                              popupRect.bottom <= window.innerHeight && 
                              popupRect.right <= window.innerWidth;
        
        console.log('👁️ Popup visibility check:', {
          popupRect,
          isPopupVisible,
          computedStyle: {
            display: window.getComputedStyle(popupBox).display,
            visibility: window.getComputedStyle(popupBox).visibility,
            opacity: window.getComputedStyle(popupBox).opacity,
            zIndex: window.getComputedStyle(popupBox).zIndex,
            position: window.getComputedStyle(popupBox).position
          }
        });
        
        if (!isPopupVisible) {
          console.warn('⚠️ Popup may not be visible! Attempting to fix...');
          // 팝업이 보이지 않으면 화면 중앙에 강제 표시
          popupBox.style.setProperty('left', '50%', 'important');
          popupBox.style.setProperty('top', '50%', 'important');
          popupBox.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
          console.log('🔧 Popup repositioned to center of screen');
        }
      }, 100);
      
      // 바로 계정 분석 실행
      await analyzeAccount(selectedText, popupContent);
    }
  });

  // 바깥 클릭 시 팝업/버튼 숨김
  document.addEventListener('mousedown', (event) => {
    if (
      !floatingButton.contains(event.target as Node) &&
      !popupBox.contains(event.target as Node)
    ) {
      floatingButton.style.display = 'none';
      popupBox.style.display = 'none';
      console.log('🖱️ Outside click - hiding button and popup');
    }
  });

  // 텍스트 선택 해제 시 버튼 숨기기 (추가 보장)
  document.addEventListener('click', (event) => {
    // 버튼이나 팝업을 클릭한 경우가 아니라면
    if (
      !floatingButton.contains(event.target as Node) &&
      !popupBox.contains(event.target as Node)
    ) {
      // 잠시 후 선택 상태 확인
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length === 0) {
          floatingButton.style.display = 'none';
          console.log('🚫 Text selection cleared - hiding button');
        }
      }, 50);
    }
  });

  // Notify that content script is ready
  console.log('Content script initialized, sending CONTENT_SCRIPT_READY');
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
  
  // 디버깅을 위한 전역 함수들 추가
  (window as any).noditDebug = {
    checkStatus: () => {
      console.log('🔍 Web3 Minion Debug Info:');
      console.log('- Extension enabled:', isEnabled);
      console.log('- Floating button element:', floatingButton);
      console.log('- Floating button display:', floatingButton?.style.display);
      console.log('- Floating button position:', {
        left: floatingButton?.style.left,
        top: floatingButton?.style.top,
        zIndex: floatingButton?.style.zIndex
      });
      console.log('- Popup box element:', popupBox);
      console.log('- Popup box display:', popupBox?.style.display);
      console.log('- Selected text:', selectedText);
      console.log('- Is initialized:', isInitialized);
      
      const buttonRect = floatingButton?.getBoundingClientRect();
      console.log('- Button bounding rect:', buttonRect);
      
      return {
        isEnabled,
        hasFloatingButton: !!floatingButton,
        hasPopupBox: !!popupBox,
        selectedText,
        isInitialized,
        buttonDisplay: floatingButton?.style.display,
        buttonPosition: {
          left: floatingButton?.style.left,
          top: floatingButton?.style.top
        },
        buttonRect
      };
    },
    testAddress: (address: string) => {
      console.log('🧪 Testing address:', address);
      const ethRegex = /^0x[a-fA-F0-9]{40}$/;
      const tronRegex = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
      const isEth = ethRegex.test(address);
      const isTron = tronRegex.test(address);
      console.log('- Is valid ETH address:', isEth);
      console.log('- Is valid TRON address:', isTron);
      console.log('- Address length:', address.length);
      console.log('- Address pattern check:');
      console.log('  - Starts with 0x:', address.startsWith('0x'));
      console.log('  - Starts with T:', address.startsWith('T'));
      console.log('  - ETH hex chars only:', /^0x[a-fA-F0-9]+$/.test(address));
      console.log('  - TRON Base58 chars only:', /^T[1-9A-HJ-NP-Za-km-z]+$/.test(address));
      return { isEth, isTron, isValid: isEth || isTron };
    },
    forceEnable: () => {
      console.log('🔧 Force enabling extension...');
      isEnabled = true;
      chrome.storage.local.set({ isEnabled: true });
      console.log('✅ Extension force enabled');
    },
    showButtonAtCenter: (address?: string) => {
      console.log('🎯 Showing button at center of screen...');
      const testAddress = address || '0xbe45c4C29c7ed2E5107eD93556A6F9601D74d665';
      
      // 화면 중앙에 버튼 표시
      floatingButton.style.left = '50%';
      floatingButton.style.top = '50%';
      floatingButton.style.transform = 'translate(-50%, -50%)';
      floatingButton.style.display = 'block';
      floatingButton.style.zIndex = '999999';
      floatingButton.style.position = 'fixed';
      floatingButton.style.backgroundColor = '#EF4444'; // 빨간색으로 변경하여 눈에 띄게
      
      selectedText = testAddress;
      
      console.log('🔘 Button forced to center with address:', testAddress);
      return testAddress;
    },
    showButtonForSelection: () => {
      console.log('📝 Trying to show button for current selection...');
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        handleTextSelection('manual-debug');
        return selection.toString().trim();
      } else {
        console.log('❌ No text currently selected');
        return null;
      }
    },
    hideButton: () => {
      console.log('🙈 Hiding button...');
      floatingButton.style.display = 'none';
      popupBox.style.display = 'none';
    },
    showPopupAtCenter: (address?: string) => {
      console.log('🎯 Showing popup at center of screen...');
      const testAddress = address || '0xbe45c4C29c7ed2E5107eD93556A6F9601D74d665';
      
      // 화면 중앙에 팝업 표시
      popupBox.style.setProperty('left', '50%', 'important');
      popupBox.style.setProperty('top', '50%', 'important');
      popupBox.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
      popupBox.style.setProperty('display', 'block', 'important');
      popupBox.style.setProperty('visibility', 'visible', 'important');
      popupBox.style.setProperty('opacity', '1', 'important');
      popupBox.style.setProperty('z-index', '2147483647', 'important');
      
      selectedText = testAddress;
      
      // 분석 실행
      analyzeAccount(testAddress, popupContent);
      
      console.log('📦 Popup forced to center with address:', testAddress);
      return testAddress;
    },
    testPopupVisibility: () => {
      console.log('🔍 Testing popup visibility...');
      const popupRect = popupBox.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(popupBox);
      
      const visibilityInfo = {
        element: popupBox,
        rect: popupRect,
        isVisible: popupRect.width > 0 && popupRect.height > 0,
        computedStyle: {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          zIndex: computedStyle.zIndex,
          position: computedStyle.position,
          left: computedStyle.left,
          top: computedStyle.top,
          transform: computedStyle.transform
        },
        inlineStyle: {
          display: popupBox.style.display,
          visibility: popupBox.style.visibility,
          opacity: popupBox.style.opacity,
          zIndex: popupBox.style.zIndex,
          position: popupBox.style.position,
          left: popupBox.style.left,
          top: popupBox.style.top,
          transform: popupBox.style.transform
        }
      };
      
      console.log('👁️ Popup visibility info:', visibilityInfo);
      return visibilityInfo;
    }
  };
  
  console.log('🛠️ Debug functions available:');
  console.log('- window.noditDebug.checkStatus() - Check extension status');
  console.log('- window.noditDebug.testAddress(address) - Test address validity');
  console.log('- window.noditDebug.forceEnable() - Force enable extension');
  console.log('- window.noditDebug.showButtonAtCenter(address?) - Show button at screen center');
  console.log('- window.noditDebug.showButtonForSelection() - Show button for current selection');
  console.log('- window.noditDebug.hideButton() - Hide button and popup');
  console.log('- window.noditDebug.showPopupAtCenter(address?) - Show popup at screen center');
  console.log('- window.noditDebug.testPopupVisibility() - Test popup visibility and styling');
};

// Initialize immediately
initializeContentScript();

// Listen for storage changes (다른 탭에서 설정 변경 시 동기화)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    console.log('📦 Storage changed in content script:', changes);
    
    if (changes.isEnabled) {
      console.log('Extension state changed:', changes.isEnabled);
      isEnabled = changes.isEnabled.newValue ?? false;
      
      // 상태가 비활성화되면 UI 숨김
      if (!isEnabled && floatingButton && popupBox) {
        floatingButton.style.display = 'none';
        popupBox.style.display = 'none';
      }
      
      console.log(`🔄 Extension ${isEnabled ? 'ENABLED' : 'DISABLED'} via storage sync`);
    }
    
    if (changes.isTransactionCheckerEnabled) {
      console.log('Transaction Tracker state changed:', changes.isTransactionCheckerEnabled);
      // Transaction Tracker 상태 변경 처리 (필요시 추가 로직 구현)
    }
  }
});

// Note: MetaMask-related messaging is now handled by metamask-content.tsx

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message, 'from:', sender);

  if (message.type === 'PING') {
    console.log('PING received, sending PONG');
    sendResponse({ type: 'PONG', initialized: isInitialized });
    return true;
  }
  
  if (message.type === 'TOGGLE_EXTENSION') {
    console.log('TOGGLE_EXTENSION received:', message.isEnabled);
    isEnabled = message.isEnabled;
    if (!isEnabled && floatingButton && popupBox) {
      floatingButton.style.display = 'none';
      popupBox.style.display = 'none';
    }
  }

  // MetaMask-related messages are now handled by metamask-content.tsx
  // GET_METAMASK_INFO, REQUEST_ACCOUNTS, DISCONNECT_WALLET

  if (message.type === 'TOGGLE_TRANSACTION_CHECKER') {
    console.log('TOGGLE_TRANSACTION_CHECKER received:', message.isEnabled);
    // Transaction Tracker 상태 처리 (필요시 추가 로직 구현)
  }

  if (message.type === 'STATE_SYNC_RESPONSE') {
    console.log('STATE_SYNC_RESPONSE received:', message.state);
    // Background script에서 받은 최신 상태로 업데이트
    if (message.state) {
      isEnabled = message.state.isEnabled ?? false;
      console.log('🔄 State synchronized from background:', message.state);
      
      // 상태가 비활성화되면 UI 숨김
      if (!isEnabled && floatingButton && popupBox) {
        floatingButton.style.display = 'none';
        popupBox.style.display = 'none';
      }
    }
  }
});