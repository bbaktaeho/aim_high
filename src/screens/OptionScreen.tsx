import React, { useEffect, useState } from 'react';

interface OptionScreenProps {
  onBack: () => void;
  onReset: () => void;
}

export const OptionScreen: React.FC<OptionScreenProps> = ({ onBack, onReset }) => {
  const [isEnabled, setIsEnabled] = React.useState<boolean>(false);
  const [isTransactionCheckerEnabled, setIsTransactionCheckerEnabled] = React.useState<boolean>(false);
  const [isOnchainNotificationEnabled, setIsOnchainNotificationEnabled] = React.useState<boolean>(false);
  const [isResetting, setIsResetting] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);

  useEffect(() => {
    // Load extension state, API key, and wallet connection status
    chrome.storage.local.get(['isEnabled', 'isTransactionCheckerEnabled', 'isOnchainNotificationEnabled', 'noditApiKey', 'walletAccount'], (result) => {
      console.log('Extension state loaded:', result);
      setIsEnabled(result.isEnabled ?? false);
      setIsTransactionCheckerEnabled(result.isTransactionCheckerEnabled ?? false);
      setIsOnchainNotificationEnabled(result.isOnchainNotificationEnabled ?? false);
      setApiKey(result.noditApiKey || '');
      setIsWalletConnected(!!result.walletAccount);
    });

    // Listen for wallet connection changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.walletAccount) {
        const isConnected = !!changes.walletAccount.newValue;
        setIsWalletConnected(isConnected);
        console.log('💼 Wallet connection status changed:', isConnected);
        
        // 지갑이 연결 해제되면 On-chain Notification도 자동으로 비활성화
        if (!isConnected && isOnchainNotificationEnabled) {
          setIsOnchainNotificationEnabled(false);
          chrome.storage.local.set({ isOnchainNotificationEnabled: false });
          console.log('🔔 On-chain Notification auto-disabled due to wallet disconnection');
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [isOnchainNotificationEnabled]);

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
    console.log(`🔄 Transaction Tracker state changed to: ${newState}`);
    
    // 모든 탭에서 스크립트 주입/제거 처리
    try {
      const tabs = await chrome.tabs.query({});
      const httpTabs = tabs.filter(tab => tab.id && tab.url?.startsWith('http'));
      
      console.log(`📋 Found ${httpTabs.length} HTTP tabs to ${newState ? 'inject' : 'cleanup'} Transaction Tracker`);

      if (newState) {
        // 트랜잭션 체커 활성화: 모든 탭에 transaction-checker.js 주입
        const injectionResults = await Promise.allSettled(
          httpTabs.map(async (tab) => {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                files: ['transaction-checker.js']
              });
              console.log(`✅ Transaction Tracker injected in tab ${tab.id}: ${tab.url}`);
              return { success: true, tabId: tab.id };
            } catch (err) {
              console.error(`❌ Failed to inject in tab ${tab.id}:`, err);
              return { success: false, tabId: tab.id, error: err };
            }
          })
        );
        
        const successful = injectionResults.filter(result => 
          result.status === 'fulfilled' && result.value.success
        ).length;
        console.log(`🎯 Transaction Tracker injection completed: ${successful}/${httpTabs.length} tabs successful`);
        
      } else {
        // 트랜잭션 체커 비활성화: 모든 탭에 정리 메시지 전송
        const cleanupResults = await Promise.allSettled(
          httpTabs.map(async (tab) => {
            try {
              await chrome.tabs.sendMessage(tab.id!, { 
                type: 'CLEANUP_TRANSACTION_CHECKER'
              });
              console.log(`✅ Transaction Tracker cleanup sent to tab ${tab.id}`);
              return { success: true, tabId: tab.id };
            } catch (err) {
              console.log(`⚠️ Cleanup message failed for tab ${tab.id} (script may not be active)`);
              return { success: false, tabId: tab.id, error: err };
            }
          })
        );
        
        const successful = cleanupResults.filter(result => 
          result.status === 'fulfilled' && result.value.success
        ).length;
        console.log(`🧹 Transaction Tracker cleanup completed: ${successful}/${httpTabs.length} tabs successful`);
      }
      
    } catch (error) {
      console.error('Error handling transaction Tracker script for all tabs:', error);
    }
  };

  const handleOnchainNotificationToggle = async () => {
    // 지갑이 연결되지 않은 상태에서 활성화하려고 하면 경고
    if (!isWalletConnected && !isOnchainNotificationEnabled) {
      alert('⚠️ On-chain Notification을 사용하려면 먼저 지갑을 연결해주세요!');
      return;
    }

    const newState = !isOnchainNotificationEnabled;
    setIsOnchainNotificationEnabled(newState);
    await chrome.storage.local.set({ isOnchainNotificationEnabled: newState });
    console.log(`🔔 On-chain Notification state changed to: ${newState}`);
    
    // TODO: 향후 스트림 연결 기능 구현 예정
    // 현재는 단순히 상태 변경만 수행
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

  const ToggleButton: React.FC<{ isActive: boolean; onClick: () => void }> = ({ isActive, onClick }) => (
    <button
      onClick={onClick}
      style={{
        width: '40px',
        height: '24px',
        backgroundColor: isActive ? '#00d16c' : '#444',
        borderRadius: '20px',
        border: 'none',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isActive ? '0 2px 8px rgba(0, 209, 108, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: isActive ? '20px' : '4px',
          width: '16px',
          height: '16px',
          background: '#fff',
          borderRadius: '50%',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isActive ? 'scale(1.1)' : 'scale(1)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        }}
      />
    </button>
  );

  return (
    <div style={{
      margin: 0,
      padding: 0,
      backgroundColor: '#000',
      fontFamily: "'Noto Sans KR', sans-serif",
      color: 'white',
      width: '100%',
      height: '100%',
    }}>
      <div style={{
        padding: '16px',
        maxWidth: '400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          position: 'relative',
        }}>
          <span
            onClick={onBack}
            style={{
              fontSize: '20px',
              cursor: 'pointer',
              position: 'absolute',
              left: 0,
            }}
          >
            ←
          </span>
          <span style={{
            fontSize: '20px',
            fontWeight: 'bold',
          }}>
            Setting
          </span>
        </div>

        {/* 설정 정보 섹션 */}
        <section>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '12px',
          }}>
            설정 정보
          </h2>
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '30px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid #333',
            }}>
              <div>
                <strong>Account Tracker</strong>
                <p style={{
                  fontSize: '13px',
                  color: '#aaa',
                  marginTop: '4px',
                  margin: '4px 0 0 0',
                }}>
                  웹 상의 주소를 드래그하면 정보를 분석합니다.
                </p>
              </div>
              <ToggleButton isActive={isEnabled} onClick={handleToggle} />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid #333',
            }}>
              <div>
                <strong>Transaction Tracker</strong>
                <p style={{
                  fontSize: '13px',
                  color: '#aaa',
                  marginTop: '4px',
                  margin: '4px 0 0 0',
                }}>
                  트랜잭션 발생시 분석하여 인사이트를 제공합니다.
                </p>
              </div>
              <ToggleButton isActive={isTransactionCheckerEnabled} onClick={handleTransactionCheckerToggle} />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid #333',
              opacity: isWalletConnected ? 1 : 0.5,
            }}>
              <div>
                <strong>On-chain Notification</strong>
                <p style={{
                  fontSize: '13px',
                  color: isWalletConnected ? '#aaa' : '#666',
                  marginTop: '4px',
                  margin: '4px 0 0 0',
                }}>
                  {isWalletConnected 
                    ? '내 계정의 온체인 활동이 감지되면 알려줍니다.'
                    : '⚠️ 지갑 연결이 필요합니다.'
                  }
                </p>
              </div>
              <ToggleButton 
                isActive={isOnchainNotificationEnabled} 
                onClick={isWalletConnected ? handleOnchainNotificationToggle : () => {
                  alert('⚠️ On-chain Notification을 사용하려면 먼저 지갑을 연결해주세요!');
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid #333',
            }}>
              <div>
                <strong>Dark Mode</strong>
                <p style={{
                  fontSize: '13px',
                  color: '#aaa',
                  marginTop: '4px',
                  margin: '4px 0 0 0',
                }}>
                  다크 모드 UI를 적용합니다.
                </p>
              </div>
              <ToggleButton isActive={true} onClick={() => {}} />
            </div>

            {/* <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
            }}>
              <div>
                <strong>Auto Connect</strong>
                <p style={{
                  fontSize: '13px',
                  color: '#aaa',
                  marginTop: '4px',
                  margin: '4px 0 0 0',
                }}>
                  로그인 시 API Key 및 지갑을 자동으로 연결합니다.
                </p>
              </div>
              <ToggleButton isActive={false} onClick={() => {}} />
            </div> */}
          </div>
        </section>

        {/* Nodit API Key 섹션 */}
        {apiKey && (
          <section>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '12px',
            }}>
              Nodit API Key
            </h2>
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '30px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}>
                <strong>연결된 Key</strong>
                <span
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                >
                  👁
                </span>
              </div>
              
              <input
                type={showApiKey ? 'text' : 'password'}
                value={showApiKey ? apiKey : maskApiKey(apiKey)}
                readOnly
                style={{
                  width: '100%',
                  padding: '10px',
                  border: 'none',
                  backgroundColor: '#333',
                  borderRadius: '8px',
                  color: 'white',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              />
              
              <p style={{
                fontSize: '13px',
                color: '#aaa',
                lineHeight: '1.4',
                marginBottom: '16px',
                margin: '0 0 16px 0',
              }}>
                이 키는 블록체인 분석 및 트랜잭션 체킹에 사용됩니다. 키를 안전하게 보관하고 타인과 공유하지 마세요.
              </p>
              
              <button
                onClick={handleReset}
                disabled={isResetting}
                style={{
                  width: '100%',
                  backgroundColor: isResetting ? 'rgba(0, 209, 108, 0.7)' : '#00d16c',
                  color: 'black',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: isResetting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isResetting && (
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(0, 0, 0, 0.3)',
                    borderTop: '2px solid black',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                )}
                {isResetting ? 'Resetting...' : 'Reset API Key'}
              </button>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#777',
          marginTop: '20px',
        }}>
          Powered by Nodit
        </footer>
      </div>

      {/* CSS Animation */}
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