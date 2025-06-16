import React from 'react';
import { CHAIN_CONFIG } from '../../constants/chains';
import { TransactionData } from '../../types';
import { formatAddress } from '../../utils/format';
import { styles } from '../styles';

interface TransactionInfoProps {
  data: TransactionData;
}

// Wei를 ETH로 변환
const weiToEth = (wei: string): string => {
  if (!wei || wei === "0x0" || wei === "0") return "0";
  try {
    const weiValue = BigInt(wei);
    const ethValue = Number(weiValue) / Math.pow(10, 18);
    return ethValue.toFixed(6);
  } catch {
    return wei;
  }
};

// Wei를 Gwei로 변환
const weiToGwei = (wei: string): string => {
  if (!wei || wei === "0x0" || wei === "0") return "0";
  try {
    const weiValue = BigInt(wei);
    const gweiValue = Number(weiValue) / Math.pow(10, 9);
    return gweiValue.toFixed(2);
  } catch {
    return wei;
  }
};

// 체인 ID를 네트워크 이름으로 변환 (chains.ts 매핑 사용)
const getNetworkName = (chainId: string): string => {
  if (!chainId) return "Unknown Network";
  
  try {
    // hex string을 number로 변환
    const chainIdNumber = parseInt(chainId, 16);
    const chainConfig = CHAIN_CONFIG[chainIdNumber];
    
    if (chainConfig) {
      return `${chainConfig.name} (${chainIdNumber})`;
    }
    
    return `Chain ${chainIdNumber}`;
  } catch {
    return `Invalid Chain ID: ${chainId}`;
  }
};

export const TransactionInfo: React.FC<TransactionInfoProps> = ({ data }) => {
  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      backgroundColor: '#F9FAFB',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
    }}>
      <div style={styles.accountTitle}>Transaction Information</div>
      <div style={{ 
        fontSize: '13px', 
        color: '#374151', 
        marginTop: '12px',
        display: 'grid',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '600', color: '#6B7280' }}>From:</span>
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {formatAddress(data.from)}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '600', color: '#6B7280' }}>To:</span>
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {formatAddress(data.to)}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '600', color: '#6B7280' }}>Value:</span>
          <span style={{ fontWeight: '600', color: '#10B981' }}>
            {weiToEth(data.value)} ETH
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '600', color: '#6B7280' }}>Network:</span>
          <span>{getNetworkName(data.chainId || '')}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '600', color: '#6B7280' }}>Gas Price:</span>
          <span>
            {weiToGwei(data.gasPrice || data.maxFeePerGas || '0')} Gwei
          </span>
        </div>
        
        {data.timestamp && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: '600', color: '#6B7280' }}>Time:</span>
            <span>{new Date(data.timestamp).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}; 