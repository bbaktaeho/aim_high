import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

// // Initialize MetaMask SDK
// const MMSDK = new MetaMaskSDK({
//   dappMetadata: {
//     name: "Nodit Extension",
//     url: "https://nodit.io",
//   },
//   // Optional - Customize modal display
//   headless: false, // We don't need the modal since we're in an extension
// });

// console.log(MMSDK.getProvider());

// Get provider


// Common styles
const styles = {
  container: {
    width: 'auto',
    minWidth: '320px',
    maxWidth: '400px',
    padding: '32px 24px',
    backgroundColor: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxSizing: 'border-box' as const,
  },
  welcomeContainer: {
    width: 'auto',
    minWidth: '320px',
    maxWidth: '400px',
    padding: '32px 24px',
    backgroundColor: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxSizing: 'border-box' as const,
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    fontSize: '14px',
    color: '#1A1A1A',
    backgroundColor: '#F9FAFB',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box' as const,
    '&:focus': {
      outline: 'none',
      borderColor: '#10B981',
      boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.1)',
    },
  },
  button: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#059669',
    },
    '&:disabled': {
      backgroundColor: '#A7F3D0',
      cursor: 'not-allowed',
    },
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
  },
  toggleLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  toggleSwitch: {
    position: 'relative' as const,
    display: 'inline-block',
    width: '52px',
    height: '28px',
  },
  toggleInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  toggleSlider: {
    position: 'absolute' as const,
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E5E7EB',
    borderRadius: '34px',
    transition: '.4s',
  },
  toggleSliderActive: {
    backgroundColor: '#10B981',
  },
  toggleButton: {
    position: 'absolute' as const,
    height: '20px',
    width: '20px',
    left: '4px',
    bottom: '4px',
    backgroundColor: 'white',
    borderRadius: '50%',
    transition: '.4s',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  toggleButtonActive: {
    transform: 'translateX(24px)',
  },
  accountContainer: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
  },
  accountTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  accountAddress: {
    fontSize: '13px',
    color: '#6B7280',
    fontFamily: 'monospace',
    wordBreak: 'break-all' as const,
  },
  connectButton: {
    width: '100%',
    padding: '8px 16px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '12px',
    '&:hover': {
      backgroundColor: '#059669',
    },
    '&:disabled': {
      backgroundColor: '#A7F3D0',
      cursor: 'not-allowed',
    },
  },
  disconnectButton: {
    width: '100%',
    padding: '8px 16px',
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '8px',
    '&:hover': {
      backgroundColor: '#DC2626',
    },
  },
  errorMessage: {
    fontSize: '13px',
    color: '#EF4444',
    marginTop: '8px',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #FFFFFF',
    borderTop: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: '#F3F4F6',
    },
  },
  backButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.2s ease',
    marginRight: '16px',
    '&:hover': {
      backgroundColor: '#F3F4F6',
    },
  },
  optionItem: {
    padding: '16px',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: '14px',
    color: '#374151',
  },
};

// Welcome screen component
const WelcomeScreen: React.FC<{ onSubmit: (apiKey: string) => void }> = ({ onSubmit }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await chrome.storage.local.set({ apiKey });
    onSubmit(apiKey);
  };

  return (
    <div style={styles.welcomeContainer}>
      <div>
        <h2 style={styles.title}>Welcome to Nodit</h2>
        <p style={styles.subtitle}>Enter your API key to get started</p>
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputContainer}>
          <label style={styles.label}>Enter Nodit API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={styles.input}
            placeholder="Enter your API key"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            ...styles.button,
            opacity: isLoading ? 0.8 : 1,
            marginTop: '8px',
          }}
        >
          {isLoading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner} />
              Connecting...
            </div>
          ) : (
            'Connect'
          )}
        </button>
      </form>
    </div>
  );
};

// 트랜잭션 데이터 타입 정의
interface TransactionData {
  from: string;
  to: string;
  value: string;
  data: string;
  gas: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  chainId: string;
  timestamp: number;
}

