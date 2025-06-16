import * as ethers from "ethers";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CHAIN_CONFIG } from "./constants/chains";

function parseTxFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const tx = params.get("tx");
  if (!tx) return null;
  try {
    return JSON.parse(decodeURIComponent(tx));
  } catch {
    return null;
  }
}

// 트랜잭션 필드 라벨 매핑 (표시할 필드만)
const fieldLabel: Record<string, string> = {
  from: "From",
  to: "To", 
  value: "Value (Wei)",
  gasPrice: "Gas Price (Gwei)",
  function: "Function"
};

// Wei를 Gwei로 변환
const weiToGwei = (wei: string): string => {
  if (!wei || wei === "0x0" || wei === "0") return "0";
  try {
    const weiValue = BigInt(wei);
    const gweiValue = Number(weiValue) / Math.pow(10, 9);
    return gweiValue.toFixed(2);
  } catch {
    return wei;
  }
};

// 16진수를 10진수로 변환
const hexToDecimal = (hex: string): string => {
  if (!hex) return "0";
  try {
    return parseInt(hex, 16).toString();
  } catch {
    return hex;
  }
};

// 체인 ID를 네트워크 이름으로 변환 (chains.ts 매핑 사용)
const getNetworkName = (chainId: string): string => {
  if (!chainId) return "Unknown Network";
  
  try {
    // hex string을 number로 변환
    const chainIdNumber = parseInt(chainId, 16);
    const chainConfig = CHAIN_CONFIG[chainIdNumber];
    
    if (chainConfig) {
      return `${chainConfig.name} (${chainIdNumber})`;
    }
    
    return `Chain ${chainIdNumber}`;
  } catch {
    return `Invalid Chain ID: ${chainId}`;
  }
};

// 트랜잭션 타입 설명
const getTransactionType = (type: string): string => {
  const types: Record<string, string> = {
    "0x0": "Legacy Transaction",
    "0x1": "EIP-2930 (Access List)",
    "0x2": "EIP-1559 (Dynamic Fee)"
  };
  return types[type] || `Type ${hexToDecimal(type)}`;
};

// 주소 타입 태그 컴포넌트
const AddressTypeTag: React.FC<{ type: string }> = ({ type }) => {
  const getTagStyle = (type: string) => {
    const baseStyle = {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "10px",
      fontWeight: "600",
      textTransform: "uppercase" as const
    };

    switch (type) {
      case "Contract":
        return {
          ...baseStyle,
          background: "#FEF3C7",
          color: "#92400E",
          border: "1px solid #F59E0B"
        };
      case "Account":
        return {
          ...baseStyle,
          background: "#DBEAFE",
          color: "#1E40AF",
          border: "1px solid #3B82F6"
        };
      case "Delegation":
        return {
          ...baseStyle,
          background: "#F3E8FF",
          color: "#7C3AED",
          border: "1px solid #8B5CF6"
        };
      default:
        return {
          ...baseStyle,
          background: "#F3F4F6",
          color: "#6B7280",
          border: "1px solid #9CA3AF"
        };
    }
  };

  return (
    <span style={getTagStyle(type)}>
      {type}
    </span>
  );
};

// 값 포맷팅 함수
const formatValue = (key: string, value: any, functionSig?: string, decodedParams?: { name: string; type: string; value: any }[] | null): string => {
  // function 필드는 함수 시그니처와 디코딩된 파라미터 반환
  if (key === "function") {
    let result = functionSig || "Loading...";
    
    if (decodedParams && decodedParams.length > 0) {
      result += "\n\nDecoded Parameters:";
      decodedParams.forEach((param, index) => {
        let displayValue = param.value;
        
        // BigInt나 복잡한 객체는 문자열로 변환
        if (typeof param.value === 'bigint') {
          displayValue = param.value.toString();
        } else if (typeof param.value === 'object' && param.value !== null) {
          displayValue = JSON.stringify(param.value);
        }
        
        result += `\n  ${param.name}: ${displayValue}`;
      });
    }
    
    return result;
  }
  
  if (!value || value === "0x" || value === "0x0") return "0";
  
  switch (key) {
    case "value":
      return value; // Wei 단위 그대로 반환
    case "gasPrice":
    case "maxFeePerGas":
    case "maxPriorityFeePerGas":
      return weiToGwei(value);
    case "gas":
    case "nonce":
      return hexToDecimal(value);
    case "chainId":
      return getNetworkName(value);
    case "type":
      return getTransactionType(value);
    case "from":
    case "to":
      return value || "N/A";
    default:
      return value?.toString() || "N/A";
  }
};

// 함수 시그니처와 파라미터 디코딩 결과 타입
interface FunctionDecodeResult {
  signatures: string[];
  decodedParams: { name: string; type: string; value: any }[] | null;
}

