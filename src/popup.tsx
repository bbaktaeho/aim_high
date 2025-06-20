import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MainScreen } from './screens/MainScreen';
import { OptionScreen } from './screens/OptionScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';

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

// Main Popup component
const Popup: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'main' | 'options'>('welcome');

  useEffect(() => {
    chrome.storage.local.get(['noditApiKey'], (result) => {
      setIsConnected(!!result.noditApiKey);
      if (result.noditApiKey) {
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