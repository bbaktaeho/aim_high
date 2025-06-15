import { ADDRESS_PATTERNS } from "../constants/content";

/**
 * Validate if a string is a valid Ethereum address
 */
export const isValidEthereumAddress = (address: string): boolean => {
  return ADDRESS_PATTERNS.ethereum.test(address);
};

/**
 * Validate if a string is a valid Tron address
 */
export const isValidTronAddress = (address: string): boolean => {
  return ADDRESS_PATTERNS.tron.test(address);
};

/**
 * Detect blockchain address from text
 * Returns the detected address or null if no valid address found
 */
export const detectBlockchainAddress = (text: string): string | null => {
  // Clean text: remove whitespace, newlines, special characters
  const cleanedText = text.replace(/[\s\n\r\t]/g, "");

  // Direct pattern matching
  if (isValidEthereumAddress(cleanedText)) {
    return cleanedText;
  }

  if (isValidTronAddress(cleanedText)) {
    return cleanedText;
  }

  // Pattern matching within text
  const ethMatch = cleanedText.match(ADDRESS_PATTERNS.ethereumMatch);
  if (ethMatch) {
    return ethMatch[0];
  }

  const tronMatch = cleanedText.match(ADDRESS_PATTERNS.tronMatch);
  if (tronMatch) {
    return tronMatch[0];
  }

  return null;
};

/**
 * Get address type (ethereum/tron)
 */
export const getAddressType = (address: string): "ethereum" | "tron" | null => {
  if (isValidEthereumAddress(address)) {
    return "ethereum";
  }

  if (isValidTronAddress(address)) {
    return "tron";
  }

  return null;
};

/**
 * Format address for display (truncate middle)
 */
export const formatAddress = (address: string, startLength = 6, endLength = 4): string => {
  if (address.length <= startLength + endLength) {
    return address;
  }

  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};
