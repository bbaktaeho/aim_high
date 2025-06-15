import { useState } from "react";
import { CHAIN_CONFIG } from "../constants/chains";
import { AccountStats } from "../types";
import { callNoditAPI } from "../utils/api";

export const useAccountStats = () => {
  const [accountStats, setAccountStats] = useState<AccountStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const loadAccountStats = async (address: string, noditApiKey: string) => {
    if (!noditApiKey) {
      console.log("No Nodit API key available");
      return;
    }

    setIsLoadingStats(true);
    const stats: AccountStats[] = [];

    try {
      // Process each supported chain
      for (const [chainIdStr, config] of Object.entries(CHAIN_CONFIG)) {
        try {
          console.log(`Loading stats for ${config.name}...`);

          // Get native balance
          const balanceResponse = await callNoditAPI(
            noditApiKey,
            config.protocol,
            config.network,
            "getNativeBalanceByAccount",
            { accountAddress: address }
          );

          // Get transaction count
          const txCountResponse = await callNoditAPI(
            noditApiKey,
            config.protocol,
            config.network,
            "getTotalTransactionCountByAccount",
            { accountAddress: address }
          );

          // Get token count
          let tokenCount = 0;
          try {
            const tokensResponse = await callNoditAPI(
              noditApiKey,
              config.protocol,
              config.network,
              "getTokensOwnedByAccount",
              {
                accountAddress: address,
                withCount: true,
                limit: 1,
              }
            );
            tokenCount = tokensResponse?.totalCount || 0;
          } catch (err) {
            console.log(`Token count failed for ${config.name}:`, err);
          }

          // Get NFT count
          let nftCount = 0;
          try {
            const nftsResponse = await callNoditAPI(
              noditApiKey,
              config.protocol,
              config.network,
              "getNftsOwnedByAccount",
              {
                accountAddress: address,
                withCount: true,
                limit: 1,
              }
            );
            nftCount = nftsResponse?.totalCount || 0;
          } catch (err) {
            console.log(`NFT count failed for ${config.name}:`, err);
          }

          // Safely extract values with fallbacks
          const nativeBalance = balanceResponse?.balance || "0";
          const transactionCount = txCountResponse?.transactionCount || 0;

          // Only add chains with activity (transactions or balance > 0)
          const hasBalance = parseFloat(nativeBalance) > 0;
          const hasTransactions = transactionCount > 0;

          if (hasTransactions || hasBalance) {
            stats.push({
              protocol: config.protocol,
              network: config.network,
              chainName: config.name,
              nativeBalance,
              transactionCount,
              tokenCount,
              nftCount,
              color: config.color,
              nativeToken: config.nativeToken,
            });

            console.log(`✅ ${config.name} stats loaded:`, {
              balance: nativeBalance,
              transactions: transactionCount,
              tokens: tokenCount,
              nfts: nftCount,
            });
          } else {
            console.log(`⚪ ${config.name} - No activity found`);
          }
        } catch (err) {
          console.log(`❌ Failed to load stats for ${config.name}:`, err);
          // Continue with other chains even if one fails
        }
      }

      // Sort by transaction count (most active first), then by balance
      stats.sort((a, b) => {
        if (b.transactionCount !== a.transactionCount) {
          return b.transactionCount - a.transactionCount;
        }
        return parseFloat(b.nativeBalance) - parseFloat(a.nativeBalance);
      });

      setAccountStats(stats);

      console.log(`📊 Loaded stats for ${stats.length} chains with activity`);
    } catch (err) {
      console.error("Error loading account stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const refreshStats = async (account: string | null, noditApiKey: string | null) => {
    if (!account || !noditApiKey) {
      return;
    }

    console.log("🔄 Refreshing account statistics...");

    try {
      await loadAccountStats(account, noditApiKey);
    } catch (err) {
      console.error("Error refreshing stats:", err);
    }
  };

  return {
    accountStats,
    isLoadingStats,
    loadAccountStats,
    refreshStats,
  };
};
