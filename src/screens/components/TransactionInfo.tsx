import React from 'react';
import { TransactionData } from '../../types';
import { formatAddress } from '../../utils/format';
import { styles } from '../styles';

interface TransactionInfoProps {
  data: TransactionData;
}

export const TransactionInfo: React.FC<TransactionInfoProps> = ({ data }) => {
  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      backgroundColor: '#F9FAFB',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
    }}>
      <div style={styles.accountTitle}>트랜잭션 정보</div>
      <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>
        <div>From: {formatAddress(data.from)}</div>
        <div>To: {formatAddress(data.to)}</div>
        <div>Value: {data.value} wei</div>
        <div>Chain ID: {data.chainId}</div>
        <div>Gas Price: {data.gasPrice || data.maxFeePerGas || '0'} wei</div>
        <div>Time: {data.timestamp ? new Date(data.timestamp).toLocaleString() : '-'}</div>
      </div>
    </div>
  );
}; 