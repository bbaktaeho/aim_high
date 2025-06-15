import React, { useEffect, useState } from 'react';
import { CHAIN_CONFIG } from '../../constants/chains';
import { AccountStats } from '../../types';
import { AccountStatsCard } from './AccountStatsCard';

interface AccountCarouselProps {
  accountStats: AccountStats[];
  currentChainId: number;
}

export const AccountCarousel: React.FC<AccountCarouselProps> = ({ 
  accountStats, 
  currentChainId 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Set current chain as active initially
    const currentChainIndex = accountStats.findIndex(stats => 
      CHAIN_CONFIG[currentChainId as keyof typeof CHAIN_CONFIG]?.protocol === stats.protocol
    );
    if (currentChainIndex !== -1) {
      setCurrentIndex(currentChainIndex);
    }
  }, [accountStats, currentChainId]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % accountStats.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + accountStats.length) % accountStats.length);
  };

  if (accountStats.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6B7280',
        backgroundColor: '#F9FAFB',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
      }}>
        No account data available
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Carousel Container */}
      <div style={{
        overflow: 'hidden',
        borderRadius: '12px',
      }}>
        <div style={{
          display: 'flex',
          transform: `translateX(-${currentIndex * 296}px)`,
          transition: 'transform 0.3s ease',
        }}>
          {accountStats.map((stats, index) => (
            <AccountStatsCard
              key={`${stats.protocol}-${stats.network}`}
              stats={stats}
              isActive={CHAIN_CONFIG[currentChainId as keyof typeof CHAIN_CONFIG]?.protocol === stats.protocol}
            />
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {accountStats.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            style={{
              position: 'absolute',
              left: '-12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={nextSlide}
            style={{
              position: 'absolute',
              right: '-12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {accountStats.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '16px',
        }}>
          {accountStats.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: index === currentIndex ? '#10B981' : '#D1D5DB',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}; 