import React from "react";
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
  from: "From Address",
  to: "To Address", 
  value: "Value (ETH)",
  gasPrice: "Gas Price (Gwei)",
  data: "Input Data"
};

// Wei를 ETH로 변환
const weiToEth = (wei: string): string => {
  if (!wei || wei === "0x0" || wei === "0") return "0";
  try {
    const weiValue = BigInt(wei);
    const ethValue = Number(weiValue) / Math.pow(10, 18);
    return ethValue.toFixed(6);
  } catch {
    return wei;
  }
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

// 값 포맷팅 함수
const formatValue = (key: string, value: any): string => {
  if (!value || value === "0x" || value === "0x0") return "0";
  
  switch (key) {
    case "value":
      return weiToEth(value);
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
    case "data":
      if (value === "0x") return "No data";
      return value.length > 42 ? `${value.substring(0, 42)}...` : value;
    case "from":
    case "to":
      return value || "N/A";
    default:
      return value?.toString() || "N/A";
  }
};

// 닫기 버튼 핸들러
const handleClose = () => {
  window.close();
};

const TxInfo: React.FC<{ tx: any }> = ({ tx }) => {
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
  
  // Raw 데이터에서 실제 존재하는 필드만 필터링
  const availableFields = Object.keys(fieldLabel).filter(key => 
    actualTx.hasOwnProperty(key) && actualTx[key] !== undefined && actualTx[key] !== null
  );



  return (
    <div style={{ 
      padding: 24, 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", 
      background: "#fff", 
      minHeight: "100vh", 
      maxWidth: 420,
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
          fontSize: 14,
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <tbody>
            {availableFields.length > 0 ? (
              availableFields.map((key, index) => {
                const value = actualTx[key];
                const formattedValue = formatValue(key, value);
                const isEvenRow = index % 2 === 0;
                
                return (
                  <tr key={key} style={{ 
                    backgroundColor: isEvenRow ? "#F9FAFB" : "#FFFFFF"
                  }}>
                    <td style={{ 
                      color: "#374151", 
                      fontWeight: 600, 
                      padding: "12px 16px", 
                      width: "40%",
                      borderRight: "1px solid #E5E7EB",
                      verticalAlign: "top"
                    }}>
                      {fieldLabel[key]}
                    </td>
                    <td style={{ 
                      color: "#111827", 
                      padding: "12px 16px", 
                      wordBreak: "break-all",
                      fontFamily: key === "data" || key === "from" || key === "to" ? "monospace" : "inherit",
                      fontSize: key === "data" || key === "from" || key === "to" ? "12px" : "14px"
                    }}>
                      {formattedValue}
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
                      padding: "12px 16px", 
                      width: "40%",
                      borderRight: "1px solid #E5E7EB",
                      verticalAlign: "top"
                    }}>
                      {key}
                    </td>
                    <td style={{ 
                      color: "#111827", 
                      padding: "12px 16px", 
                      wordBreak: "break-all",
                      fontFamily: "monospace",
                      fontSize: "12px"
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
          padding: 12, 
          borderRadius: 6, 
          fontSize: 11, 
          margin: 0, 
          overflowX: "auto",
          border: "1px solid #E5E7EB",
          fontFamily: "monospace",
          lineHeight: 1.4,
          color: "#374151"
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