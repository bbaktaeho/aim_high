// API utility functions

export const callNoditAPI = async (
  apiKey: string,
  protocol: string,
  network: string,
  operationId: string,
  requestBody: any
): Promise<any> => {
  if (!apiKey) {
    throw new Error("Nodit API key not found");
  }

  const response = await fetch(`https://web3.nodit.io/v1/${protocol}/${network}/${operationId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }

  return response.json();
};
