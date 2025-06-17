import React, { useEffect, useState } from 'react';

interface Account {
  account: string;
  chainId: number;
}

interface MultiChainAnalysisProps {
  account: Account | null;
  noditApiKey: string | null;
}

// 지원하는 체인과 네트워크 (메인넷 + 테스트넷)
const SUPPORTED_NETWORKS = [
  // Ethereum
  { protocol: 'ethereum', network: 'mainnet', name: 'Ethereum', chainId: 1, color: '#627EEA', isTestnet: false, icon: '⟠' },
  { protocol: 'ethereum', network: 'sepolia', name: 'Sepolia', chainId: 11155111, color: '#627EEA', isTestnet: true, icon: '⟠' },
  
  // Polygon
  { protocol: 'polygon', network: 'mainnet', name: 'Polygon', chainId: 137, color: '#8247E5', isTestnet: false, icon: '⬟' },
  { protocol: 'polygon', network: 'amoy', name: 'Amoy', chainId: 80002, color: '#8247E5', isTestnet: true, icon: '⬟' },
  
  // Arbitrum
  { protocol: 'arbitrum', network: 'mainnet', name: 'Arbitrum', chainId: 42161, color: '#12AAFF', isTestnet: false, icon: '◆' },
  { protocol: 'arbitrum', network: 'sepolia', name: 'Arbitrum Sepolia', chainId: 421614, color: '#12AAFF', isTestnet: true, icon: '◆' },
  
  // Optimism
  { protocol: 'optimism', network: 'mainnet', name: 'Optimism', chainId: 10, color: '#FF0420', isTestnet: false, icon: '○' },
  { protocol: 'optimism', network: 'sepolia', name: 'OP Sepolia', chainId: 11155420, color: '#FF0420', isTestnet: true, icon: '○' },
  
  // Base
  { protocol: 'base', network: 'mainnet', name: 'Base', chainId: 8453, color: '#0052FF', isTestnet: false, icon: '🔷' },
  { protocol: 'base', network: 'sepolia', name: 'Base Sepolia', chainId: 84532, color: '#0052FF', isTestnet: true, icon: '🔷' },
];

// 탭 타입
type TabType = 'transactions' | 'tokens' | 'nfts';

interface TransactionData {
  transactions: any[];
  tokens: any[];
  nfts: any[];
  lastUpdated: number;
}

