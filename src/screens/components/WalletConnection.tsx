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
          ⚠️ Please install MetaMask to use this feature
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
              Download MetaMask →
            </a>
          </div>
        </div>
      ) : account ? (
        <>
          <div style={{
            fontSize: '13px',
            color: '#aaa',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            marginBottom: '8px',
          }}>
            {formatAddress(account)}
          </div>
          {chainId && CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG] && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
              marginBottom: '12px',
              padding: '8px 12px',
              backgroundColor: '#333',
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
                color: 'white',
                fontWeight: '500',
              }}>
                {CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG].name}
              </span>
            </div>
          )}
          <button
            onClick={disconnectWallet}
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
            }}
          >
            연결 해제하기
          </button>
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
                {isRequestPending ? 'MetaMask 요청 중...' : '연결 중...'}
              </>
            ) : (
              'MetaMask 연결하기'
            )}
          </button>
          
          {/* Enhanced error display */}
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
                // 잠금 해제 안내 (에러가 아닌 친근한 안내)
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
                // 일반 에러 메시지
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
                  {error.includes('pending') && (
                    <div style={{ 
                      fontSize: '12px', 
                      marginTop: '8px',
                      color: '#fcd34d',
                    }}>
                      💡 MetaMask 팝업을 확인하거나 잠시 후 다시 시도해주세요.
                    </div>
                  )}
                  {error.includes('rejected') && (
                    <div style={{ 
                      fontSize: '12px', 
                      marginTop: '8px',
                      color: '#fcd34d',
                    }}>
                      💡 연결을 승인하시려면 MetaMask에서 "연결" 버튼을 클릭해주세요.
                    </div>
                  )}
                  {error.includes('locked') && (
                    <div style={{ 
                      fontSize: '12px', 
                      marginTop: '8px',
                      color: '#fcd34d',
                    }}>
                      🔓 MetaMask가 잠겨있습니다. MetaMask를 열어서 비밀번호를 입력해 잠금을 해제해주세요.
                    </div>
                  )}
                  {error.includes('processing another request') && (
                    <div style={{ 
                      fontSize: '12px', 
                      marginTop: '8px',
                      color: '#fcd34d',
                    }}>
                      ⏳ MetaMask가 다른 요청을 처리 중입니다. 잠시 기다리거나 MetaMask를 확인해주세요.
                    </div>
                  )}
                  {error.includes('timeout') && (
                    <div style={{ 
                      fontSize: '12px', 
                      marginTop: '8px',
                      color: '#fcd34d',
                    }}>
                      ⏰ MetaMask 응답 시간이 초과되었습니다. MetaMask 팝업을 확인하고 다시 시도해주세요.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}; 