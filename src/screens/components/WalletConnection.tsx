import React from 'react';
import { CHAIN_CONFIG } from '../../constants/chains';
import { formatAddress } from '../../utils/format';

interface WalletConnectionProps {
  account: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  isMetaMaskInstalled: boolean | null;
  isInitializing: boolean;
  isRequestPending: boolean;
  connectWallet: () => void;
  disconnectWallet: () => void;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({
  account,
  chainId,
  isConnecting,
  error,
  isMetaMaskInstalled,
  isInitializing,
  isRequestPending,
  connectWallet,
  disconnectWallet,
}) => {
  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      border: '1px solid #333',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        color: 'white',
        marginBottom: '12px',
      }}>
        {isInitializing ? '지갑 상태 확인 중...' : account ? '연결된 지갑' : '지갑 연결하기'}
      </div>

      {/* 초기 로딩 중일 때 로딩 스피너 표시 */}
      {isInitializing ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          gap: '12px',
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #333',
            borderTop: '2px solid #00d16c',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <span style={{
            fontSize: '14px',
            color: '#aaa',
          }}>
            연결 상태를 확인하고 있습니다...
          </span>
        </div>
      ) : isMetaMaskInstalled === false ? (
        <div style={{
          fontSize: '13px',
          color: '#ef4444',
          marginTop: '8px',
          padding: '12px',
          backgroundColor: '#2D1B1B',
          borderRadius: '8px',
          border: '1px solid #ef4444',
        }}>
          ⚠️ MetaMask을 설치해야 이 기능을 사용할 수 있습니다
          <div style={{ marginTop: '8px' }}>
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#00d16c',
                textDecoration: 'underline',
                fontSize: '12px'
              }}
            >
              MetaMask 다운로드 →
            </a>
          </div>
        </div>
      ) : account ? (
        <>
          {/* 컴팩트한 연결된 지갑 정보 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            border: '1px solid #333',
          }}>
            {/* 왼쪽: 지갑 정보 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              flex: 1,
            }}>
              {/* 주소 (축약) */}
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                fontFamily: 'monospace',
              }}>
                {formatAddress(account)}
              </div>
              
              {/* 체인 정보 (작은 텍스트) */}
              {chainId && CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG] && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG].color,
                  }} />
                  <span style={{
                    fontSize: '11px',
                    color: '#aaa',
                    fontWeight: '400',
                  }}>
                    {CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG].name}
                  </span>
                </div>
              )}
            </div>
            
            {/* 오른쪽: 연결 해제 아이콘 버튼 */}
            <button
              onClick={disconnectWallet}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease',
                color: '#ef4444',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="연결 해제"
            >
              {/* 연결 해제 아이콘 (체인 끊어짐) */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5Z" fill="currentColor"/>
                <path d="M11 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1S5.29 8.9 7 8.9h4V7Z" fill="currentColor"/>
                <path d="M8 11h8v2H8v-2Z" fill="currentColor"/>
                <path d="M19 3L5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            onClick={connectWallet}
            disabled={isConnecting || isRequestPending}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: (isConnecting || isRequestPending) ? 'rgba(0, 209, 108, 0.7)' : '#00d16c',
              color: 'black',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (isConnecting || isRequestPending) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseOver={(e) => {
              if (!isConnecting && !isRequestPending) {
                e.currentTarget.style.backgroundColor = '#00a865';
              }
            }}
            onMouseOut={(e) => {
              if (!isConnecting && !isRequestPending) {
                e.currentTarget.style.backgroundColor = '#00d16c';
              }
            }}
          >
            {(isConnecting || isRequestPending) ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(0, 0, 0, 0.3)',
                  borderTop: '2px solid black',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                MetaMask 연결 중...
              </>
            ) : (
              'MetaMask 연결하기'
            )}
          </button>
          
          {/* 에러 메시지 표시 */}
          {error && (
            <div style={{
              fontSize: '13px',
              color: error === 'unlock_required' ? '#fcd34d' : '#ef4444',
              marginTop: '12px',
              padding: '12px',
              backgroundColor: error === 'unlock_required' ? '#2A1F17' : '#2D1B1B',
              borderRadius: '8px',
              border: error === 'unlock_required' ? '1px solid #fcd34d' : '1px solid #ef4444',
              lineHeight: '1.4',
            }}>
              {error === 'unlock_required' ? (
                <>
                  <div style={{ 
                    fontWeight: '600', 
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    🔓 MetaMask 잠금 해제 필요
                  </div>
                  <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                    MetaMask를 열어서 비밀번호를 입력하고 잠금을 해제해주세요.
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#d97706',
                    fontStyle: 'italic'
                  }}>
                    💡 잠금 해제 후 다시 연결해보세요
                  </div>
                </>
              ) : (
                <>
                  <div style={{ 
                    fontWeight: '600', 
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    ⚠️ 연결 오류
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    {error}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    marginTop: '8px',
                    color: '#fcd34d',
                  }}>
                    💡 MetaMask 팝업을 확인하거나 잠시 후 다시 시도해주세요.
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}; 