// Nodit API 호출 함수 (올바른 URL과 파라미터 사용)
const callNoditAPI = async (apiType: 'blockchain' | 'token' | 'nft', operationId: string, protocol: string, network: string, address: string, apiKey: string) => {
  try {
    console.log(`🔗 Calling Nodit API: ${operationId} for ${protocol}/${network} with address ${address}`);
    
    const url = `https://web3.nodit.io/v1/${protocol}/${network}/${apiType}/${operationId}`;
    
    let requestBody: any = {
      accountAddress: address,
      withCount: false,
      withLogs: false,
      withDecode: true
    };

    // API별 추가 파라미터 설정
    if (operationId === 'getTransactionsByAccount') {
      // 트랜잭션 API는 기본 파라미터만 사용
    } else if (operationId === 'getTokenTransfersByAccount') {
      // 토큰 API: withZeroValue 파라미터 추가
      requestBody.withZeroValue = false;
      // 향후 rpp, page 등도 추가 가능
    } else if (operationId === 'getNftTransfersByAccount') {
      // NFT API 추가 파라미터 (향후 구현)
    }

    console.log(`📤 Request URL: ${url}`);
    console.log(`📤 Request Body:`, requestBody);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Response Error (${response.status}):`, errorText);
      throw new Error(`API 호출 실패: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ API Response for ${operationId}:`, data);
    
    // items 배열이 있으면 반환, 없으면 빈 배열
    return data.items || [];
  } catch (error) {
    console.error(`❌ Nodit API 호출 실패 (${operationId}):`, error);
    return [];
  }
};

export const MultiChainAnalysis: React.FC<MultiChainAnalysisProps> = ({ account, noditApiKey }) => {
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [networkData, setNetworkData] = useState<{ [key: string]: TransactionData }>({});
  const [loadingNetworks, setLoadingNetworks] = useState<Set<string>>(new Set());
  const [expandedNetworks, setExpandedNetworks] = useState<Set<string>>(new Set());
  const [showTestnets, setShowTestnets] = useState(false);
  const [copiedHashes, setCopiedHashes] = useState<Set<string>>(new Set());

  // 연결된 체인 우선 정렬
  const sortedNetworks = [...SUPPORTED_NETWORKS].sort((a, b) => {
    const aIsConnected = account?.chainId === a.chainId;
    const bIsConnected = account?.chainId === b.chainId;
    
    if (aIsConnected && !bIsConnected) return -1;
    if (!aIsConnected && bIsConnected) return 1;
    return 0;
  });

  // 표시할 네트워크 필터링
  const visibleNetworks = sortedNetworks.filter(network => 
    showTestnets || !network.isTestnet
  );

  // 데이터 로딩
  const loadNetworkData = async (networkConfig: typeof SUPPORTED_NETWORKS[0]) => {
    if (!account?.account || !noditApiKey) {
      console.log('❌ Missing account or API key');
      return;
    }

    const networkKey = `${networkConfig.protocol}_${networkConfig.network}`;
    
    // 캐시된 데이터 확인 (3분 TTL)
    const cacheKey = `multichain_${networkKey}_${account.account}`;
    const cached = await chrome.storage.local.get([cacheKey]);
    
    if (cached[cacheKey] && Date.now() - cached[cacheKey].lastUpdated < 3 * 60 * 1000) {
      console.log(`📦 Using cached data for ${networkKey}`);
      setNetworkData(prev => ({
        ...prev,
        [networkKey]: cached[cacheKey]
      }));
      return;
    }

    console.log(`🔄 Loading fresh data for ${networkKey}`);
    setLoadingNetworks(prev => new Set([...prev, networkKey]));

    try {
      // 3개 API 병렬 호출
      const [transactions, tokens, nfts] = await Promise.allSettled([
        callNoditAPI('blockchain', 'getTransactionsByAccount', networkConfig.protocol, networkConfig.network, account.account, noditApiKey),
        callNoditAPI('token', 'getTokenTransfersByAccount', networkConfig.protocol, networkConfig.network, account.account, noditApiKey),
        callNoditAPI('nft', 'getNftTransfersByAccount', networkConfig.protocol, networkConfig.network, account.account, noditApiKey),
      ]);

      const newNetworkData: TransactionData = {
        transactions: transactions.status === 'fulfilled' ? transactions.value : [],
        tokens: tokens.status === 'fulfilled' ? tokens.value : [],
        nfts: nfts.status === 'fulfilled' ? nfts.value : [],
        lastUpdated: Date.now(),
      };

      console.log(`📊 Data loaded for ${networkKey}:`, {
        transactions: newNetworkData.transactions.length,
        tokens: newNetworkData.tokens.length,
        nfts: newNetworkData.nfts.length
      });

      // 상태 업데이트
      setNetworkData(prev => ({
        ...prev,
        [networkKey]: newNetworkData
      }));

      // 캐시 저장
      await chrome.storage.local.set({
        [cacheKey]: newNetworkData
      });

    } catch (error) {
      console.error(`❌ ${networkKey} 데이터 로딩 실패:`, error);
    } finally {
      setLoadingNetworks(prev => {
        const newSet = new Set(prev);
        newSet.delete(networkKey);
        return newSet;
      });
    }
  };

  // 네트워크 토글
  const toggleNetwork = (networkConfig: typeof SUPPORTED_NETWORKS[0]) => {
    const networkKey = `${networkConfig.protocol}_${networkConfig.network}`;
    const newExpanded = new Set(expandedNetworks);
    
    if (newExpanded.has(networkKey)) {
      newExpanded.delete(networkKey);
    } else {
      newExpanded.add(networkKey);
      // 데이터가 없으면 로딩
      if (!networkData[networkKey]) {
        loadNetworkData(networkConfig);
      }
    }
    
    setExpandedNetworks(newExpanded);
  };

  // 컴포넌트 마운트 시 연결된 체인 자동 로딩
  useEffect(() => {
    if (account && noditApiKey) {
      const connectedNetwork = SUPPORTED_NETWORKS.find(n => n.chainId === account.chainId);
      if (connectedNetwork) {
        const networkKey = `${connectedNetwork.protocol}_${connectedNetwork.network}`;
        console.log(`🎯 Auto-expanding connected network: ${networkKey}`);
        setExpandedNetworks(new Set([networkKey]));
        loadNetworkData(connectedNetwork);
      }
    }
  }, [account, noditApiKey]);

  // 주소 단축
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 값 포맷팅
  const formatValue = (value: string, decimals: number = 18) => {
    try {
      const num = parseFloat(value) / Math.pow(10, decimals);
      if (num === 0) return '0';
      if (num < 0.0001) return '<0.0001';
      return num.toFixed(4);
    } catch {
      return value;
    }
  };

  // 해시 복사
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('📋 복사됨:', text);
      
      // 복사 상태 업데이트
      setCopiedHashes(prev => new Set([...prev, text]));
      
      // 2초 후 복사 상태 제거
      setTimeout(() => {
        setCopiedHashes(prev => {
          const newSet = new Set(prev);
          newSet.delete(text);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('복사 실패:', error);
  }
  };

  // 탭 데이터 렌더링
  const renderTabContent = (data: TransactionData, networkColor: string) => {
    const currentData = data[activeTab];
    
    if (!currentData || currentData.length === 0) {
  return (
          <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          fontSize: '11px'
        }}>
          <div style={{ fontSize: '20px', marginBottom: '8px', opacity: 0.3 }}>
            {activeTab === 'transactions' ? '💳' : 
             activeTab === 'tokens' ? '🪙' : '🖼️'}
          </div>
          <div>
            {activeTab === 'transactions' ? '트랜잭션이' : 
             activeTab === 'tokens' ? '토큰 전송이' : 'NFT 전송이'} 없습니다
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '6px' }}>
        {currentData.slice(0, 10).map((item: any, index: number) => (
          <div key={index} style={{
            backgroundColor: '#161616',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '6px',
            border: '1px solid #2a2a2a',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1a1a1a';
            e.currentTarget.style.borderColor = networkColor + '40';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#161616';
            e.currentTarget.style.borderColor = '#2a2a2a';
          }}
          >
            {/* 상단: 시간과 송수신 표시 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{
                fontSize: '9px',
                color: '#888',
                fontWeight: '500'
              }}>
                {new Date(item.timestamp * 1000).toLocaleString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
            </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {/* 해시 복사 버튼 */}
                {(item.transactionHash || item.hash) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const hash = item.transactionHash || item.hash;
                      if (!copiedHashes.has(hash)) {
                        copyToClipboard(hash);
                      }
                    }}
                    disabled={copiedHashes.has(item.transactionHash || item.hash)}
                    style={{
                      backgroundColor: copiedHashes.has(item.transactionHash || item.hash) 
                        ? '#10b981' 
                        : 'transparent',
                      border: copiedHashes.has(item.transactionHash || item.hash)
                        ? '1px solid #10b981'
                        : `1px solid ${networkColor}40`,
                      borderRadius: '4px',
                      color: copiedHashes.has(item.transactionHash || item.hash)
                        ? 'white'
                        : networkColor,
                      fontSize: '8px',
                      padding: '2px 6px',
                      cursor: copiedHashes.has(item.transactionHash || item.hash) 
                        ? 'default' 
                        : 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      opacity: copiedHashes.has(item.transactionHash || item.hash) ? 1 : 1
              }}
                    onMouseEnter={(e) => {
                      if (!copiedHashes.has(item.transactionHash || item.hash)) {
                        e.currentTarget.style.backgroundColor = networkColor + '20';
                }
              }}
                    onMouseLeave={(e) => {
                      if (!copiedHashes.has(item.transactionHash || item.hash)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
                    {copiedHashes.has(item.transactionHash || item.hash) ? '✅ 복사됨' : '📋 Hash'}
            </button>
                )}
                
                {/* 송신/수신 표시 */}
                <div style={{
                  backgroundColor: item.from?.toLowerCase() === account?.account.toLowerCase() ? '#ef4444' : '#10b981',
                  color: 'white',
                  fontSize: '8px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}>
                  {item.from?.toLowerCase() === account?.account.toLowerCase() ? '↗️ 송신' : '↙️ 수신'}
                </div>
              </div>
          </div>
          
            {/* 중간: 주소 정보 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '10px', 
                  color: '#ccc',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ color: '#888', fontSize: '8px' }}>From:</span>
                  <span style={{ fontFamily: 'monospace', color: '#aaa' }}>
                    {formatAddress(item.from)}
                  </span>
                </div>
              <div style={{
                  fontSize: '10px', 
                  color: '#ccc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ color: '#888', fontSize: '8px' }}>To:</span>
                  <span style={{ fontFamily: 'monospace', color: '#aaa' }}>
                    {formatAddress(item.to)}
                  </span>
                </div>
              </div>
              
              {/* 값 표시 */}
              <div style={{
                textAlign: 'right',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end'
              }}>
                {activeTab === 'transactions' && item.value && (
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: item.from?.toLowerCase() === account?.account.toLowerCase() ? '#ef4444' : '#10b981'
                  }}>
                    {item.from?.toLowerCase() === account?.account.toLowerCase() ? '-' : '+'}
                    {formatValue(item.value)} ETH
                  </div>
                )}
                {activeTab === 'tokens' && (
                  <>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: item.from?.toLowerCase() === account?.account.toLowerCase() ? '#ef4444' : '#10b981'
                    }}>
                      {item.from?.toLowerCase() === account?.account.toLowerCase() ? '-' : '+'}
                      {formatValue(item.value, item.contract?.decimals)}
                    </div>
                    <div style={{
                      fontSize: '9px',
                      color: '#888'
                    }}>
                      {item.contract?.symbol || 'TOKEN'}
                    </div>
                  </>
                )}
                {activeTab === 'nfts' && (
                  <>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: networkColor
                    }}>
                      #{item.nft?.tokenId || item.tokenId}
                    </div>
                    <div style={{
                      fontSize: '9px',
                      color: '#888'
                    }}>
                      {item.contract?.symbol || 'NFT'}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!account) {
    return (
      <div style={{
        backgroundColor: '#0a0a0a',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #1a1a1a',
        textAlign: 'center',
        margin: '12px 0'
      }}>
        <div style={{ 
          fontSize: '32px', 
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          🔗
        </div>
        <div style={{ fontSize: '14px', color: '#fff', marginBottom: '6px', fontWeight: '600' }}>
          멀티체인 분석
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          지갑을 연결하면 멀티체인 분석을 시작할 수 있습니다
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      borderRadius: '12px',
      padding: '12px',
      border: '1px solid #1a1a1a',
      margin: '12px 0'
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'white'
          }}>
            멀티체인 분석
          </div>
          <div style={{
            fontSize: '10px',
            color: '#888',
            fontFamily: 'monospace'
          }}>
            {formatAddress(account.account)}
          </div>
        </div>
        
        {/* 테스트넷 토글 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#888', fontWeight: '500' }}>테스트넷</span>
          <button
            onClick={() => setShowTestnets(!showTestnets)}
            style={{
              width: '36px',
              height: '20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: showTestnets ? '#00d16c' : '#333',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              boxShadow: showTestnets ? '0 0 0 2px rgba(0, 209, 108, 0.2)' : 'none'
            }}
          >
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: 'white',
              position: 'absolute',
              top: '2px',
              left: showTestnets ? '18px' : '2px',
              transition: 'left 0.3s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>
      </div>

      {/* 네트워크 카드들 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {visibleNetworks.map((network) => {
          const networkKey = `${network.protocol}_${network.network}`;
          const isExpanded = expandedNetworks.has(networkKey);
          const isConnected = account.chainId === network.chainId;
          const isLoading = loadingNetworks.has(networkKey);
          const data = networkData[networkKey];

          return (
            <div key={networkKey} style={{
              backgroundColor: '#111111',
              borderRadius: '12px',
              border: `1px solid ${isConnected ? network.color : '#222'}`,
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              boxShadow: isConnected ? `0 0 16px ${network.color}20` : '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {/* 네트워크 헤더 */}
              <div
                onClick={() => toggleNetwork(network)}
                style={{ 
                  padding: '12px',
                  background: isConnected 
                    ? `linear-gradient(135deg, ${network.color}20 0%, ${network.color}10 100%)`
                    : 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)',
                  borderBottom: isExpanded ? '1px solid #222' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${network.color}15 0%, ${network.color}05 100%)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.background = isConnected 
                      ? `linear-gradient(135deg, ${network.color}20 0%, ${network.color}10 100%)`
                      : 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: network.color + '20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    color: network.color,
                    border: `1px solid ${network.color}40`
                  }}>
                    {network.icon}
                  </div>
                  <div>
              <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '2px'
              }}>
                      {network.name}
                      {isConnected && (
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                          boxShadow: '0 0 6px #10b981'
                        }} />
                      )}
                      {network.isTestnet && (
                        <span style={{
                          fontSize: '8px',
                          backgroundColor: '#f59e0b',
                          color: 'black',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          fontWeight: '600'
                        }}>
                          TEST
                        </span>
                      )}
              </div>
              <div style={{
                      fontSize: '10px', 
                      color: '#888',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      ID: {network.chainId}
                      {data && (
                        <span style={{
                          fontSize: '9px',
                          backgroundColor: '#333',
                color: '#aaa',
                          padding: '1px 3px',
                          borderRadius: '2px'
                        }}>
                          {data.transactions.length + data.tokens.length + data.nfts.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div style={{
                  fontSize: '12px',
                  color: network.color,
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease'
                }}>
                  ▼
                </div>
              </div>

              {/* 확장된 컨텐츠 */}
              {isExpanded && (
                <div>
                  {/* 탭 네비게이션 */}
                  <div style={{
                    display: 'flex',
                    backgroundColor: '#0a0a0a',
                    borderBottom: '1px solid #222'
                  }}>
                    {(['transactions', 'tokens', 'nfts'] as TabType[]).map((tab) => (
              <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                style={{
                          flex: 1,
                          padding: '10px 8px',
                          backgroundColor: activeTab === tab ? network.color + '15' : 'transparent',
                          color: activeTab === tab ? network.color : '#888',
                  border: 'none',
                          fontSize: '11px',
                          fontWeight: '600',
                  cursor: 'pointer',
                          borderBottom: activeTab === tab ? `2px solid ${network.color}` : '2px solid transparent',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <span style={{ fontSize: '10px' }}>
                          {tab === 'transactions' ? '💳' : tab === 'tokens' ? '🪙' : '🖼️'}
                        </span>
                        <span>
                          {tab === 'transactions' ? 'TX' : tab === 'tokens' ? 'Token' : 'NFT'}
                        </span>
                        {data && data[tab] && (
                          <span style={{
                            fontSize: '9px',
                            backgroundColor: activeTab === tab ? network.color + '30' : '#333',
                            color: activeTab === tab ? 'white' : '#aaa',
                            padding: '1px 4px',
                            borderRadius: '6px',
                            minWidth: '16px',
                            textAlign: 'center'
                          }}>
                            {data[tab].length}
                          </span>
                        )}
              </button>
                    ))}
                  </div>

                  {/* 컨텐츠 영역 */}
                  <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    {isLoading ? (
                      <div style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: '#888'
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          border: `2px solid #333`,
                          borderTop: `2px solid ${network.color}`,
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          margin: '0 auto 12px'
                        }} />
                        <div style={{ fontSize: '11px', fontWeight: '500' }}>
                          {network.name} 데이터 로딩 중...
                        </div>
                      </div>
                    ) : data ? (
                      renderTabContent(data, network.color)
                    ) : (
                      <div style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '11px'
                      }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.3 }}>
                          📊
                        </div>
                        <div>데이터를 로딩하려면 클릭하세요</div>
                      </div>
                    )}
                  </div>
            </div>
          )}
        </div>
          );
        })}
      </div>

      {/* 전체 새로고침 버튼 */}
      {expandedNetworks.size > 0 && (
        <div style={{
          marginTop: '12px',
          textAlign: 'center'
        }}>
          <button
            onClick={() => {
              // 모든 캐시 삭제 후 다시 로딩
              setNetworkData({});
              expandedNetworks.forEach(networkKey => {
                const [protocol, network] = networkKey.split('_');
                const networkConfig = SUPPORTED_NETWORKS.find(n => 
                  n.protocol === protocol && n.network === network
                );
                if (networkConfig) {
                  loadNetworkData(networkConfig);
                }
              });
            }}
            style={{
              backgroundColor: '#1a1a1a',
              color: 'white',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              margin: '0 auto',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#222';
              e.currentTarget.style.borderColor = '#444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1a1a1a';
              e.currentTarget.style.borderColor = '#333';
            }}
          >
            🔄 전체 새로고침
          </button>
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}; 