// 함수 시그니처 조회 및 파라미터 디코딩
const fetchFunctionSignatureAndDecode = async (hexData: string): Promise<FunctionDecodeResult> => {
  if (!hexData || hexData === "0x" || hexData.length < 10) {
    return { signatures: ["No function"], decodedParams: null };
  }
  
  try {
    const signature = hexData.substring(0, 10); // 앞 10자리 추출 (0x + 8자리)
    const dataArgs = hexData.substring(10); // 나머지 데이터 (파라미터 부분)
    
    const response = await fetch(`https://www.4byte.directory/api/v1/signatures/?format=json&hex_signature=${signature}`);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return { signatures: [`Unknown (${signature})`], decodedParams: null };
    }
    
    let successfulDecodedParams: { name: string; type: string; value: any }[] | null = null;
    let successfulParamCount = -1;
    const matchingSignatures: string[] = [];
    
    // 여러 결과 중에서 디코딩이 성공하는 것을 찾기
    for (const result of data.results) {
      try {
        const functionSig = result.text_signature;
        console.log(`Trying to decode with signature: ${functionSig}`);
        
        // 함수 시그니처에서 파라미터 타입 추출
        const match = functionSig.match(/\((.*)\)/);
        if (!match || !match[1]) {
          console.log('No parameters found in signature');
          // 파라미터가 없는 함수들도 수집
          if (successfulParamCount === -1 || successfulParamCount === 0) {
            matchingSignatures.push(functionSig);
            successfulParamCount = 0;
            successfulDecodedParams = [];
          }
          continue;
        }
        
        const paramTypes = match[1].split(',').map((type: string) => type.trim()).filter((type: string) => type.length > 0);
        
        if (paramTypes.length === 0) {
          console.log('Empty parameter types');
          // 파라미터가 없는 함수들도 수집
          if (successfulParamCount === -1 || successfulParamCount === 0) {
            matchingSignatures.push(functionSig);
            successfulParamCount = 0;
            successfulDecodedParams = [];
          }
          continue;
        }
        
        // ethers.js를 사용하여 파라미터 디코딩
        const decodedValues = ethers.AbiCoder.defaultAbiCoder().decode(paramTypes, '0x' + dataArgs);
        
        // 첫 번째 성공한 디코딩이거나 같은 파라미터 개수인 경우
        if (successfulParamCount === -1 || successfulParamCount === paramTypes.length) {
          matchingSignatures.push(functionSig);
          successfulParamCount = paramTypes.length;
          
          // 디코딩된 값들을 파라미터 정보와 함께 저장 (첫 번째 성공한 것만)
          if (successfulDecodedParams === null) {
            successfulDecodedParams = paramTypes.map((type: string, index: number) => ({
              name: `${index}`,
              type: type,
              value: decodedValues[index]
            }));
          }
        }
        
        console.log('Successfully decoded parameters with signature:', functionSig);
        
      } catch (decodeError) {
        console.log(`Failed to decode with signature ${result.text_signature}:`, decodeError);
        continue; // 다음 시그니처로 시도
      }
    }
    
    // 성공한 시그니처들이 있으면 반환
    if (matchingSignatures.length > 0) {
      console.log('All matching signatures:', matchingSignatures);
      return { signatures: matchingSignatures, decodedParams: successfulDecodedParams };
    }
    
    // 모든 시그니처로 디코딩 실패한 경우 첫 번째 시그니처만 반환
    return { signatures: [data.results[0].text_signature], decodedParams: null };
    
  } catch (error) {
    console.error('Error fetching function signature:', error);
    return { signatures: [`Error (${hexData.substring(0, 10)})`], decodedParams: null };
  }
};

// Nodit Node API - eth_getCode 조회
const getContractCode = async (protocol: string, network: string, address: string): Promise<string> => {
  try {
    const apiKey = await chrome.storage.local.get(['noditApiKey']);
    if (!apiKey.noditApiKey) {
      console.error('Nodit API key not found');
      return '';
    }

    const response = await fetch(`https://${protocol}-${network}.nodit.io`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey.noditApiKey
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1
      })
    });
    
    const data = await response.json();
    console.log('eth_getCode API response:', data);
    return data.result || '';
  } catch (error) {
    console.error('Error getting contract code:', error);
    return '';
  }
};

