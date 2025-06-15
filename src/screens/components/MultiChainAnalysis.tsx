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
              fontSize: '16px',
              fontWeight: '600',
              color: '#1F2937',
            }}>
              Multi-Chain Account Analysis
            </div>
            <button
              onClick={onRefreshStats}
              disabled={isLoadingStats}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: isLoadingStats ? '#F3F4F6' : '#10B981',
                color: isLoadingStats ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoadingStats ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                if (!isLoadingStats) {
                  e.currentTarget.style.backgroundColor = '#059669';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoadingStats) {
                  e.currentTarget.style.backgroundColor = '#10B981';
                }
              }}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                style={{
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
              {isLoadingStats ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {isLoadingStats ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #E5E7EB',
                borderTop: '3px solid #10B981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto',
              }} />
              <div style={{
                marginTop: '12px',
                fontSize: '14px',
                color: '#6B7280',
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
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
            }}>
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                style={{ 
                  margin: '0 auto 16px',
                  color: '#9CA3AF'
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
                color: '#374151',
                marginBottom: '8px',
              }}>
                Ready to analyze your account
              </div>
              <div style={{
                fontSize: '14px',
                color: '#6B7280',
                marginBottom: '16px',
              }}>
                Click the refresh button above to load your multi-chain statistics
              </div>
              <button
                onClick={onRefreshStats}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#10B981';
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
          backgroundColor: '#FEF3C7',
          borderRadius: '8px',
          border: '1px solid #F59E0B',
        }}>
          <div style={{
            fontSize: '14px',
            color: '#92400E',
            fontWeight: '500',
            marginBottom: '4px',
          }}>
            Nodit API Key Required
          </div>
          <div style={{
            fontSize: '13px',
            color: '#92400E',
          }}>
            Please configure your Nodit API key in settings to view account analysis.
          </div>
        </div>
      )}
    </>
  );
}; 