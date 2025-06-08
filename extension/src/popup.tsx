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

// Main screen component
const MainScreen: React.FC = () => {
  console.log('MainScreen component mounted');

  const [isEnabled, setIsEnabled] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState<boolean | null>(null);
  const [isContentScriptReady, setIsContentScriptReady] = useState(false);

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

    // Load extension state
    chrome.storage.local.get(['isEnabled'], (result) => {
      console.log('Extension state loaded:', result);
      setIsEnabled(result.isEnabled ?? false);
    });
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

    setIsConnecting(true);
    setError(null);

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab?.id) {
        throw new Error('Invalid tab');
      }

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
      setError('Failed to connect to MetaMask');
    } finally {
      setIsConnecting(false);
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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Nodit Extension</h2>
      <div style={styles.toggleContainer}>
        <span style={styles.toggleLabel}>Enable Extension</span>
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
    </div>
  );
};

// Main Popup component
const Popup: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['apiKey'], (result) => {
      setIsConnected(!!result.apiKey);
    });
  }, []);

  const handleConnect = (apiKey: string) => {
    setIsConnected(true);
  };

  return (
    <div>
      {!isConnected ? (
        <WelcomeScreen onSubmit={handleConnect} />
      ) : (
        <MainScreen />
      )}
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