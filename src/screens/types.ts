// Transaction data type definition
export interface TransactionData {
  from: string;
  to: string;
  value: string;
  data: string;
  gas: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  chainId: string;
  timestamp: number;
}
