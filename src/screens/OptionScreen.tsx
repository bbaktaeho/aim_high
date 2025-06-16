import React, { useEffect, useState } from 'react';
import { styles } from './styles';

interface OptionScreenProps {
  onBack: () => void;
  onReset: () => void;
}

export const OptionScreen: React.FC<OptionScreenProps> = ({ onBack, onReset }) => {
  const [isEnabled, setIsEnabled] = React.useState<boolean>(false);
  const [isTransactionCheckerEnabled, setIsTransactionCheckerEnabled] = React.useState<boolean>(false);
  const [isResetting, setIsResetting] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  useEffect(() => {
    // Load extension state and API key
    chrome.storage.local.get(['isEnabled', 'isTransactionCheckerEnabled', 'noditApiKey'], (result) => {
      console.log('Extension state loaded:', result);
      setIsEnabled(result.isEnabled ?? false);
      setIsTransactionCheckerEnabled(result.isTransactionCheckerEnabled ?? false);
      setApiKey(result.noditApiKey || '');
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
      setApiKey('');
      
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
    
    // Storage에 저장하면 background script가 자동으로 모든 탭에 브로드캐스트
    await chrome.storage.local.set({ isEnabled: newState });
    console.log(`🔄 Extension state changed to: ${newState}`);
  };

  const handleTransactionCheckerToggle = async () => {
    const newState = !isTransactionCheckerEnabled;
    setIsTransactionCheckerEnabled(newState);
    
    // Storage에 저장하면 background script가 자동으로 모든 탭에 브로드캐스트
    await chrome.storage.local.set({ isTransactionCheckerEnabled: newState });
    console.log(`🔄 Transaction checker state changed to: ${newState}`);
    
    // 현재 탭에서만 스크립트 주입/제거 처리
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab?.id || !currentTab.url?.startsWith('http')) {
        return;
      }

      if (newState) {
        // 트랜잭션 체커 활성화: transaction-checker.js 주입
        try {
          await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['transaction-checker.js']
          });
          console.log('Transaction checker script injected');
        } catch (err) {
          console.error('Failed to inject transaction checker script:', err);
        }
      } else {
        // 트랜잭션 체커 비활성화: 정리 메시지 전송
        try {
          await chrome.tabs.sendMessage(currentTab.id, { 
            type: 'CLEANUP_TRANSACTION_CHECKER'
          });
          console.log('Transaction checker cleanup message sent');
        } catch (err) {
          console.log('Transaction checker script not active, cleanup skipped');
        }
      }
    } catch (error) {
      console.error('Error handling transaction checker script:', error);
    }
  };

  const handleCopyApiKey = async () => {
    if (!apiKey) return;
    
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy API key:', err);
    }
  };

  const maskApiKey = (key: string): string => {
    if (!key) return '';
    if (key.length <= 8) return key;
    return `${key.substring(0, 4)}${'•'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 style={styles.title}>설정</h2>
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
          <span style={styles.optionLabel}>Transaction Checker</span>
          <label style={styles.toggleSwitch}>
            <input
              type="checkbox"
              checked={isTransactionCheckerEnabled}
              onChange={handleTransactionCheckerToggle}
              style={styles.toggleInput}
            />
            <span style={{
              ...styles.toggleSlider,
              ...(isTransactionCheckerEnabled ? styles.toggleSliderActive : {})
            }}>
              <span style={{
                ...styles.toggleButton,
                ...(isTransactionCheckerEnabled ? styles.toggleButtonActive : {})
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

      {/* API Key Section */}
      {apiKey && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          padding: '16px',
          marginTop: '16px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}>
                🔑
              </div>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Nodit API Key
              </span>
            </div>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                color: '#6B7280',
                fontSize: '12px',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = '#374151';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '#6B7280';
              }}
            >
              {showApiKey ? '👁️ Hide' : '👁️‍🗨️ Show'}
            </button>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <code style={{
              flex: 1,
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              fontSize: '12px',
              color: '#374151',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              wordBreak: 'break-all'
            }}>
              {showApiKey ? apiKey : maskApiKey(apiKey)}
            </code>
            
            <button
              onClick={handleCopyApiKey}
              style={{
                background: copySuccess ? '#10B981' : '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: '500',
                color: copySuccess ? '#FFFFFF' : '#374151',
                transition: 'all 0.2s ease',
                minWidth: '60px',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => {
                if (!copySuccess) {
                  e.currentTarget.style.background = '#F3F4F6';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                }
              }}
              onMouseOut={(e) => {
                if (!copySuccess) {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }
              }}
            >
              {copySuccess ? (
                <>
                  <span>✓</span>
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24264C20 6.97721 19.8946 6.7228 19.7071 6.53553L16.4645 3.29289C16.2772 3.10536 16.0228 3 15.7574 3H10C8.89543 3 8 3.89543 8 5Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          
          <div style={{
            fontSize: '11px',
            color: '#6B7280',
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>ℹ️</span>
            <span>This key is used for blockchain analysis and transaction checking</span>
          </div>
        </div>
      )}

      <div style={{ marginTop: '8px' }}>
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