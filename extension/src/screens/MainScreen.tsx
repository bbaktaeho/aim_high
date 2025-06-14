import React, { useEffect, useState } from 'react';
import { styles } from './styles';

interface MainScreenProps {
  onOpenOptions: () => void;
}

// TransactionData 타입 임시 정의 (필요시 수정)
type TransactionData = {
  from: string;
  to: string;
  value: string;
  chainId?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  timestamp?: number;
  [key: string]: any;
};

// Chain configuration
const CHAIN_CONFIG = {
  // Mainnet chains
  1: { name: 'Ethereum', protocol: 'ethereum', network: 'mainnet', color: '#627EEA', nativeToken: 'ETH', decimals: 18 },
  137: { name: 'Polygon', protocol: 'polygon', network: 'mainnet', color: '#8247E5', nativeToken: 'MATIC', decimals: 18 },
  42161: { name: 'Arbitrum', protocol: 'arbitrum', network: 'mainnet', color: '#28A0F0', nativeToken: 'ETH', decimals: 18 },
  8453: { name: 'Base', protocol: 'base', network: 'mainnet', color: '#0052FF', nativeToken: 'ETH', decimals: 18 },
  10: { name: 'Optimism', protocol: 'optimism', network: 'mainnet', color: '#FF0420', nativeToken: 'ETH', decimals: 18 },
  8217: { name: 'Kaia', protocol: 'kaia', network: 'mainnet', color: '#FF6B35', nativeToken: 'KAIA', decimals: 18 },
  
  // Testnet chains
  11155111: { name: 'Ethereum Sepolia', protocol: 'ethereum', network: 'sepolia', color: '#627EEA', nativeToken: 'ETH', decimals: 18 },
  80002: { name: 'Polygon Amoy', protocol: 'polygon', network: 'amoy', color: '#8247E5', nativeToken: 'MATIC', decimals: 18 },
  421614: { name: 'Arbitrum Sepolia', protocol: 'arbitrum', network: 'sepolia', color: '#28A0F0', nativeToken: 'ETH', decimals: 18 },
  84532: { name: 'Base Sepolia', protocol: 'base', network: 'sepolia', color: '#0052FF', nativeToken: 'ETH', decimals: 18 },
  11155420: { name: 'Optimism Sepolia', protocol: 'optimism', network: 'sepolia', color: '#FF0420', nativeToken: 'ETH', decimals: 18 },
  1001: { name: 'Kaia Testnet', protocol: 'kaia', network: 'testnet', color: '#FF6B35', nativeToken: 'KAIA', decimals: 18 },
};

// Account stats interface
interface AccountStats {
  protocol: string;
  network: string;
  chainName: string;
  nativeBalance: string;
  transactionCount: number;
  tokenCount: number;
  nftCount: number;
  color: string;
  nativeToken: string;
}

// Transaction info component
const TransactionInfo: React.FC<{ data: TransactionData }> = ({ data }) => {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      backgroundColor: '#F9FAFB',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
    }}>
      <div style={styles.accountTitle}>트랜잭션 정보</div>
      <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>
        <div>From: {formatAddress(data.from)}</div>
        <div>To: {formatAddress(data.to)}</div>
        <div>Value: {data.value} wei</div>
        <div>Chain ID: {data.chainId}</div>
        <div>Gas Price: {data.gasPrice || data.maxFeePerGas || '0'} wei</div>
        <div>Time: {data.timestamp ? new Date(data.timestamp).toLocaleString() : '-'}</div>
      </div>
    </div>
  );
};

