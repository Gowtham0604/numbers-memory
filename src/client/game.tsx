import './index.css';

import { StrictMode, useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

type GamePhase = 'howto' | 'name' | 'showing' | 'input' | 'result';

const INPUT_TIME = 15;
const CIRC = 138;

const generateNumber = (length: number): string => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
};

export const App = () => {
  const [phase, setPhase] = useState<GamePhase>('howto');
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [playerName, setPlayerName] = useState('');
  const [currentNumber, setCurrentNumber] = useState('');
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(INPUT_TIME);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'ok' | 'bad' | ''>('');
  const [cardState, setCardState] = useState<'correct' | 'wrong' | ''>('');
  const [showNumber, setShowNumber] = useState(false);
  const [hintText, setHintText] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showQuitModal, setShowQuitModal] = useState(false);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const startCountdown = () => {
    setTimeLeft(INPUT_TIME);
    countdownIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopCountdown();
          if (phaseRef.current === 'input') {
            handleTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    setPhase('result');
    setCardState('wrong');
    setFeedback(`⏱ Time's up! It was ${currentNumber}`);
    setFeedbackType('bad');
    setHintText('');
    const newLives = lives - 1;
    setLives(newLives);

    if (newLives <= 0) {
      setTimeout(() => showResult(), 1100);
    } else {
      setTimeout(() => startRound(), 1400);
    }
  };

  const startRound = () => {
    stopCountdown();
    setPhase('showing');
    setUserInput('');
    setFeedback('');
    setFeedbackType('');
    setCardState('');
    setHintText('Memorise this number…');

    const number = generateNumber(level + 2);
    setCurrentNumber(number);
    setShowNumber(true);

    const duration = Math.max(1200, number.length * 480);

    setTimeout(() => {
      setShowNumber(false);
      setTimeout(() => {
        setPhase('input');
        setHintText('Now type what you saw');
        startCountdown();
      }, 250);
    }, duration);
  };

  const checkAnswer = () => {
    if (phase !== 'input') return;
    const ans = userInput.trim();
    if (!ans) return;

    stopCountdown();
    setPhase('result');

    if (ans === currentNumber) {
      setCardState('correct');
      setFeedback('✓ Correct!');
      setFeedbackType('ok');
      setHintText('');
      setLevel((prev) => prev + 1);
      setTimeout(() => startRound(), 900);
    } else {
      setCardState('wrong');
      setFeedback(`✗ It was ${currentNumber}`);
      setFeedbackType('bad');
      setHintText('');
      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        setTimeout(() => showResult(), 1100);
      } else {
        setTimeout(() => startRound(), 1400);
      }
    }
  };

  const showResult = () => {
    stopCountdown();
    setPhase('result');
  };

  const startGame = () => {
    const name = nameInput.trim() || 'Player';
    setPlayerName(name);
    initPlay();
  };

  const startGameAnon = () => {
    setPlayerName('');
    initPlay();
  };

  const initPlay = () => {
    setLevel(1);
    setLives(3);
    setPhase('showing');
    setTimeout(() => startRound(), 100);
  };

  const restartGame = () => {
    setLevel(1);
    setLives(3);
    setPhase('showing');
    setTimeout(() => startRound(), 100);
  };

  const quitGame = () => {
    stopCountdown();
    setShowQuitModal(true);
  };

  const confirmQuit = () => {
    setShowQuitModal(false);
    showResult();
  };

  const closeQuitModal = () => {
    setShowQuitModal(false);
    setPhase('input');
    startCountdown();
  };

  const digits = level + 2;
  const emoji = digits >= 10 ? '🏆' : digits >= 8 ? '🌟' : digits >= 6 ? '🧠' : '💪';
  const tag =
    digits >= 10
      ? '🏆 Top 1% memory!'
      : digits >= 8
        ? '⭐ Above average!'
        : digits >= 7
          ? '✓ Right at average'
          : "Keep training — you'll improve!";

  const benchmarks = [
    { label: 'Average', val: 7, color: '#888' },
    { label: 'You', val: digits, color: 'var(--green)' },
    { label: 'Expert', val: 10, color: 'var(--amber)' },
  ];
  const maxBench = Math.max(...benchmarks.map((b) => b.val)) + 2;

  const ringOffset = CIRC * (1 - timeLeft / INPUT_TIME);
  const ringColor = timeLeft <= 5 ? 'var(--red)' : 'var(--green)';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '440px',
        padding: '1.5rem',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* HOW TO PLAY SCREEN */}
      {phase === 'howto' && (
        <div style={{ textAlign: 'center', width: '100%' }}>
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
          <div style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px' }}>
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
              flexDirection: 'column',
              gap: '12px',
              textAlign: 'left',
              marginBottom: '2.5rem',
            }}
          >
            {[
              {
                num: '1',
                text: (
                  <>
                    <strong>Watch the number</strong> — a sequence of digits appears briefly,
                    then disappears.
                  </>
                ),
              },
              {
                num: '2',
                text: (
                  <>
                    <strong>Type it back</strong> — you have 15 seconds to enter what you saw.
                  </>
                ),
              },
              {
                num: '3',
                text: (
                  <>
                    <strong>Each round gets harder</strong> — one more digit is added every time
                    you get it right.
                  </>
                ),
              },
              {
                num: '4',
                text: (
                  <>
                    <strong>You have 3 lives</strong> — wrong answer or time's up costs one life.
                    Game ends at zero.
                  </>
                ),
              },
            ].map((step) => (
              <div
                key={step.num}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--green-dim)',
                    border: '1px solid rgba(0,229,160,0.3)',
                    color: 'var(--green)',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  {step.num}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: 'var(--muted)',
                  }}
                >
                  {step.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '1rem' }}>
            Your 3 lives
          </div>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              marginBottom: '2.5rem',
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'var(--green)',
                  boxShadow: '0 0 8px var(--green)',
                }}
              />
            ))}
          </div>
          <button
            style={{
              width: '100%',
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
            onClick={() => setPhase('name')}
          >
            Got it — let's play →
          </button>
        </div>
      )}

      {/* NAME ENTRY SCREEN */}
      {phase === 'name' && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ marginBottom: '2rem' }}>
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
            <div style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
              What's your name?
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '2rem' }}>
              We'll show it on your score card.
            </div>
          </div>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Enter your name"
              maxLength={24}
              autoComplete="off"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') startGame();
              }}
              style={{
                width: '100%',
                padding: '14px 18px',
                fontSize: '16px',
                fontFamily: 'var(--sans)',
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: '10px',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>
          <button
            style={{
              width: '100%',
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
              marginBottom: '10px',
            }}
            onClick={startGame}
          >
            Start game
          </button>
          <button
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '15px',
              fontWeight: 500,
              fontFamily: 'var(--sans)',
              background: 'transparent',
              color: 'var(--muted)',
              border: '1px solid var(--border-strong)',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
            onClick={startGameAnon}
          >
            Play without a name
          </button>
        </div>
      )}

      {/* PLAY SCREEN */}
      {(phase === 'showing' || phase === 'input') && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: 'var(--muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Level <span style={{ color: 'var(--text)', fontWeight: 600 }}>{level}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: i < lives ? 'var(--green)' : 'var(--surface2)',
                    boxShadow: i < lives ? '0 0 6px var(--green)' : 'none',
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>
            <button
              onClick={quitGame}
              title="Quit game"
              style={{
                fontSize: '12px',
                fontFamily: 'var(--sans)',
                fontWeight: 500,
                color: 'var(--muted)',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '5px 10px',
                cursor: 'pointer',
              }}
            >
              ✕ Quit
            </button>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: `1px solid ${cardState === 'correct' ? 'rgba(0,229,160,0.4)' : cardState === 'wrong' ? 'rgba(255,78,106,0.4)' : 'var(--border)'}`,
              borderRadius: '16px',
              padding: '2.5rem 1rem',
              marginBottom: '1rem',
              minHeight: '130px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                cardState === 'correct'
                  ? 'var(--green-dim)'
                  : cardState === 'wrong'
                    ? 'var(--red-dim)'
                    : 'var(--surface)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '48px',
                letterSpacing: '0.18em',
                color: 'var(--text)',
                opacity: showNumber ? 1 : 0,
                transition: 'opacity 0.25s',
              }}
            >
              {showNumber ? currentNumber : ''}
            </div>
          </div>

          <div
            style={{
              fontSize: '13px',
              color: 'var(--muted)',
              marginBottom: '1rem',
              minHeight: '20px',
            }}
          >
            {hintText}
          </div>

          <div
            style={{
              height: '3px',
              background: 'var(--surface2)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                height: '100%',
                width: phase === 'showing' ? '0%' : '100%',
                background: 'var(--green)',
                borderRadius: '2px',
                transformOrigin: 'left',
              }}
            />
          </div>

          {phase === 'input' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ position: 'relative', width: '52px', height: '52px', flexShrink: 0 }}>
                  <svg
                    width="52"
                    height="52"
                    viewBox="0 0 52 52"
                    style={{ transform: 'rotate(-90deg)' }}
                  >
                    <circle
                      cx="26"
                      cy="26"
                      r="22"
                      fill="none"
                      stroke="var(--surface2)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="26"
                      cy="26"
                      r="22"
                      fill="none"
                      stroke={ringColor}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={CIRC}
                      strokeDashoffset={ringOffset}
                      style={{ transition: 'stroke 0.5s' }}
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--mono)',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: 'var(--text)',
                    }}
                  >
                    {timeLeft}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={22}
                    placeholder="type the number…"
                    autoComplete="off"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') checkAnswer();
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '13px 16px',
                      fontSize: '22px',
                      fontFamily: 'var(--mono)',
                      letterSpacing: '0.12em',
                      textAlign: 'center',
                      background: 'var(--surface)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: '10px',
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={checkAnswer}
                    style={{
                      padding: '13px 20px',
                      fontSize: '15px',
                      fontWeight: 600,
                      fontFamily: 'var(--sans)',
                      background: 'var(--green)',
                      color: '#050f0a',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    Go
                  </button>
                </div>
              </div>
              <div
                style={{
                  fontSize: '14px',
                  minHeight: '22px',
                  marginTop: '8px',
                  color: feedbackType === 'ok' ? 'var(--green)' : feedbackType === 'bad' ? 'var(--red)' : 'inherit',
                }}
              >
                {feedback}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULT SCREEN */}
      {phase === 'result' && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>{emoji}</div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 600,
              color: 'var(--green)',
              fontFamily: 'var(--mono)',
              lineHeight: 1,
            }}
          >
            {digits}
          </div>
          <div style={{ fontSize: '15px', color: 'var(--muted)', margin: '6px 0 4px' }}>
            digits remembered
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
            {playerName ? `Well done, ${playerName}!` : 'Well done!'}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '4px',
              alignItems: 'flex-end',
              justifyContent: 'center',
              margin: '1.5rem 0',
              height: '48px',
            }}
          >
            {benchmarks.map((b) => {
              const h = Math.round((b.val / maxBench) * 44);
              return (
                <div
                  key={b.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: `${h}px`,
                      borderRadius: '4px 4px 0 0',
                      background: b.color,
                      opacity: 0.85,
                    }}
                  />
                  <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    {b.label}
                    <br />
                    <strong style={{ color: 'var(--text)' }}>{b.val}</strong>
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: 'inline-block',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              color: 'var(--muted)',
              marginBottom: '1.5rem',
            }}
          >
            {tag}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              style={{
                width: '100%',
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
              onClick={restartGame}
            >
              Play again
            </button>
            <button
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '15px',
                fontWeight: 500,
                fontFamily: 'var(--sans)',
                background: 'transparent',
                color: 'var(--muted)',
                border: '1px solid var(--border-strong)',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
              onClick={() => setPhase('howto')}
            >
              How to play
            </button>
          </div>
        </div>
      )}

      {/* QUIT MODAL */}
      {showQuitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '320px',
              width: '90%',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚪</div>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Quit game?
            </div>
            <div
              style={{
                fontSize: '14px',
                color: 'var(--muted)',
                marginBottom: '1.5rem',
                lineHeight: 1.6,
              }}
            >
              Your current progress will be lost and your score will be recorded.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: 'var(--sans)',
                  background: 'var(--red)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
                onClick={confirmQuit}
              >
                Yes, quit
              </button>
              <button
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '15px',
                  fontWeight: 500,
                  fontFamily: 'var(--sans)',
                  background: 'transparent',
                  color: 'var(--muted)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
                onClick={closeQuitModal}
              >
                Keep playing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
