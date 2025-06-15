import React from 'react';
import { CHAIN_CONFIG } from '../../constants/chains';
import { AccountStats } from '../../types';

interface AccountStatsCardProps {
  stats: AccountStats;
  isActive: boolean;
}

const formatBalance = (balance: string, nativeToken: string, stats: AccountStats) => {
  try {
    // Get decimals from chain config
    const chainConfig = Object.values(CHAIN_CONFIG).find(config => 
      config.protocol === stats.protocol && config.nativeToken === nativeToken
    );
    const decimals = chainConfig?.decimals || 18;
    
    // Convert balance from wei to readable format
    const balanceNum = parseFloat(balance) / Math.pow(10, decimals);
    
    // Format based on balance size
    if (balanceNum === 0) return '0';
    if (balanceNum < 0.0001) return '< 0.0001';
    if (balanceNum < 1) return balanceNum.toFixed(6);
    if (balanceNum < 1000) return balanceNum.toFixed(4);
    return balanceNum.toFixed(2);
  } catch (error) {
    console.error('Error formatting balance:', error);
    return '0';
  }
};

export const AccountStatsCard: React.FC<AccountStatsCardProps> = ({ stats, isActive }) => {
  return (
    <div style={{
      minWidth: '280px',
      padding: '20px',
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      border: `2px solid ${isActive ? stats.color : '#E5E7EB'}`,
      marginRight: '16px',
      boxShadow: isActive ? `0 4px 12px ${stats.color}20` : '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: stats.color,
          }} />
          <span style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937',
          }}>
            {stats.chainName}
          </span>
        </div>
        {isActive && (
          <span style={{
            fontSize: '12px',
            color: stats.color,
            fontWeight: '500',
            backgroundColor: `${stats.color}15`,
            padding: '4px 8px',
            borderRadius: '12px',
          }}>
            Current
          </span>
        )}
      </div>

      {/* Native Balance */}
      <div style={{
        backgroundColor: '#F9FAFB',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px',
      }}>
        <div style={{
          fontSize: '12px',
          color: '#6B7280',
          marginBottom: '4px',
        }}>
          Native Balance
        </div>
        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1F2937',
        }}>
          {formatBalance(stats.nativeBalance, stats.nativeToken, stats)} {stats.nativeToken}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '8px',
          backgroundColor: '#F3F4F6',
          borderRadius: '6px',
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937',
          }}>
            {stats.transactionCount.toLocaleString()}
          </div>
          <div style={{
            fontSize: '10px',
            color: '#6B7280',
            marginTop: '2px',
          }}>
            Transactions
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '8px',
          backgroundColor: '#F3F4F6',
          borderRadius: '6px',
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937',
          }}>
            {stats.tokenCount}
          </div>
          <div style={{
            fontSize: '10px',
            color: '#6B7280',
            marginTop: '2px',
          }}>
            Tokens
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '8px',
          backgroundColor: '#F3F4F6',
          borderRadius: '6px',
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937',
          }}>
            {stats.nftCount}
          </div>
          <div style={{
            fontSize: '10px',
            color: '#6B7280',
            marginTop: '2px',
          }}>
            NFTs
          </div>
        </div>
      </div>
    </div>
  );
}; 