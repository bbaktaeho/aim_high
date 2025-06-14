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

  useEffect(() => {
    // Load extension state
    chrome.storage.local.get(['isEnabled', 'isTransactionCheckerEnabled'], (result) => {
      console.log('Extension state loaded:', result);
      setIsEnabled(result.isEnabled ?? false);
      setIsTransactionCheckerEnabled(result.isTransactionCheckerEnabled ?? false);
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