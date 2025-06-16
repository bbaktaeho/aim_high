import React, { useState } from 'react';

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
    <div style={{
      width: '360px',
      height: '580px',
      fontFamily: "'Noto Sans KR', sans-serif",
      backgroundColor: '#000',
      color: 'white',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 16px 16px',
        height: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: '12px',
          marginBottom: '32px',
          position: 'relative',
        }}>
          <span style={{
            fontSize: '20px',
            fontWeight: 'bold',
          }}>
            Web3 Minion
          </span>
          <span style={{
            fontSize: '18px',
            cursor: 'pointer',
            position: 'absolute',
            right: 0,
          }}>
            ⓘ
          </span>
        </div>

        {/* Preview Box */}
        <div style={{
          width: '250px',
          height: '160px',
          backgroundColor: '#ddd',
          color: '#111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontWeight: '500',
          marginBottom: '40px',
        }}>
          <p style={{ margin: 0, lineHeight: '1.4' }}>
            마우스 포인터에 따라<br />움직이는 루니 얼굴?
          </p>
        </div>

        {/* Input Section */}
        <div style={{
          width: '100%',
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <label style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '16px',
            display: 'block',
          }}>
            Nodit API 키를 입력하세요
          </label>

          <form onSubmit={handleSubmit} style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  marginTop: '10px',
                  marginBottom: '16px',
                  backgroundColor: '#111',
                  color: 'white',
                  boxSizing: 'border-box',
                }}
              />

              <button
                type="button"
                onClick={handleApiKeyLinkClick}
                style={{
                  display: 'block',
                  marginBottom: '40px',
                  fontSize: '13px',
                  color: '#888',
                  textDecoration: 'none',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
              >
                Nodit API Key 발급하기
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                backgroundColor: isLoading ? 'rgba(0, 209, 108, 0.7)' : '#00d16c',
                color: 'black',
                padding: '14px',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.opacity = '0.9';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.opacity = '1';
                }
              }}
            >
              {isLoading && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(0, 0, 0, 0.3)',
                  borderTop: '2px solid black',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
              )}
              {isLoading ? '연결 중...' : '연결하기'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{
          fontSize: '12px',
          color: '#888',
          textAlign: 'center',
          paddingBottom: '4px',
        }}>
          Powered by Nodit
        </div>
      </div>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          input::placeholder {
            color: #999 !important;
          }
        `}
      </style>
    </div>
  );
}; 