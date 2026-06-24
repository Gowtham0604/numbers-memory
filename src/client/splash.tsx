import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { fetchSplashStats } from './lib/game-api';

export const Splash = () => {
  const [dayNumber, setDayNumber] = useState<number | null>(null);

  useEffect(() => {
    fetchSplashStats()
      .then((res) => {
        if (res.status === 'success') setDayNumber(res.data.dayNumber);
      })
      .catch(() => {});
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        textAlign: 'center',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(16,185,129,0.12) 0%, transparent 60%), var(--bg)',
      }}
    >
      <div
        style={{
          maxWidth: '400px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(16,185,129,0.2))',
            border: '1px solid rgba(139,92,246,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '24px',
            boxShadow: '0 0 40px rgba(139,92,246,0.2)',
          }}
        >
          🧠
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--primary)',
            fontWeight: 700,
            marginBottom: '10px',
          }}
        >
          {dayNumber !== null ? `Daily Challenge · #${dayNumber}` : 'Daily Challenge'}
        </div>
        <div
          style={{
            fontSize: '30px',
            fontWeight: 800,
            marginBottom: '12px',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          Number Memory
        </div>

        {/* Tagline */}
        <div
          style={{
            color: 'var(--muted)',
            fontSize: '15px',
            lineHeight: 1.65,
            marginBottom: '32px',
            maxWidth: '300px',
          }}
        >
          A number flashes. You memorize it.
          <br />
          Type it back. How far can you go?
        </div>

        {/* Example sequence preview */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          {['3', '7', '1', '?'].map((digit, i) => (
            <div
              key={i}
              style={{
                width: '44px',
                height: '52px',
                borderRadius: '12px',
                background: digit === '?'
                  ? 'rgba(139,92,246,0.12)'
                  : 'rgba(255,255,255,0.06)',
                border: `1px solid ${digit === '?' ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: digit === '?' ? '20px' : '22px',
                fontFamily: 'var(--mono)',
                fontWeight: 600,
                color: digit === '?' ? 'var(--primary)' : 'var(--text)',
              }}
            >
              {digit}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '0.02em',
            borderRadius: '14px',
          }}
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          Play Today's Challenge →
        </button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
