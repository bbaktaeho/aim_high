// Common types for the application

export interface MainScreenProps {
  onOpenOptions: () => void;
}

export interface TransactionData {
  from: string;
  to: string;
  value: string;
  chainId?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  timestamp?: number;
  [key: string]: any;
}

export interface ChainConfig {
  name: string;
  protocol: string;
  network: string;
  color: string;
  nativeToken: string;
  decimals: number;
}

export interface AccountStats {
  protocol: string;
  network: string;
  chainName: string;
  nativeBalance: string;
  transactionCount: number;
  tokenCount: number;
  nftCount: number;
  color: string;
  nativeToken: string;
}
