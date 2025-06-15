// Utility functions for formatting

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatBalance = (balance: string, decimals: number = 18): string => {
  try {
    // Convert balance from wei to readable format
    const balanceNum = parseFloat(balance) / Math.pow(10, decimals);

    // Format based on balance size
    if (balanceNum === 0) return "0";
    if (balanceNum < 0.0001) return "< 0.0001";
    if (balanceNum < 1) return balanceNum.toFixed(6);
    if (balanceNum < 1000) return balanceNum.toFixed(4);
    return balanceNum.toFixed(2);
  } catch (error) {
    console.error("Error formatting balance:", error);
    return "0";
  }
};
