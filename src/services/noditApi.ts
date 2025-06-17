import { API_CONFIG, API_PATHS } from "../constants/content";
import { APIOperationId } from "../types/content";

/**
 * Transform request body based on operation type
 */
const transformRequestBody = (operationId: APIOperationId, requestBody: any): any => {
  switch (operationId) {
    case "getTokensOwnedByAccount":
      return {
        accountAddress: requestBody.account,
        rpp: requestBody.rpp || API_CONFIG.defaultRpp,
        ...(requestBody.cursor && { cursor: requestBody.cursor }),
        ...(requestBody.withCount !== undefined && { withCount: requestBody.withCount }),
      };

    case "getAssetsOwnedByAccount":
      return {
        accountAddress: requestBody.account,
        rpp: requestBody.rpp || API_CONFIG.defaultRpp,
        ...(requestBody.cursor && { cursor: requestBody.cursor }),
        ...(requestBody.withCount !== undefined && { withCount: requestBody.withCount }),
      };

    case "getNativeBalanceByAccount":
      return { accountAddress: requestBody.account };

    case "getTotalTransactionCountByAccount":
      return { accountAddress: requestBody.account };

    case "getEnsNameByAddress":
      return { address: requestBody.account };

    default:
      return requestBody;
  }
};

/**
 * Call Nodit API
 */
export const callNoditAPI = async (
  protocol: string,
  network: string,
  operationId: APIOperationId,
  requestBody: any,
  apiKey: string
): Promise<any> => {
  const apiPath = API_PATHS[operationId];
  if (!apiPath) {
    throw new Error(`Unknown operation: ${operationId}`);
  }

  const transformedBody = transformRequestBody(operationId, requestBody);
  const url = `${API_CONFIG.baseUrl}/${protocol}/${network}/${apiPath}`;

  console.log(`🌐 API Call: ${operationId} to ${url}`, transformedBody);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify(transformedBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API call failed: ${operationId} to ${protocol}/${network}`, {
      status: response.status,
      statusText: response.statusText,
      errorText,
    });
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ API Response: ${operationId} from ${protocol}/${network}`, result);
  return result;
};

/**
 * Get API key from Chrome storage
 */
export const getApiKey = async (): Promise<string | null> => {
  const result = await chrome.storage.local.get(["noditApiKey"]);
  return result.noditApiKey || null;
};
