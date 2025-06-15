import React from 'react';
import { CHAIN_CONFIG } from '../../constants/chains';
import { formatAddress } from '../../utils/format';
import { styles } from '../styles';

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
            onClick={disconnectWallet}
            style={styles.disconnectButton}
          >
            Disconnect
          </button>
        </>
      ) : (
        <>
          <button
            onClick={connectWallet}
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
  );
}; 