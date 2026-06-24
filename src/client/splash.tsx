import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { fetchSplashStats } from './lib/game-api';

export const Splash = () => {
  const [stats, setStats] = useState<{
    playerCount: number;
    dayNumber: number;
    difficulty: string;
    expiresIn: { hours: number; minutes: number };
  } | null>(null);

  useEffect(() => {
    fetchSplashStats()
      .then((res) => {
        if (res.status === 'success') setStats(res.data);
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
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: '3rem 2rem',
          borderRadius: '24px',
          maxWidth: '440px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--green)',
            marginBottom: '1rem',
            fontWeight: 700,
          }}
        >
          Number Memory
        </div>
        <div
          style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '12px',
            lineHeight: 1.2,
          }}
        >
          How good is your memory?
        </div>
        <div
          style={{
            color: 'var(--muted)',
            fontSize: '16px',
            marginBottom: '1rem',
            lineHeight: 1.6,
          }}
        >
          A number flashes on screen.
          <br />
          Remember it. Type it back. Beat your record.
        </div>
        {stats && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '10px 16px',
              marginBottom: '1.5rem',
              width: '100%',
              fontSize: '13px',
            }}
          >
            <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: '4px' }}>
              Daily Challenge #{stats.dayNumber}
            </div>
            <div style={{ color: 'var(--muted)' }}>
              {stats.playerCount} playing today · {stats.difficulty} · {stats.expiresIn.hours}h {stats.expiresIn.minutes}m left
            </div>
          </div>
        )}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            marginBottom: '2.5rem',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 12px var(--green)',
            }}
          />
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 12px var(--green)',
            }}
          />
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 12px var(--green)',
            }}
          />
        </div>
        <button
          className="btn btn-primary"
          style={{
            width: '100%',
            maxWidth: '320px',
            padding: '16px',
            fontSize: '16px',
            letterSpacing: '0.02em',
          }}
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          Start Game →
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
