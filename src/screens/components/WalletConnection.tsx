import React from 'react';
import { CHAIN_CONFIG } from '../../constants/chains';
import { formatAddress } from '../../utils/format';

interface WalletConnectionProps {
  account: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  isMetaMaskInstalled: boolean | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({
  account,
  chainId,
  isConnecting,
  error,
  isMetaMaskInstalled,
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
        {account ? '연결된 지갑' : '지갑 연결하기'}
      </div>

      {isMetaMaskInstalled === false ? (
        <div style={{
          fontSize: '13px',
          color: '#ef4444',
          marginTop: '8px',
        }}>
          Please install MetaMask to use this feature
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
            disabled={isConnecting}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: isConnecting ? 'rgba(0, 209, 108, 0.7)' : '#00d16c',
              color: 'black',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseOver={(e) => {
              if (!isConnecting) {
                e.currentTarget.style.backgroundColor = '#00a865';
              }
            }}
            onMouseOut={(e) => {
              if (!isConnecting) {
                e.currentTarget.style.backgroundColor = '#00d16c';
              }
            }}
          >
            {isConnecting ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(0, 0, 0, 0.3)',
                  borderTop: '2px solid black',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                연결 중...
              </>
            ) : (
              'MetaMask 연결하기'
            )}
          </button>
          {error && (
            <div style={{
              fontSize: '13px',
              color: '#ef4444',
              marginTop: '8px',
            }}>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}; 