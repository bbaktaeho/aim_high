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

  return (
    <div style={styles.welcomeContainer}>
      <div>
        <h2 style={styles.title}>Welcome to Nodit</h2>
        <p style={styles.subtitle}>Enter your API key to get started</p>
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputContainer}>
          <label style={styles.label}>Enter Nodit API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={styles.input}
            placeholder="Enter your API key"
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
              Connecting...
            </div>
          ) : (
            'Connect'
          )}
        </button>
      </form>
    </div>
  );
}; 