// Account Stats Card Component
const AccountStatsCard: React.FC<{ stats: AccountStats; isActive: boolean }> = ({ stats, isActive }) => {
  const formatBalance = (balance: string, nativeToken: string) => {
    try {
      // Get decimals from chain config
      const chainConfig = Object.values(CHAIN_CONFIG).find(config => 
        config.protocol === stats.protocol && config.nativeToken === nativeToken
      );
      const decimals = chainConfig?.decimals || 18;
      
      // Convert balance from wei to readable format
      const balanceNum = parseFloat(balance) / Math.pow(10, decimals);
      
      // Format based on balance size
      if (balanceNum === 0) return '0';
      if (balanceNum < 0.0001) return '< 0.0001';
      if (balanceNum < 1) return balanceNum.toFixed(6);
      if (balanceNum < 1000) return balanceNum.toFixed(4);
      return balanceNum.toFixed(2);
    } catch (error) {
      console.error('Error formatting balance:', error);
      return '0';
    }
  };

  return (
    <div style={{
      minWidth: '280px',
      padding: '20px',
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      border: `2px solid ${isActive ? stats.color : '#E5E7EB'}`,
      marginRight: '16px',
      boxShadow: isActive ? `0 4px 12px ${stats.color}20` : '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: stats.color,
          }} />
          <span style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937',
          }}>
            {stats.chainName}
          </span>
        </div>
        {isActive && (
          <span style={{
            fontSize: '12px',
            color: stats.color,
            fontWeight: '500',
            backgroundColor: `${stats.color}15`,
            padding: '4px 8px',
            borderRadius: '12px',
          }}>
            Current
          </span>
        )}
      </div>

      {/* Native Balance */}
      <div style={{
        backgroundColor: '#F9FAFB',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px',
      }}>
        <div style={{
          fontSize: '12px',
          color: '#6B7280',
          marginBottom: '4px',
        }}>
          Native Balance
        </div>
        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1F2937',
        }}>
          {formatBalance(stats.nativeBalance, stats.nativeToken)} {stats.nativeToken}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '8px',
          backgroundColor: '#F3F4F6',
          borderRadius: '6px',
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937',
          }}>
            {stats.transactionCount.toLocaleString()}
          </div>
          <div style={{
            fontSize: '10px',
            color: '#6B7280',
            marginTop: '2px',
          }}>
            Transactions
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '8px',
          backgroundColor: '#F3F4F6',
          borderRadius: '6px',
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937',
          }}>
            {stats.tokenCount}
          </div>
          <div style={{
            fontSize: '10px',
            color: '#6B7280',
            marginTop: '2px',
          }}>
            Tokens
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '8px',
          backgroundColor: '#F3F4F6',
          borderRadius: '6px',
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937',
          }}>
            {stats.nftCount}
          </div>
          <div style={{
            fontSize: '10px',
            color: '#6B7280',
            marginTop: '2px',
          }}>
            NFTs
          </div>
        </div>
      </div>
    </div>
  );
};

