import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
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
        style={{
          fontSize: '13px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--green)',
          marginBottom: '2.5rem',
          fontWeight: 600,
        }}
      >
        Number Memory
      </div>
      <div
        style={{
          fontSize: '28px',
          fontWeight: 600,
          marginBottom: '8px',
        }}
      >
        How good is your memory?
      </div>
      <div
        style={{
          color: 'var(--muted)',
          fontSize: '15px',
          marginBottom: '2.5rem',
          lineHeight: 1.6,
        }}
      >
        A number flashes on screen.
        <br />
        Remember it. Type it back. Beat your record.
      </div>
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
            boxShadow: '0 0 8px var(--green)',
          }}
        />
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'var(--green)',
            boxShadow: '0 0 8px var(--green)',
          }}
        />
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'var(--green)',
            boxShadow: '0 0 8px var(--green)',
          }}
        />
      </div>
      <button
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '14px',
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: 'var(--sans)',
          background: 'var(--green)',
          color: '#050f0a',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Start Game →
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
