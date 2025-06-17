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
    
    // ERC-20 transfer 함수 시그니처 직접 처리
    if (signature === "0xa9059cbb") {
      console.log('Detected ERC-20 transfer function (0xa9059cbb)');
      
      try {
        // transfer(address,uint256) 파라미터 디코딩
        const paramTypes = ['address', 'uint256'];
        const decodedValues = ethers.AbiCoder.defaultAbiCoder().decode(paramTypes, '0x' + dataArgs);
        
        const decodedParams = [
          {
            name: 'to',
            type: 'address',
            value: decodedValues[0]
          },
          {
            name: 'amount',
            type: 'uint256',
            value: decodedValues[1]
          }
        ];
        
        console.log('Successfully decoded ERC-20 transfer parameters:', decodedParams);
        return { signatures: ["transfer(address,uint256)"], decodedParams };
        
      } catch (decodeError) {
        console.error('Failed to decode ERC-20 transfer parameters:', decodeError);
        return { signatures: ["transfer(address,uint256)"], decodedParams: null };
      }
    }
    
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

// 스캠 주소 확인 (CryptoScam.org 공식 API 사용)
const checkScamAddress = async (address: string): Promise<{isScam: boolean, reportData: any}> => {
  try {
    console.log(`Checking if ${address} is a scam address using CryptoScam API...`);
    
    const apiUrl = `https://api.cryptoscam.org/v1/reports?page=1&rpp=20&searchAddress=${address}&sort=reportedAt:desc`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log('Failed to fetch scam check data from API');
      return { isScam: false, reportData: null };
    }
    
    const data = await response.json();
    console.log('Scam API response:', data);
    
    // count가 0보다 크면 스캠 리포트가 존재함
    const isScam = data.count > 0 && Array.isArray(data.items) && data.items.length > 0;
    
    if (isScam) {
      console.log(`🚨 Scam detected for ${address}:`, {
        reportCount: data.count,
        scamType: data.items[0]?.scamType,
        scamIndex: data.items[0]?.scamIndex,
        reportedBy: data.items[0]?.reportedBy,
        description: data.items[0]?.description?.substring(0, 100) + '...'
      });
    } else {
      console.log(`✅ Address ${address} is clean - no scam reports found`);
    }
    
    return { isScam, reportData: isScam ? data : null };
  } catch (error) {
    console.error('Error checking scam address via API:', error);
    // 에러 발생시 안전하게 false 반환 (스캠이 아닌 것으로 처리)
    return { isScam: false, reportData: null };
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
  // 스캠 주소 확인 상태
  const [isScamAddress, setIsScamAddress] = useState<boolean | null>(null);
  const [scamCheckLoading, setScamCheckLoading] = useState<boolean>(false);

  
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

  // 스캠 주소 확인
  useEffect(() => {
    const checkScam = async () => {
      if (actualTx.to && actualTx.to.startsWith('0x') && actualTx.to.length === 42) {
        setScamCheckLoading(true);
        try {
          const result = await checkScamAddress(actualTx.to);
          setIsScamAddress(result.isScam);
        } catch (error) {
          console.error('Error during scam check:', error);
          setIsScamAddress(false);
        } finally {
          setScamCheckLoading(false);
        }
      }
    };
    
    checkScam();
  }, [actualTx.to]);
  
  // Raw 데이터에서 실제 존재하는 필드만 필터링
  const availableFields = Object.keys(fieldLabel).filter(key => {
    if (key === 'function') return true; // function 필드는 항상 표시
    if (!actualTx.hasOwnProperty(key)) return false;
    if (actualTx[key] === undefined || actualTx[key] === null) return false;
    // 다른 필드들은 빈 값이면 제외
    return actualTx[key] !== "" && actualTx[key] !== "0x0";
  });

  // 리포트 생성 함수
  const generateReport = (): string => {
    const fromAddress = actualTx.from;
    const toAddress = actualTx.to;
    const value = actualTx.value;
    const data = actualTx.data;
    const hasValue = value && value !== "0x0" && value !== "0";
    const hasData = data && data !== "0x" && data.length > 2;
    const hasFunction = functionSignature && functionSignature !== "Loading..." && functionSignature !== "No function";
    
    let report = "";
    
    // 스캠 주소 경고 (가장 먼저 표시)
    if (isScamAddress && toAddress) {
      report += `🚨 극도로 위험합니다! ${toAddress.slice(0, 6)}...${toAddress.slice(-4)} 주소는 스캠으로 신고된 악성 주소입니다!\n\n`;
      report += `⚠️ 이 트랜잭션을 절대 진행하지 마세요! 자산을 영구적으로 잃게 됩니다! CryptoScam.org에서 확인된 악성 주소입니다.\n\n`;
    }
    
    // From 주소 분석
    if (fromAddress) {
      report += `🔐 ${fromAddress.slice(0, 6)}...${fromAddress.slice(-4)} 지갑에서 트랜잭션을 시작하셨네요. 이 주소가 서명자이자 수수료를 지불하는 계정입니다.\n\n`;
    }
    
    // To 주소와 Value 분석
    if (toAddress) {
      const shortToAddress = `${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`;
      
      if (hasValue) {
        const valueInWei = value;
        report += `💰 ${shortToAddress}에게 ${valueInWei} Wei를 전송하고 계시네요. `;
      } else {
        report += `📤 ${shortToAddress}와 상호작용하려고 하시는군요. `;
      }
      
      // 주소 타입에 따른 상세 분석
      if (addressType === "Contract") {
        report += `받는 주소를 확인해보니 스마트 컨트랙트입니다.\n\n`;
        
        if (hasFunction) {
          const mainFunction = functionSignature.split('\n')[0];
          report += `🚀 컨트랙트의 "${mainFunction}" 함수를 호출하려고 하시는군요. `;
          
          // 함수별 특별한 설명
          if (mainFunction.includes('transfer')) {
            report += `토큰 전송 기능을 사용하시는 것 같아요.\n\n`;
          } else if (mainFunction.includes('approve')) {
            report += `토큰 사용 권한을 부여하는 기능이네요.\n\n`;
          } else if (mainFunction.includes('swap')) {
            report += `토큰 교환 기능을 사용하시는군요.\n\n`;
          } else {
            report += `이 함수의 정확한 기능은 컨트랙트 문서를 확인해보시는 것이 좋겠어요.\n\n`;
          }
        } else if (hasData) {
          report += `데이터가 포함되어 있지만 함수 시그니처를 식별할 수 없네요. 알려지지 않은 함수이거나 새로운 컨트랙트일 수 있습니다.\n\n`;
        } else {
          report += `단순히 이더를 컨트랙트로 전송하는 것 같아요. 컨트랙트의 fallback 함수가 실행될 예정입니다.\n\n`;
        }
        
      } else if (addressType === "Delegation") {
        report += `받는 주소를 확인해보니 위임 계정(Delegation)이네요.\n\n`;
        
        if (hasFunction) {
          const mainFunction = functionSignature.split('\n')[0];
          report += `🎭 흥미롭게도 일반 사용자 지갑 형태인데 "${mainFunction}" 함수를 호출하려고 하시는군요. 이는 EIP-3074나 EIP-7702와 같은 계정 추상화 메커니즘을 사용하는 특별한 계정일 가능성이 높습니다. EIP-7702는 외부 소유 계정(EOA)이 스마트 컨트랙트처럼 동작할 수 있게 해주는 혁신적인 기술이에요.\n\n`;
        } else if (hasData) {
          report += `🤔 위임 계정에 데이터를 전송하고 있지만 함수를 식별할 수 없네요. EIP-7702나 다른 계정 추상화 프로토콜을 사용하는 것일 수도 있어요.\n\n`;
        } else {
          report += `위임된 계정으로 단순 전송을 하고 계시네요. 이 계정은 EIP-7702 등의 기술로 향상된 기능을 가질 수 있는 특별한 형태의 지갑입니다.\n\n`;
        }
        
      } else if (addressType === "Account") {
        report += `받는 주소를 확인해보니 일반 사용자 지갑입니다.\n\n`;
        
        if (hasData && !hasValue) {
          report += `🤔 조금 의아한 점이 있어요. 일반 사용자 지갑에 데이터를 전송하고 있는데, 보통 사용자 지갑은 데이터를 처리하지 않거든요. 혹시 받는 주소가 정말 일반 지갑이 맞는지 다시 한번 확인해보세요.\n\n`;
        } else if (hasData && hasValue) {
          report += `🤔 일반 사용자 지갑에 이더와 함께 데이터도 전송하고 있네요. 이는 다소 특이한 패턴입니다. 받는 지갑이 이 데이터를 어떻게 처리할지 확실하지 않아요.\n\n`;
        } else if (hasValue) {
          report += `👤 일반적인 개인 간 이더 전송이네요. 가장 기본적이고 안전한 트랜잭션 형태입니다.\n\n`;
        } else {
          report += `🤷‍♂️ 일반 지갑에 값도 데이터도 없이 트랜잭션을 보내고 있네요. 이는 매우 드문 경우인데, 특별한 목적이 있으실까요?\n\n`;
        }
      } else {
        report += `주소 타입을 확인하는 중이에요...\n\n`;
      }
    }
    
    // 함수 호출 상세 분석
    if (hasFunction && decodedParams && decodedParams.length > 0) {
      report += `📋 함수 파라미터를 자세히 살펴보면:\n`;
      decodedParams.forEach((param, index) => {
        let displayValue = param.value;
        if (typeof param.value === 'bigint') {
          displayValue = param.value.toString();
        } else if (typeof param.value === 'object' && param.value !== null) {
          displayValue = JSON.stringify(param.value);
        }
        
        // 파라미터별 친근한 설명
        if (param.type === 'address') {
          const shortAddr = displayValue.length > 10 ? `${displayValue.slice(0, 6)}...${displayValue.slice(-4)}` : displayValue;
          report += `   ${index + 1}. ${param.name}: ${shortAddr} - 블록체인 주소에요\n`;
        } else if (param.type === 'uint256' && param.name === 'amount') {
          report += `   ${index + 1}. ${param.name}: ${displayValue} - 토큰 수량입니다 (Wei 단위)\n`;
        } else if (param.type.includes('uint')) {
          report += `   ${index + 1}. ${param.name}: ${displayValue} - 숫자 값이에요\n`;
        } else if (param.type === 'bool') {
          report += `   ${index + 1}. ${param.name}: ${displayValue} - 참/거짓 값입니다\n`;
        } else if (param.type === 'string') {
          report += `   ${index + 1}. ${param.name}: "${displayValue}" - 텍스트 데이터에요\n`;
        } else {
          report += `   ${index + 1}. ${param.name}: ${displayValue} (${param.type} 타입)\n`;
        }
      });
      report += `\n`;
    } else if (hasFunction && functionSignature !== "Loading...") {
      const mainFunction = functionSignature.split('\n')[0];
      report += `🔧 호출하려는 함수: "${mainFunction}"\n`;
      if (!decodedParams || decodedParams.length === 0) {
        report += `이 함수는 파라미터가 없거나 파라미터 디코딩에 실패했어요.\n\n`;
      }
    }
    
    // Gas 정보 (있는 경우)
    if (actualTx.gasPrice || actualTx.maxFeePerGas) {
      const gasPrice = actualTx.gasPrice || actualTx.maxFeePerGas;
      const gasPriceGwei = weiToGwei(gasPrice);
      report += `⛽ 가스 비용: ${gasPriceGwei} Gwei로 설정하셨네요. `;
      
      const gasPriceNum = parseFloat(gasPriceGwei);
      if (gasPriceNum > 100) {
        report += `다소 높은 가스 가격이에요. 빠른 처리를 원하시는군요!\n\n`;
      } else if (gasPriceNum > 50) {
        report += `적당한 가스 가격이네요.\n\n`;
      } else {
        report += `경제적인 가스 가격을 선택하셨어요. 처리 시간이 조금 걸릴 수 있어요.\n\n`;
      }
    }
    
    // 최종 요약 및 조언
    if (isScamAddress) {
      report += `🚨 요약: 스캠으로 신고된 악성 주소입니다. 어떤 상황에서도 이 트랜잭션을 진행하지 마세요! 자산을 영구적으로 잃을 위험이 매우 높습니다.`;
    } else if (addressType === "Contract" && hasFunction) {
      report += `💡 요약: 스마트 컨트랙트와 상호작용하는 트랜잭션입니다. 컨트랙트가 신뢰할 수 있는지, 함수가 예상한 동작을 하는지 확인하신 후 진행하시는 것이 좋겠어요.`;
    } else if (hasValue && addressType === "Account") {
      report += `💡 요약: 일반적인 이더 전송 트랜잭션입니다. 받는 주소가 정확한지 마지막으로 한 번 더 확인해주세요. 블록체인에서는 실수로 보낸 자산을 되돌릴 수 없거든요.`;
    } else if (addressType === "Account" && hasData) {
      report += `💡 요약: 일반 지갑에 데이터를 전송하는 특이한 트랜잭션이에요. 정말 의도한 것이 맞는지 다시 한번 확인해보시길 권해드려요.`;
    } else {
      report += `💡 요약: 트랜잭션 내용을 꼼꼼히 검토하셨다면 안전하게 진행하세요. 궁금한 점이 있다면 더 자세히 조사해보시는 것도 좋은 방법이에요.`;
    }
    
    return report;
  };

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

      {/* 스캠 주소 경고 */}
      {isScamAddress && (
        <div style={{
          backgroundColor: "#FEE2E2",
          border: "2px solid #DC2626",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <div style={{
            fontSize: "24px",
            color: "#DC2626"
          }}>
            🚨
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "#7F1D1D",
              marginBottom: "4px"
            }}>
              ⚠️ SCAM ADDRESS DETECTED
            </div>
            <div style={{
              fontSize: "14px",
              color: "#991B1B",
              marginBottom: "8px"
            }}>
              This address has been reported as a scam. Do not proceed with this transaction!
            </div>
            <a
              href={`https://cryptoscam.org/reports?search=${actualTx.to}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "13px",
                color: "#DC2626",
                textDecoration: "underline",
                fontWeight: "600"
              }}
            >
              View scam reports on CryptoScam.org →
            </a>
          </div>
        </div>
      )}

      {/* 스캠 확인 로딩 상태 */}
      {scamCheckLoading && (
        <div style={{
          backgroundColor: "#FEF3C7",
          border: "1px solid #F59E0B",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <div style={{
            width: "16px",
            height: "16px",
            border: "2px solid #F59E0B",
            borderTop: "2px solid transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }}></div>
          <div style={{
            fontSize: "14px",
            color: "#92400E"
          }}>
            Checking address safety...
          </div>
        </div>
      )}

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

      {/* 미니언 인사이트 섹션 */}
      <div style={{ 
        marginBottom: 24,
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        overflow: "hidden"
      }}>
        <div style={{
          width: "100%",
          background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
          color: "white",
          padding: "16px 20px",
          fontSize: "16px",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>🤖</span>
          <span>미니언 인사이트</span>
        </div>
        
        <div style={{
          background: "#FFFFFF",
          padding: "20px",
          borderTop: "1px solid #E5E7EB"
        }}>
          <div style={{
            color: "#374151",
            fontSize: "14px",
            lineHeight: "1.6",
            whiteSpace: "pre-line",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }}>
            {generateReport()}
          </div>
        </div>
      </div>

      {/* Raw 데이터 섹션 */}
      <div style={{ 
        marginBottom: 24,
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        overflow: "hidden"
      }}>
        <div style={{
          width: "100%",
          background: "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)",
          color: "white",
          padding: "16px 20px",
          fontSize: "16px",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>📄</span>
          <span>Raw Transaction Data</span>
        </div>
        
        <div style={{
          background: "#FFFFFF",
          padding: "20px",
          borderTop: "1px solid #E5E7EB"
        }}>
          <pre style={{ 
            background: "#F9FAFB", 
            padding: "16px", 
            borderRadius: "6px", 
            fontSize: "11px", 
            margin: 0, 
            overflowX: "auto",
            overflowY: "auto",
            border: "1px solid #E5E7EB",
            fontFamily: "monospace",
            lineHeight: 1.4,
            color: "#374151",
            whiteSpace: "pre",
            maxHeight: "300px"
          }}>
            {JSON.stringify(tx, null, 2)}
          </pre>
        </div>
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