// Main screen component
const MainScreen: React.FC<{ onOpenOptions: () => void }> = ({ onOpenOptions }) => {
  console.log('MainScreen component mounted');

  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState<boolean | null>(null);
  const [isContentScriptReady, setIsContentScriptReady] = useState(false);
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [isRequestPending, setIsRequestPending] = useState(false);

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
  }, []);

  // 트랜잭션 데이터 리스너 추가
  useEffect(() => {
    const handleTransaction = (message: any) => {
      if (message.type === 'TRANSACTION_DETECTED') {
        setTransactionData(message.data);
      }
    };

    // 메시지 리스너 등록
    chrome.runtime.onMessage.addListener(handleTransaction);

    // 클린업
    return () => {
      chrome.runtime.onMessage.removeListener(handleTransaction);
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

  // 트랜잭션 데이터 표시 컴포넌트
  const TransactionInfo = ({ data }: { data: TransactionData }) => (
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
        <div>Time: {new Date(data.timestamp).toLocaleString()}</div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
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

      {/* 트랜잭션 정보 표시 */}
      {transactionData && <TransactionInfo data={transactionData} />}
    </div>
  );
};

// OptionScreen component
const OptionScreen: React.FC<{ onBack: () => void; onReset: () => void }> = ({ onBack, onReset }) => {
  const [isEnabled, setIsEnabled] = React.useState<boolean>(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Load extension state
    chrome.storage.local.get(['isEnabled'], (result) => {
      console.log('Extension state loaded:', result);
      setIsEnabled(result.isEnabled ?? false);
    });
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Get the active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab?.id && currentTab.url?.startsWith('http')) {
        // Notify content script about reset
        try {
          await chrome.tabs.sendMessage(currentTab.id, { 
            type: 'TOGGLE_EXTENSION', 
            isEnabled: false 
          });
        } catch (err) {
          console.log('Content script not ready, continuing with reset');
        }
      }

      // Clear all stored data
      await chrome.storage.local.clear();
      
      // Reset extension state
      setIsEnabled(false);
      
      // Notify parent component to show welcome screen
      onReset();
    } catch (error) {
      console.error('Error resetting Nodit Key:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggle = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    await chrome.storage.local.set({ isEnabled: newState });

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab?.id || !currentTab.url?.startsWith('http')) {
        return;
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['content.js']
        });
      } catch (err) {
        // Content script might already be injected, ignore error
      }

      await chrome.tabs.sendMessage(currentTab.id, { 
        type: 'TOGGLE_EXTENSION', 
        isEnabled: newState 
      });
    } catch (error) {
      console.log('Content script not ready, state saved to storage');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 style={styles.title}>Settings</h2>
        <div style={{ width: '40px' }} /> {/* Spacer for alignment */}
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
        <div style={styles.optionItem}>
          <span style={styles.optionLabel}>Nodit Supporter</span>
          <label style={styles.toggleSwitch}>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggle}
              style={styles.toggleInput}
            />
            <span style={{
              ...styles.toggleSlider,
              ...(isEnabled ? styles.toggleSliderActive : {})
            }}>
              <span style={{
                ...styles.toggleButton,
                ...(isEnabled ? styles.toggleButtonActive : {})
              }} />
            </span>
          </label>
        </div>
        <div style={styles.optionItem}>
          <span style={styles.optionLabel}>Dark Mode</span>
          <label style={styles.toggleSwitch}>
            <input type="checkbox" style={styles.toggleInput} />
            <span style={styles.toggleSlider}>
              <span style={styles.toggleButton} />
            </span>
          </label>
        </div>
        <div style={styles.optionItem}>
          <span style={styles.optionLabel}>Notifications</span>
          <label style={styles.toggleSwitch}>
            <input type="checkbox" style={styles.toggleInput} />
            <span style={styles.toggleSlider}>
              <span style={styles.toggleButton} />
            </span>
          </label>
        </div>
        <div style={styles.optionItem}>
          <span style={styles.optionLabel}>Auto Connect</span>
          <label style={styles.toggleSwitch}>
            <input type="checkbox" style={styles.toggleInput} />
            <span style={styles.toggleSlider}>
              <span style={styles.toggleButton} />
            </span>
          </label>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <button
          onClick={handleReset}
          disabled={isResetting}
          style={{
            ...styles.button,
            backgroundColor: '#EF4444',
            opacity: isResetting ? 0.8 : 1,
            transition: 'background-color 0.2s ease',
          }}
          onMouseOver={(e) => {
            if (!isResetting) {
              e.currentTarget.style.backgroundColor = '#DC2626';
            }
          }}
          onMouseOut={(e) => {
            if (!isResetting) {
              e.currentTarget.style.backgroundColor = '#EF4444';
            }
          }}
        >
          {isResetting ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner} />
              Resetting...
            </div>
          ) : (
            'Reset Nodit Key'
          )}
        </button>
      </div>
    </div>
  );
};

// Main Popup component
const Popup: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'main' | 'options'>('welcome');

  useEffect(() => {
    chrome.storage.local.get(['apiKey'], (result) => {
      setIsConnected(!!result.apiKey);
      if (result.apiKey) {
        setCurrentScreen('main');
      }
    });
  }, []);

  const handleConnect = (apiKey: string) => {
    setIsConnected(true);
    setCurrentScreen('main');
  };

  const handleReset = () => {
    setIsConnected(false);
    setCurrentScreen('welcome');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen onSubmit={handleConnect} />;
      case 'main':
        return <MainScreen onOpenOptions={() => setCurrentScreen('options')} />;
      case 'options':
        return <OptionScreen onBack={() => setCurrentScreen('main')} onReset={handleReset} />;
      default:
        return <WelcomeScreen onSubmit={handleConnect} />;
    }
  };

  return (
    <div>
      {renderScreen()}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}

// Update TypeScript declaration for MetaMask
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