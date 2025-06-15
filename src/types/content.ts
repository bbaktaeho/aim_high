// Content script types
export interface NetworkInfo {
  protocol: string;
  network: string;
}

export interface ActiveNetwork extends NetworkInfo {
  result?: any;
  hasActivity: boolean;
}

export interface NetworkAnalysisResult extends NetworkInfo {
  accountStats: any;
  tokenBalances: any;
  assetBalances?: any; // Tron only
  nativeBalance: any;
  transactionCount: any;
  ensName?: any; // Ethereum mainnet only
}

export interface PaginationState {
  cursor?: string;
  hasMore: boolean;
  allTokens: any[];
  totalCount?: number;
}

export interface AssetPaginationState {
  cursor?: string;
  hasMore: boolean;
  allAssets: any[];
  totalCount?: number;
}

export interface MultiChainAnalysisData {
  address: string;
  addressType: string;
  networks: NetworkAnalysisResult[];
}

export interface TokenItem {
  balance: string;
  contract?: {
    decimals?: string;
    symbol?: string;
    name?: string;
  };
}

export interface AssetItem {
  balance: string;
  asset?: {
    decimals?: string;
    symbol?: string;
    name?: string;
    id?: string;
  };
}

export interface NoditAPIOperation {
  operationId: string;
  requestBody: any;
}

// API operation types
export type APIOperationId =
  | "getAccountStats"
  | "getTokensOwnedByAccount"
  | "getAssetsOwnedByAccount"
  | "getNativeBalanceByAccount"
  | "getTotalTransactionCountByAccount"
  | "getEnsNameByAddress";

// Network colors mapping
export interface NetworkColors {
  [key: string]: string;
}

// Content script state
export interface ContentScriptState {
  isEnabled: boolean;
  selectedText: string;
  selectionRange: Range | null;
  isInitialized: boolean;
}

// Debug interface
export interface NoditDebugInterface {
  checkStatus: () => any;
  testAddress: (address: string) => { isEth: boolean; isTron: boolean; isValid: boolean };
  forceEnable: () => void;
  showButtonAtCenter: (address?: string) => string;
  showButtonForSelection: () => string | null;
  hideButton: () => void;
  showPopupAtCenter: (address?: string) => string;
  testPopupVisibility: () => any;
}