// Carousel Component
const AccountCarousel: React.FC<{ accountStats: AccountStats[]; currentChainId: number }> = ({ 
  accountStats, 
  currentChainId 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Set current chain as active initially
    const currentChainIndex = accountStats.findIndex(stats => 
      CHAIN_CONFIG[currentChainId as keyof typeof CHAIN_CONFIG]?.protocol === stats.protocol
    );
    if (currentChainIndex !== -1) {
      setCurrentIndex(currentChainIndex);
    }
  }, [accountStats, currentChainId]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % accountStats.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + accountStats.length) % accountStats.length);
  };

  if (accountStats.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6B7280',
        backgroundColor: '#F9FAFB',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
      }}>
        No account data available
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Carousel Container */}
      <div style={{
        overflow: 'hidden',
        borderRadius: '12px',
      }}>
        <div style={{
          display: 'flex',
          transform: `translateX(-${currentIndex * 296}px)`,
          transition: 'transform 0.3s ease',
        }}>
          {accountStats.map((stats, index) => (
            <AccountStatsCard
              key={`${stats.protocol}-${stats.network}`}
              stats={stats}
              isActive={CHAIN_CONFIG[currentChainId as keyof typeof CHAIN_CONFIG]?.protocol === stats.protocol}
            />
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {accountStats.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            style={{
              position: 'absolute',
              left: '-12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={nextSlide}
            style={{
              position: 'absolute',
              right: '-12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {accountStats.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '16px',
        }}>
          {accountStats.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: index === currentIndex ? '#10B981' : '#D1D5DB',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const MainScreen: React.FC<MainScreenProps> = ({ onOpenOptions }) => {
  console.log('MainScreen component mounted');

  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState<boolean | null>(null);
  const [isContentScriptReady, setIsContentScriptReady] = useState(false);
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [isRequestPending, setIsRequestPending] = useState(false);
  const [accountStats, setAccountStats] = useState<AccountStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [noditApiKey, setNoditApiKey] = useState<string | null>(null);

  // Load Nodit API key
  useEffect(() => {
    chrome.storage.local.get(['noditApiKey'], (result) => {
      setNoditApiKey(result.noditApiKey || null);
    });
  }, []);

  // Call Nodit API helper function
  const callNoditAPI = async (protocol: string, network: string, operationId: string, requestBody: any): Promise<any> => {
    if (!noditApiKey) {
      throw new Error('Nodit API key not found');
    }

    const response = await fetch(`https://web3.nodit.io/v1/${protocol}/${network}/${operationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': noditApiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    return response.json();
  };

  // Load account stats for all supported chains
  const loadAccountStats = async (address: string) => {
    if (!noditApiKey) {
      console.log('No Nodit API key available');
      return;
    }

    setIsLoadingStats(true);
    const stats: AccountStats[] = [];

    try {
      // Process each supported chain
      for (const [chainIdStr, config] of Object.entries(CHAIN_CONFIG)) {
        try {
          console.log(`Loading stats for ${config.name}...`);

          // Get native balance
          const balanceResponse = await callNoditAPI(
            config.protocol,
            config.network,
            'getNativeBalanceByAccount',
            { accountAddress: address }
          );

          // Get transaction count
          const txCountResponse = await callNoditAPI(
            config.protocol,
            config.network,
            'getTotalTransactionCountByAccount',
            { accountAddress: address }
          );

          // Get token count
          let tokenCount = 0;
          try {
            const tokensResponse = await callNoditAPI(
              config.protocol,
              config.network,
              'getTokensOwnedByAccount',
              { 
                accountAddress: address,
                withCount: true,
                limit: 1
              }
            );
            tokenCount = tokensResponse?.totalCount || 0;
          } catch (err) {
            console.log(`Token count failed for ${config.name}:`, err);
          }

          // Get NFT count
          let nftCount = 0;
          try {
            const nftsResponse = await callNoditAPI(
              config.protocol,
              config.network,
              'getNftsOwnedByAccount',
              { 
                accountAddress: address,
                withCount: true,
                limit: 1
              }
            );
            nftCount = nftsResponse?.totalCount || 0;
          } catch (err) {
            console.log(`NFT count failed for ${config.name}:`, err);
          }

          // Safely extract values with fallbacks
          const nativeBalance = balanceResponse?.balance || '0';
          const transactionCount = txCountResponse?.transactionCount || 0;

          // Only add chains with activity (transactions or balance > 0)
          const hasBalance = parseFloat(nativeBalance) > 0;
          const hasTransactions = transactionCount > 0;
          
          if (hasTransactions || hasBalance) {
            stats.push({
              protocol: config.protocol,
              network: config.network,
              chainName: config.name,
              nativeBalance,
              transactionCount,
              tokenCount,
              nftCount,
              color: config.color,
              nativeToken: config.nativeToken,
            });

            console.log(`✅ ${config.name} stats loaded:`, {
              balance: nativeBalance,
              transactions: transactionCount,
              tokens: tokenCount,
              nfts: nftCount,
            });
          } else {
            console.log(`⚪ ${config.name} - No activity found`);
          }

        } catch (err) {
          console.log(`❌ Failed to load stats for ${config.name}:`, err);
          // Continue with other chains even if one fails
        }
      }

      // Sort by transaction count (most active first), then by balance
      stats.sort((a, b) => {
        if (b.transactionCount !== a.transactionCount) {
          return b.transactionCount - a.transactionCount;
        }
        return parseFloat(b.nativeBalance) - parseFloat(a.nativeBalance);
      });
      
      setAccountStats(stats);

      console.log(`📊 Loaded stats for ${stats.length} chains with activity`);

    } catch (err) {
      console.error('Error loading account stats:', err);
      setError('Failed to load account statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Check if content script is ready
  const checkContentScriptReady = async (tabId: number): Promise<boolean> => {
    try {
      console.log('Checking content script readiness...');
      const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      console.log('Content script ping response:', response);
      return response?.type === 'PONG' && response?.initialized === true;
    } catch (err) {
      console.error('Error checking content script:', err);
      return false;
    }
  };

  // Inject content script if not ready
  const injectContentScript = async (tabId: number) => {
    try {
      console.log('Injecting content script...');
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      console.log('Content script injected');
      return true;
    } catch (err) {
      console.error('Error injecting content script:', err);
      return false;
    }
  };

  useEffect(() => {
    console.log('MainScreen useEffect triggered');

    const initializeContentScript = async () => {
      try {
        // Get the active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (!currentTab?.id) {
          console.log('Invalid tab:', currentTab);
          return;
        }

        // Check if content script is ready
        let isReady = await checkContentScriptReady(currentTab.id);
        
        // If not ready, try to inject it
        if (!isReady) {
          console.log('Content script not ready, attempting to inject...');
          const injected = await injectContentScript(currentTab.id);
          if (injected) {
            // Wait a bit for the script to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
            isReady = await checkContentScriptReady(currentTab.id);
          }
        }

        setIsContentScriptReady(isReady);
        console.log('Content script ready:', isReady);

        if (isReady) {
          // Now we can safely send the MetaMask info request
          const response = await chrome.tabs.sendMessage(currentTab.id, { 
            type: 'GET_METAMASK_INFO' 
          });
          console.log('MetaMask info response:', response);

          if (response.type === 'METAMASK_INFO') {
            const ethereumInfo = response.data;
            console.log('MetaMask info:', ethereumInfo);

            if (!ethereumInfo) {
              setError('MetaMask is not installed or not available');
              setIsMetaMaskInstalled(false);
              return;
            }

            setIsMetaMaskInstalled(ethereumInfo.isMetaMask);

            if (ethereumInfo.isMetaMask) {
              if (ethereumInfo.selectedAddress) {
                setAccount(ethereumInfo.selectedAddress);
                
                // Get chain ID but don't auto-load stats
                if (ethereumInfo.chainId) {
                  const chainIdNum = parseInt(ethereumInfo.chainId, 16);
                  setChainId(chainIdNum);
                  console.log('Current chain ID:', chainIdNum);
                  
                  // Don't auto-load account stats - user will click refresh button
                  console.log('Account connected. Click refresh to load statistics.');
                }
              }
            } else {
              setError('MetaMask is not installed');
            }
          }
        } else {
          setError('Failed to initialize content script');
        }
      } catch (err) {
        console.error('Error in initializeContentScript:', err);
        setError('Failed to access MetaMask');
      }
    };

    initializeContentScript();
  }, [noditApiKey]);

  // 트랜잭션 데이터 리스너 추가
  useEffect(() => {
    const handleTxChecker = (message: any, sender: any, sendResponse: any) => {
      if (message.type === 'TX_CHECKER_SEND') {
        const payload = message.payload;
        // 트랜잭션 데이터 구조 맞추기
        const txData: TransactionData = {
          from: payload.params?.[0]?.from || '',
          to: payload.params?.[0]?.to || '',
          value: payload.params?.[0]?.value || '',
          chainId: payload.params?.[0]?.chainId,
          gasPrice: payload.params?.[0]?.gasPrice,
          maxFeePerGas: payload.params?.[0]?.maxFeePerGas,
          timestamp: Date.now(),
          ...payload.params?.[0],
        };
        setTransactionData(txData);
      }
    };
    chrome.runtime.onMessage.addListener(handleTxChecker);
    return () => {
      chrome.runtime.onMessage.removeListener(handleTxChecker);
    };
  }, []);

  const handleConnectWallet = async () => {
    if (!isMetaMaskInstalled) {
      setError('MetaMask is not installed');
      return;
    }

    if (!isContentScriptReady) {
      setError('Content script not ready');
      return;
    }

    // 이미 연결 중이거나 요청이 진행 중이면 중복 요청 방지
    if (isConnecting || isRequestPending) {
      return;
    }

    setIsConnecting(true);
    setIsRequestPending(true);
    setError(null);

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab?.id) {
        throw new Error('Invalid tab');
      }

      // 먼저 현재 연결 상태 확인
      const infoResponse = await chrome.tabs.sendMessage(currentTab.id, { 
        type: 'GET_METAMASK_INFO' 
      });

      if (infoResponse.type === 'METAMASK_INFO' && infoResponse.data?.selectedAddress) {
        // 이미 연결된 상태라면 계정 정보만 업데이트
        setAccount(infoResponse.data.selectedAddress);
        
        // Get chain ID but don't auto-load stats
        if (infoResponse.data.chainId) {
          const chainIdNum = parseInt(infoResponse.data.chainId, 16);
          setChainId(chainIdNum);
          console.log('Current chain ID:', chainIdNum);
          
          // Don't auto-load account stats - user will click refresh button
          console.log('Account already connected. Click refresh to load statistics.');
        }
        return;
      }

      // 연결되지 않은 상태에서만 계정 요청
      const response = await chrome.tabs.sendMessage(currentTab.id, { 
        type: 'REQUEST_ACCOUNTS' 
      });
      console.log('Request accounts response:', response);

      if (response.type === 'ACCOUNTS_RESULT') {
        const accounts = response.data;
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          
          // Get updated MetaMask info including chain ID but don't auto-load stats
          const updatedInfoResponse = await chrome.tabs.sendMessage(currentTab.id, { 
            type: 'GET_METAMASK_INFO' 
          });
          
          if (updatedInfoResponse.type === 'METAMASK_INFO' && updatedInfoResponse.data?.chainId) {
            const chainIdNum = parseInt(updatedInfoResponse.data.chainId, 16);
            setChainId(chainIdNum);
            console.log('Current chain ID:', chainIdNum);
            
            // Don't auto-load account stats - user will click refresh button
            console.log('Account connected successfully. Click refresh to load statistics.');
          }
        } else {
          setError('No accounts found');
        }
      } else if (response.type === 'ACCOUNTS_ERROR') {
        const err = response.error;
        if (err.code === 4001) {
          setError('Please connect to MetaMask');
        } else if (err.code === -32002) {
          setError('Please check MetaMask popup');
        } else {
          setError(err.message || 'Failed to connect to MetaMask');
        }
      }
    } catch (err: any) {
      console.error('MetaMask connection error:', err);
      if (err.message?.includes('already pending')) {
        setError('Connection request is already pending. Please check MetaMask popup.');
      } else {
        setError('Failed to connect to MetaMask');
      }
    } finally {
      setIsConnecting(false);
      // 요청 상태는 약간의 지연 후 해제 (MetaMask 팝업이 닫힐 때까지 대기)
      setTimeout(() => {
        setIsRequestPending(false);
      }, 1000);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      // Get the active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab?.id || !currentTab.url?.startsWith('http')) {
        return;
      }

      // Send message to content script to disconnect
      await chrome.tabs.sendMessage(currentTab.id, { 
        type: 'DISCONNECT_WALLET' 
      });

      setAccount(null);
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Refresh account statistics
  const handleRefreshStats = async () => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (!noditApiKey) {
      setError('Please configure your Nodit API key in settings');
      return;
    }

    // Clear previous error
    setError(null);
    console.log('🔄 Refreshing account statistics...');
    
    try {
      await loadAccountStats(account);
    } catch (err) {
      console.error('Error refreshing stats:', err);
      setError('Failed to refresh account statistics. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={styles.header}>
        <h2 style={styles.title}>Nodit Extension</h2>
        <button onClick={onOpenOptions} style={styles.iconButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div style={styles.accountContainer}>
        <div style={styles.accountTitle}>
          {account ? 'Connected Account' : 'Connect Wallet'}
        </div>
        {isMetaMaskInstalled === false ? (
          <div style={styles.errorMessage}>
            Please install MetaMask to use this feature
          </div>
        ) : account ? (
          <>
            <div style={styles.accountAddress}>
              {formatAddress(account)}
            </div>
            {chainId && CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG] && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: '#F3F4F6',
                borderRadius: '8px',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG].color,
                }} />
                <span style={{
                  fontSize: '14px',
                  color: '#374151',
                  fontWeight: '500',
                }}>
                  {CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG].name}
                </span>
              </div>
            )}
            <button
              onClick={handleDisconnectWallet}
              style={styles.disconnectButton}
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              style={{
                ...styles.connectButton,
                opacity: isConnecting ? 0.8 : 1,
              }}
            >
              {isConnecting ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.loadingSpinner} />
                  Connecting...
                </div>
              ) : (
                'Connect MetaMask'
              )}
            </button>
            {error && (
              <div style={styles.errorMessage}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Multi-Chain Analysis Section - Only show when wallet is connected */}
      {account && (
        <>
          {/* Account Statistics Carousel */}
          {noditApiKey ? (
            <div style={{ marginTop: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1F2937',
                }}>
                  Multi-Chain Account Analysis
                </div>
                <button
                  onClick={handleRefreshStats}
                  disabled={isLoadingStats}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: isLoadingStats ? '#F3F4F6' : '#10B981',
                    color: isLoadingStats ? '#9CA3AF' : '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isLoadingStats ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    if (!isLoadingStats) {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isLoadingStats) {
                      e.currentTarget.style.backgroundColor = '#10B981';
                    }
                  }}
                >
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none"
                    style={{
                      transform: isLoadingStats ? 'rotate(360deg)' : 'rotate(0deg)',
                      transition: 'transform 1s linear',
                      animation: isLoadingStats ? 'spin 1s linear infinite' : 'none',
                    }}
                  >
                    <path 
                      d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  {isLoadingStats ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {isLoadingStats ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                }}>
                  <div style={styles.loadingSpinner} />
                  <div style={{
                    marginTop: '12px',
                    fontSize: '14px',
                    color: '#6B7280',
                  }}>
                    Loading account statistics...
                  </div>
                </div>
              ) : accountStats.length > 0 ? (
                <AccountCarousel 
                  accountStats={accountStats} 
                  currentChainId={chainId || 1} 
                />
              ) : (
                <div style={{
                  padding: '32px 20px',
                  textAlign: 'center',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                }}>
                  <svg 
                    width="48" 
                    height="48" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    style={{ 
                      margin: '0 auto 16px',
                      color: '#9CA3AF'
                    }}
                  >
                    <path 
                      d="M13 2L3 14H12L11 22L21 10H12L13 2Z" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Ready to analyze your account
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    marginBottom: '16px',
                  }}>
                    Click the refresh button above to load your multi-chain statistics
                  </div>
                  <button
                    onClick={handleRefreshStats}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#10B981';
                    }}
                  >
                    Load Statistics
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* API Key Required Message - Only show when wallet is connected but no API key */
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#FEF3C7',
              borderRadius: '8px',
              border: '1px solid #F59E0B',
            }}>
              <div style={{
                fontSize: '14px',
                color: '#92400E',
                fontWeight: '500',
                marginBottom: '4px',
              }}>
                Nodit API Key Required
              </div>
              <div style={{
                fontSize: '13px',
                color: '#92400E',
              }}>
                Please configure your Nodit API key in settings to view account analysis.
              </div>
            </div>
          )}
        </>
      )}

      {/* 트랜잭션 정보 표시 */}
      {transactionData && <TransactionInfo data={transactionData} />}
    </div>
  );
}; 