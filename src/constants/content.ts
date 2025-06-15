import { APIOperationId, NetworkColors } from "../types/content";

// Nodit brand colors
export const NODIT_COLORS = {
  primary: "#10B981", // Nodit main color (Emerald Green)
  secondary: "#059669", // Nodit secondary color (Dark Green)
  accent: "#34D399", // Nodit accent color (Light Green)
} as const;

// Network colors mapping
export const NETWORK_COLORS: NetworkColors = {
  ethereum: "#627EEA",
  polygon: "#8247E5",
  arbitrum: "#28A0F0",
  base: "#0052FF",
  optimism: "#FF0420",
  kaia: "#FF6B35",
  tron: "#FF060A",
};

// Supported EVM chains (Nodit supported chains)
export const EVM_CHAINS = [
  { protocol: "ethereum", network: "mainnet" },
  { protocol: "polygon", network: "mainnet" },
  { protocol: "arbitrum", network: "mainnet" },
  { protocol: "base", network: "mainnet" },
  { protocol: "optimism", network: "mainnet" },
  { protocol: "kaia", network: "mainnet" },
] as const;

// Address validation patterns
export const ADDRESS_PATTERNS = {
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  tron: /^T[a-zA-Z0-9]{33}$/,
  ethereumMatch: /0x[a-fA-F0-9]{40}/,
  tronMatch: /T[a-zA-Z0-9]{33}/,
} as const;

// API configuration
export const API_CONFIG = {
  baseUrl: "https://web3.nodit.io/v1",
  defaultRpp: 10,
  timeout: 10000,
} as const;

// API path mappings
export const API_PATHS: Record<APIOperationId, string> = {
  getAccountStats: "stats/getAccountStats",
  getTokensOwnedByAccount: "token/getTokensOwnedByAccount",
  getAssetsOwnedByAccount: "asset/getAssetsOwnedByAccount",
  getNativeBalanceByAccount: "native/getNativeBalanceByAccount",
  getTotalTransactionCountByAccount: "blockchain/getTotalTransactionCountByAccount",
  getEnsNameByAddress: "ens/getEnsNameByAddress",
};

// UI configuration
export const UI_CONFIG = {
  floatingButton: {
    zIndex: 999999,
    width: 140,
    height: 40,
  },
  popup: {
    zIndex: 2147483647, // Maximum z-index value
    maxWidth: 500,
    minWidth: 380,
    maxHeight: 500,
  },
  pagination: {
    itemsPerPage: 10,
  },
} as const;

// Animation and timing
export const TIMING = {
  selectionDebounce: 100,
  messageTimeout: 10000,
  requestPendingTimeout: 1000,
  visibilityCheckDelay: 100,
} as const;
