import { ChainConfig } from "../types";

// Chain configuration mapping
export const CHAIN_CONFIG: Record<number, ChainConfig> = {
  // Mainnet chains
  1: {
    name: "Ethereum",
    protocol: "ethereum",
    network: "mainnet",
    color: "#627EEA",
    nativeToken: "ETH",
    decimals: 18,
  },
  137: {
    name: "Polygon",
    protocol: "polygon",
    network: "mainnet",
    color: "#8247E5",
    nativeToken: "MATIC",
    decimals: 18,
  },
  42161: {
    name: "Arbitrum",
    protocol: "arbitrum",
    network: "mainnet",
    color: "#28A0F0",
    nativeToken: "ETH",
    decimals: 18,
  },
  8453: {
    name: "Base",
    protocol: "base",
    network: "mainnet",
    color: "#0052FF",
    nativeToken: "ETH",
    decimals: 18,
  },
  10: {
    name: "Optimism",
    protocol: "optimism",
    network: "mainnet",
    color: "#FF0420",
    nativeToken: "ETH",
    decimals: 18,
  },
  8217: {
    name: "Kaia",
    protocol: "kaia",
    network: "mainnet",
    color: "#FF6B35",
    nativeToken: "KAIA",
    decimals: 18,
  },

  // Testnet chains
  11155111: {
    name: "Ethereum Sepolia",
    protocol: "ethereum",
    network: "sepolia",
    color: "#627EEA",
    nativeToken: "ETH",
    decimals: 18,
  },
  80002: {
    name: "Polygon Amoy",
    protocol: "polygon",
    network: "amoy",
    color: "#8247E5",
    nativeToken: "MATIC",
    decimals: 18,
  },
  421614: {
    name: "Arbitrum Sepolia",
    protocol: "arbitrum",
    network: "sepolia",
    color: "#28A0F0",
    nativeToken: "ETH",
    decimals: 18,
  },
  84532: {
    name: "Base Sepolia",
    protocol: "base",
    network: "sepolia",
    color: "#0052FF",
    nativeToken: "ETH",
    decimals: 18,
  },
  11155420: {
    name: "Optimism Sepolia",
    protocol: "optimism",
    network: "sepolia",
    color: "#FF0420",
    nativeToken: "ETH",
    decimals: 18,
  },
  1001: {
    name: "Kaia Testnet",
    protocol: "kaia",
    network: "testnet",
    color: "#FF6B35",
    nativeToken: "KAIA",
    decimals: 18,
  },
};
