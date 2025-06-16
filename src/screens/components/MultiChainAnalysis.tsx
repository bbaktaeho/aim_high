import React from 'react';
import { AccountStats } from '../../types';
import { AccountCarousel } from './AccountCarousel';

interface MultiChainAnalysisProps {
  account: string | null;
  chainId: number | null;
  noditApiKey: string | null;
  accountStats: AccountStats[];
  isLoadingStats: boolean;
  onRefreshStats: () => void;
}

export const MultiChainAnalysis: React.FC<MultiChainAnalysisProps> = ({
  account,
  chainId,
  noditApiKey,
  accountStats,
  isLoadingStats,
  onRefreshStats,
}) => {
  // Don't render if wallet is not connected
  if (!account) {
    return null;
  }

  return (
    <>
      {/* Multi-Chain Analysis Section - Only show when wallet is connected */}
      {noditApiKey ? (
        <div style={{ marginTop: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'white',
            }}>
              온체인 활동 분석
            </div>
            <button
              onClick={onRefreshStats}
              disabled={isLoadingStats}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                backgroundColor: 'transparent',
                color: isLoadingStats ? '#888' : 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoadingStats ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s ease',
                width: '36px',
                height: '36px',
              }}
              onMouseOver={(e) => {
                if (!isLoadingStats) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoadingStats) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                style={{
                  color: isLoadingStats ? '#888' : 'white',
                  transform: isLoadingStats ? 'rotate(360deg)' : 'rotate(0deg)',
                  transition: 'transform 1s linear',
                  animation: isLoadingStats ? 'spin 1s linear infinite' : 'none',
                }}
              >
                <path 
                  d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          
          {isLoadingStats ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              border: '1px solid #333',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #333',
                borderTop: '3px solid #00d16c',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto',
              }} />
              <div style={{
                marginTop: '12px',
                fontSize: '14px',
                color: '#aaa',
              }}>
                Loading account statistics...
              </div>
            </div>
          ) : accountStats.length > 0 ? (
            <AccountCarousel 
              accountStats={accountStats} 
              currentChainId={chainId || 1} 
            />
          ) : (
            <div style={{
              padding: '32px 20px',
              textAlign: 'center',
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              border: '1px solid #333',
            }}>
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                style={{ 
                  margin: '0 auto 16px',
                  color: '#666'
                }}
              >
                <path 
                  d="M13 2L3 14H12L11 22L21 10H12L13 2Z" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <div style={{
                fontSize: '16px',
                fontWeight: '500',
                color: 'white',
                marginBottom: '8px',
              }}>
                Ready to analyze your account
              </div>
              <div style={{
                fontSize: '14px',
                color: '#aaa',
                marginBottom: '16px',
              }}>
                Click the refresh button above to load your multi-chain statistics
              </div>
              <button
                onClick={onRefreshStats}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#00d16c',
                  color: 'black',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#00a865';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#00d16c';
                }}
              >
                Load Statistics
              </button>
            </div>
          )}
        </div>
      ) : (
        /* API Key Required Message - Only show when wallet is connected but no API key */
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#2d1b00',
          borderRadius: '12px',
          border: '1px solid #d97706',
        }}>
          <div style={{
            fontSize: '14px',
            color: '#fbbf24',
            fontWeight: '500',
            marginBottom: '4px',
          }}>
            Nodit API Key Required
          </div>
          <div style={{
            fontSize: '13px',
            color: '#fbbf24',
          }}>
            Please configure your Nodit API key in settings to view account analysis.
          </div>
        </div>
      )}
    </>
  );
}; 