// 주소 타입 판별
const determineAddressType = async (
  protocol: string, 
  network: string, 
  address: string
): Promise<string> => {
  try {
    console.log(`Determining address type for: ${address}`);
    console.log(`Protocol: ${protocol}, Network: ${network}`);
    
    // 1. eth_getCode로 bytecode 확인
    const code = await getContractCode(protocol, network, address);
    console.log(`Contract code: ${code}`);
    
    // 2. 값이 없거나 "0x"로 응답하면 Account
    if (!code || code === "0x") {
      console.log('No contract code found - Account');
      return "Account";
    }
    
    // 3. 값이 존재하는데 0xef0100으로 시작한다면 Delegation
    if (code.startsWith('0xef0100')) {
      console.log('Detected delegation contract (0xef0100)');
      return "Delegation";
    }
    
    // 4. 그 외 값이 존재한다면 Contract
    console.log('Contract code exists - Contract');
    return "Contract";
  } catch (error) {
    console.error('Error determining address type:', error);
    return "Account";
  }
};

// 닫기 버튼 핸들러
const handleClose = () => {
  window.close();
};

const TxInfo: React.FC<{ tx: any }> = ({ tx }) => {
  // 함수 시그니처 상태
  const [functionSignature, setFunctionSignature] = useState<string>("Loading...");
  // 디코딩된 파라미터 상태
  const [decodedParams, setDecodedParams] = useState<{ name: string; type: string; value: any }[] | null>(null);
  // 주소 타입 상태
  const [addressType, setAddressType] = useState<string>("Loading...");
  
  // 실제 트랜잭션 데이터 추출 (params 배열의 첫 번째 요소가 실제 트랜잭션)
  const actualTx = tx.params && Array.isArray(tx.params) && tx.params.length > 0 ? tx.params[0] : tx;
  
  // 체인 정보 추출
  const chainId = tx.chainId || actualTx.chainId;
  const getChainInfo = (chainId: string) => {
    if (!chainId) return null;
    try {
      const chainIdNumber = parseInt(chainId, 16);
      return CHAIN_CONFIG[chainIdNumber] || null;
    } catch {
      return null;
    }
  };
  
  const chainInfo = getChainInfo(chainId);
  
  // 함수 시그니처 조회
  useEffect(() => {
    const loadFunctionSignature = async () => {
      if (actualTx.data && actualTx.data !== "0x" && actualTx.data.length >= 10) {
        const { signatures, decodedParams } = await fetchFunctionSignatureAndDecode(actualTx.data);
        setFunctionSignature(signatures.join('\n'));
        setDecodedParams(decodedParams);
      } else {
        setFunctionSignature("No function");
        setDecodedParams(null);
      }
    };
    
    loadFunctionSignature();
  }, [actualTx.data]);

  // 주소 타입 조회
  useEffect(() => {
    const loadAddressType = async () => {
      if (chainInfo && actualTx.to) {
        const type = await determineAddressType(
          chainInfo.protocol,
          chainInfo.network,
          actualTx.to
        );
        setAddressType(type);
      } else {
        setAddressType("Unknown");
      }
    };
    
    loadAddressType();
  }, [chainInfo, actualTx.to]);
  
  // Raw 데이터에서 실제 존재하는 필드만 필터링
  const availableFields = Object.keys(fieldLabel).filter(key => {
    if (key === 'function') return true; // function 필드는 항상 표시
    if (!actualTx.hasOwnProperty(key)) return false;
    if (actualTx[key] === undefined || actualTx[key] === null) return false;
    // 다른 필드들은 빈 값이면 제외
    return actualTx[key] !== "" && actualTx[key] !== "0x0";
  });

  return (
    <div style={{ 
      padding: 24, 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", 
      background: "#fff", 
      minHeight: "100vh", 
      width: "100%",
      maxWidth: "100vw",
      boxSizing: "border-box",
      position: "relative"
    }}>
      {/* 헤더 (close 버튼 제거) */}
      <div style={{ 
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: "2px solid #E5E7EB"
      }}>
        <h2 style={{ 
          color: "#10B981", 
          fontWeight: 700, 
          margin: 0,
          fontSize: 20,
          textAlign: "center",
          marginBottom: 16
        }}>
          🚀 Transaction Details
        </h2>
        
        {/* 네트워크 정보 배지 */}
        {chainInfo && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px"
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${chainInfo.color}20 0%, ${chainInfo.color}10 100%)`,
              border: `2px solid ${chainInfo.color}`,
              borderRadius: "20px",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              <div style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: chainInfo.color,
                boxShadow: `0 0 8px ${chainInfo.color}50`
              }} />
              <span style={{ color: chainInfo.color }}>
                {chainInfo.name}
              </span>
              <span style={{ 
                color: "#6B7280", 
                fontSize: "12px",
                background: "#F3F4F6",
                padding: "2px 6px",
                borderRadius: "4px"
              }}>
                {parseInt(chainId, 16)}
              </span>
            </div>
          </div>
        )}
        
        {!chainInfo && chainId && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #6B728020 0%, #6B728010 100%)",
              border: "2px solid #6B7280",
              borderRadius: "20px",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              <div style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#6B7280"
              }} />
              <span style={{ color: "#6B7280" }}>
                Unknown Network
              </span>
              <span style={{ 
                color: "#6B7280", 
                fontSize: "12px",
                background: "#F3F4F6",
                padding: "2px 6px",
                borderRadius: "4px"
              }}>
                {parseInt(chainId, 16)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 트랜잭션 정보 테이블 */}
      <div style={{ marginBottom: 24 }}>
        <table style={{ 
          width: "100%", 
          borderCollapse: "collapse", 
          fontSize: 13,
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          overflow: "hidden",
          tableLayout: "fixed"
        }}>
          <tbody>
            {availableFields.length > 0 ? (
              availableFields.map((key, index) => {
                const value = actualTx[key];
                const formattedValue = formatValue(key, value, functionSignature, decodedParams);
                const isEvenRow = index % 2 === 0;
                
                return (
                  <tr key={key} style={{ 
                    backgroundColor: isEvenRow ? "#F9FAFB" : "#FFFFFF"
                  }}>
                                      <td style={{ 
                    color: "#374151", 
                    fontWeight: 600, 
                    padding: "8px 12px", 
                    width: "22%",
                    borderRight: "1px solid #E5E7EB",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                    fontSize: "12px"
                  }}>
                    <div>
                      {fieldLabel[key]}
                      {key === "to" && (
                        <div style={{ marginTop: "4px" }}>
                          <AddressTypeTag type={addressType} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ 
                    color: "#111827", 
                    padding: "8px 12px", 
                    wordBreak: "break-all",
                    whiteSpace: key === "function" ? "pre-line" : "normal",
                    fontFamily: key === "from" || key === "to" || key === "function" ? "monospace" : "inherit",
                    fontSize: key === "from" || key === "to" || key === "function" ? "11px" : "12px",
                    display: "flex",
                    alignItems: key === "function" ? "flex-start" : "center"
                  }}>
                      <span>{formattedValue}</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              // 매핑된 필드가 없을 경우 실제 트랜잭션 데이터의 모든 필드 표시
              Object.keys(actualTx).map((key, index) => {
                const value = actualTx[key];
                const isEvenRow = index % 2 === 0;
                
                return (
                  <tr key={key} style={{ 
                    backgroundColor: isEvenRow ? "#F9FAFB" : "#FFFFFF"
                  }}>
                    <td style={{ 
                      color: "#374151", 
                      fontWeight: 600, 
                      padding: "8px 12px", 
                      width: "22%",
                      borderRight: "1px solid #E5E7EB",
                      verticalAlign: "top",
                      whiteSpace: "nowrap",
                      fontSize: "12px"
                    }}>
                      {key}
                    </td>
                    <td style={{ 
                      color: "#111827", 
                      padding: "8px 12px", 
                      wordBreak: "break-all",
                      fontFamily: "monospace",
                      fontSize: "11px"
                    }}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Raw 데이터 섹션 */}
      <div style={{ 
        background: "#F3F4F6", 
        padding: 16, 
        borderRadius: 8, 
        border: "1px solid #E5E7EB"
      }}>
        <div style={{ 
          color: "#6B7280", 
          fontSize: 12, 
          fontWeight: 600, 
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          📄 Raw Transaction Data
        </div>
        <pre style={{ 
          background: "#FFFFFF", 
          padding: 8, 
          borderRadius: 6, 
          fontSize: 10, 
          margin: 0, 
          overflowX: "auto",
          overflowY: "hidden",
          border: "1px solid #E5E7EB",
          fontFamily: "monospace",
          lineHeight: 1.3,
          color: "#374151",
          whiteSpace: "pre",
          maxHeight: "300px"
        }}>
          {JSON.stringify(tx, null, 2)}
        </pre>
      </div>

      {/* 하단 닫기 버튼만 유지 */}
      <div style={{ 
        marginTop: 24, 
        textAlign: "center",
        paddingTop: 16,
        borderTop: "1px solid #E5E7EB"
      }}>
        <button
          onClick={handleClose}
          style={{
            background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 8px rgba(16, 185, 129, 0.3)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.2)";
          }}
        >
          Close Transaction View
        </button>
      </div>
    </div>
  );
};

const tx = parseTxFromQuery();

const App = () => (
  <div>
    {tx ? (
      <TxInfo tx={tx} />
    ) : (
      <div style={{ 
        padding: 24, 
        textAlign: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          No Transaction Data
        </div>
        <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
          트랜잭션 정보를 찾을 수 없습니다.
        </div>
        <button
          onClick={handleClose}
          style={{
            background: "#6B7280",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "14px",
            cursor: "pointer"
          }}
        >
          Close
        </button>
      </div>
    )}
  </div>
);

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}