import React, { useState } from 'react';
import { styles } from './styles';

interface WelcomeScreenProps {
  onSubmit: (apiKey: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSubmit }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await chrome.storage.local.set({ noditApiKey: apiKey });
    onSubmit(apiKey);
  };

  const handleApiKeyLinkClick = () => {
    chrome.tabs.create({ url: 'https://developer.nodit.io/docs/api-key' });
  };

  return (
    <div style={styles.welcomeContainer}>
      <div>
        <h2 style={styles.title}>Nodit Minion</h2>
        <p style={styles.subtitle}>
          {/* 멀티체인 블록체인 데이터 분석을 위한 전문 도구 */}
        </p>
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputContainer}>
          <label style={styles.label}>Nodit Minion API 키 입력</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={styles.input}
            placeholder="API 키를 입력해주세요"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            ...styles.button,
            opacity: isLoading ? 0.8 : 1,
            marginTop: '8px',
          }}
        >
          {isLoading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner} />
              연결 중...
            </div>
          ) : (
            '연결하기'
          )}
        </button>
      </form>
      
      {/* API Key 발급 도움말 링크 */}
      <div style={{
        textAlign: 'center' as const,
        marginTop: '16px',
        padding: '12px 0 16px 0',
      }}>
        <span style={{
          fontSize: '13px',
          color: '#6B7280',
        }}>API Key가 없으세요? </span>
        <button
          type="button"
          onClick={handleApiKeyLinkClick}
          style={{
            fontSize: '13px',
            color: '#10B981',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: '0',
            fontFamily: 'inherit',
            transition: 'color 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#059669';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#10B981';
          }}
        >
          여기서 발급받으세요
        </button>
      </div>

      {/* Powered By Lambda256 브랜딩 */}
      <div style={{
        textAlign: 'center' as const,
        marginTop: '8px',
        paddingTop: '16px',
        borderTop: '1px solid #F3F4F6',
      }}>
        <span style={{
          fontSize: '11px',
          color: '#9CA3AF',
          opacity: 0.7,
          fontWeight: '400',
          letterSpacing: '0.5px',
        }}>
          Powered By Lambda256
        </span>
      </div>
    </div>
  );
}; 