/**
 * Generate loading spinner HTML
 */
export const createLoadingSpinner = (message: string = "Loading..."): string => {
  return `
    <div style="display: flex; align-items: center; gap: 8px; color: #6B7280;">
      <div style="width: 16px; height: 16px; border: 2px solid #E5E7EB; border-top: 2px solid #10B981; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      ${message}
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
};

/**
 * Generate error message HTML
 */
export const createErrorMessage = (title: string, description?: string): string => {
  return `
    <div style="color: #EF4444; font-weight: 500;">
      ❌ ${title}
    </div>
    ${
      description
        ? `
      <div style="color: #6B7280; font-size: 12px; margin-top: 4px;">
        ${description}
      </div>
    `
        : ""
    }
  `;
};

/**
 * Generate no activity found message
 */
export const createNoActivityMessage = (): string => {
  return `
    <div style="color: #6B7280; text-align: center; padding: 20px;">
      <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
      <div style="font-weight: 500; margin-bottom: 4px;">No Activity Found</div>
      <div style="font-size: 12px;">This address has no recorded activity on supported networks.</div>
    </div>
  `;
};

/**
 * Generate no transactions message
 */
export const createNoTransactionsMessage = (): string => {
  return `
    <div style="color: #6B7280; text-align: center; padding: 20px;">
      <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
      <div style="font-weight: 500; margin-bottom: 4px;">No Transaction History</div>
      <div style="font-size: 12px;">This address has no recorded transactions on supported networks.</div>
    </div>
  `;
};

/**
 * Generate invalid address format message
 */
export const createInvalidAddressMessage = (): string => {
  return createErrorMessage("Invalid Address Format", "Please select a valid Ethereum (0x...) or Tron (T...) address.");
};

/**
 * Generate API key not found message
 */
export const createApiKeyNotFoundMessage = (): string => {
  return createErrorMessage("API Key not found", "Please set your Nodit API key in the extension popup.");
};
