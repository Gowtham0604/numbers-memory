import './index.css';

import { StrictMode, useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { fetchGameInit, fetchLeaderboard, submitGameScore } from './lib/game-api';
import { generateSeededNumber } from '../shared/game';
import type { GameInitData, SubmitScoreData } from '../shared/api';
import type { LeaderboardEntry } from '../shared/game';

type GamePhase = 'tutorial' | 'showing' | 'input' | 'result' | 'gameover';
type TutorialStep = 'intro' | 'watch' | 'type' | 'done';

const BASE_INPUT_TIME = 10;
const EXTENDED_INPUT_TIME = 12;
const EXTENDED_LEVEL_THRESHOLD = 10; // level 10+ gets more time
const TUTORIAL_NUMBER = '4823';
const HAS_PLAYED_KEY = 'nmg_has_played';

// Scale font size down for long numbers so they don't overflow
const numberFontSize = (len: number): string => {
  if (len <= 5) return '48px';
  if (len <= 8) return '36px';
  if (len <= 11) return '28px';
  return '22px';
};

// Break long numbers into groups for readability
const formatNumber = (num: string): string => {
  if (num.length <= 5) return num;
  // groups of 3 separated by thin space
  return num.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
};

const generateNumber = (length: number): string => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
};

export const App = () => {
  const hasPlayed = typeof localStorage !== 'undefined' && localStorage.getItem(HAS_PLAYED_KEY) === '1';

  const [phase, setPhase] = useState<GamePhase>(hasPlayed ? 'showing' : 'tutorial');
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [currentNumber, setCurrentNumber] = useState('');
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(BASE_INPUT_TIME);
  const [maxTime, setMaxTime] = useState(BASE_INPUT_TIME);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'ok' | 'bad' | ''>('');
  const [cardState, setCardState] = useState<'correct' | 'wrong' | ''>('');
  const [showNumber, setShowNumber] = useState(false);
  const [hintText, setHintText] = useState('');
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [inputError, setInputError] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [showWrongBanner, setShowWrongBanner] = useState(false);
  const [showCorrectBanner, setShowCorrectBanner] = useState(false);

  // Tutorial state
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>('intro');
  const [tutorialShowNumber, setTutorialShowNumber] = useState(false);
  const [tutorialInput, setTutorialInput] = useState('');
  const [tutorialFeedback, setTutorialFeedback] = useState('');
  const [tutorialFeedbackType, setTutorialFeedbackType] = useState<'ok' | 'bad' | ''>('');
  const [tutorialInputError, setTutorialInputError] = useState(false);

  const [gameInit, setGameInit] = useState<GameInitData | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitScoreData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(phase);
  const gameInitRef = useRef(gameInit);

  useEffect(() => {
    gameInitRef.current = gameInit;
  }, [gameInit]);

  useEffect(() => {
    void fetchGameInit()
      .then((res) => {
        if (res.status === 'success') setGameInit(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const triggerWrongFeedback = () => {
    setShakeCard(true);
    setShowWrongBanner(true);
    setTimeout(() => setShakeCard(false), 600);
  };

  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const startCountdown = (currentLevel = 1) => {
    const challenge = gameInitRef.current?.dailyChallenge;
    const bonus = challenge?.inputTimeBonus ?? 0;
    const baseTime = currentLevel >= EXTENDED_LEVEL_THRESHOLD ? EXTENDED_INPUT_TIME : BASE_INPUT_TIME;
    const inputTime = Math.max(5, baseTime + bonus);
    setMaxTime(inputTime);
    setTimeLeft(inputTime);
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
    triggerWrongFeedback();

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
    setInputError(false);
    setShakeCard(false);
    setShowWrongBanner(false);
    setShowCorrectBanner(false);
    setHintText('Memorise this number…');

    const numberLength = level + 2;
    const init = gameInitRef.current;
    const number =
      init?.isDailyChallenge && init.dailyChallenge && !init.isExpired
        ? generateSeededNumber(init.dailyChallenge.seed, level, numberLength)
        : generateNumber(numberLength);
    setCurrentNumber(number);
    setShowNumber(true);

    const baseDuration = Math.max(1200, number.length * 480);
    const multiplier = init?.dailyChallenge?.displayTimeMultiplier ?? 1;
    const duration = baseDuration * multiplier;

    setTimeout(() => {
      setShowNumber(false);
      setTimeout(() => {
        setPhase('input');
        setHintText('Now type what you saw');
        startCountdown(level);
      }, 250);
    }, duration);
  };

  // Auto-start game if returning user
  useEffect(() => {
    if (hasPlayed && phase === 'showing') {
      startRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAnswer = () => {
    if (phase !== 'input') return;
    const ans = userInput.trim();
    if (!ans) return;

    if (!/^\d+$/.test(ans)) {
      setInputError(true);
      setFeedback('⚠️ Please enter only numbers');
      setFeedbackType('bad');
      setTimeout(() => {
        setInputError(false);
        setFeedback('');
        setFeedbackType('');
      }, 1500);
      return;
    }

    stopCountdown();
    setPhase('result');

    if (ans === currentNumber) {
      setCardState('correct');
      setFeedback('✓ Correct!');
      setFeedbackType('ok');
      setHintText('');
      setShowCorrectBanner(true);
      setLevel((prev) => prev + 1);
      setTimeout(() => startRound(), 1600);
    } else {
      setCardState('wrong');
      setFeedback(`✗ It was ${currentNumber}`);
      setFeedbackType('bad');
      setHintText('');
      const newLives = lives - 1;
      setLives(newLives);
      triggerWrongFeedback();

      if (newLives <= 0) {
        setTimeout(() => showResult(), 1100);
      } else {
        setTimeout(() => startRound(), 1400);
      }
    }
  };

  const recordScore = useCallback(async (finalLevel: number) => {
    const score = finalLevel - 1;
    if (score <= 0 || scoreSubmitted) return;

    setScoreSubmitted(true);
    try {
      const [scoreRes, lbRes] = await Promise.all([
        submitGameScore(score),
        fetchLeaderboard(10),
      ]);
      if (scoreRes.status === 'success') setSubmitResult(scoreRes.data);
      if (lbRes.status === 'success') setLeaderboard(lbRes.data.entries);
    } catch {
      // Score submission is best-effort; game over UI still shows local result
    }
  }, [scoreSubmitted]);

  const showResult = () => {
    stopCountdown();
    setPhase('gameover');
    void recordScore(level);
  };

  const initPlay = () => {
    localStorage.setItem(HAS_PLAYED_KEY, '1');
    setLevel(1);
    setLives(3);
    setPhase('showing');
    setTimeout(() => startRound(), 100);
  };

  const restartGame = () => {
    setLevel(1);
    setLives(3);
    setSubmitResult(null);
    setLeaderboard([]);
    setScoreSubmitted(false);
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
    startCountdown(level);
  };

  // Tutorial helpers
  const runTutorialDemo = () => {
    setTutorialStep('watch');
    setTutorialShowNumber(false);
    setTutorialInput('');
    setTutorialFeedback('');
    setTutorialFeedbackType('');

    setTimeout(() => {
      setTutorialShowNumber(true);
      setTimeout(() => {
        setTutorialShowNumber(false);
        setTimeout(() => {
          setTutorialStep('type');
        }, 300);
      }, 2400);
    }, 400);
  };

  const checkTutorialAnswer = () => {
    const ans = tutorialInput.trim();
    if (!ans) return;

    if (!/^\d+$/.test(ans)) {
      setTutorialInputError(true);
      setTutorialFeedback('⚠️ Only numbers allowed');
      setTutorialFeedbackType('bad');
      return;
    }

    if (ans === TUTORIAL_NUMBER) {
      setTutorialFeedback('✓ Perfect! You got it!');
      setTutorialFeedbackType('ok');
      setTimeout(() => setTutorialStep('done'), 900);
    } else {
      setTutorialFeedback(`✗ It was ${TUTORIAL_NUMBER} — try the real game!`);
      setTutorialFeedbackType('bad');
      setTimeout(() => setTutorialStep('done'), 1200);
    }
  };

  const levelsCompleted = level - 1;
  const emoji =
    levelsCompleted >= 15
      ? '🏆'
      : levelsCompleted >= 10
        ? '🌟'
        : levelsCompleted >= 5
          ? '🧠'
          : levelsCompleted > 0
            ? '💪'
            : '😴';
  const tag =
    levelsCompleted >= 15
      ? '🏆 Memory master!'
      : levelsCompleted >= 10
        ? '⭐ Impressive run!'
        : levelsCompleted >= 5
          ? '✓ Solid performance!'
          : levelsCompleted > 0
            ? "Keep training — you'll improve!"
            : 'No levels completed — try again!';

  const MILESTONES = [1, 3, 5, 8, 10, 15];
  const ringColor = timeLeft <= 5 ? 'var(--red)' : 'var(--green)';

  if (loading) {
    return (
      <div style={{ width: '100%', maxWidth: '440px', padding: '1rem', margin: '0 auto', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading…</div>
      </div>
    );
  }

  if (gameInit?.isDailyChallenge && gameInit.isExpired) {
    return (
      <div style={{ width: '100%', maxWidth: '440px', padding: '1rem', margin: '0 auto', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏰</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Challenge ended</div>
          <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '8px', lineHeight: 1.6 }}>
            This daily challenge has expired.
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '1.5rem' }}>
            {gameInit.playerCount} players competed today
          </div>
          <div style={{ fontSize: '13px', color: 'var(--green)' }}>
            Find today's challenge in the subreddit feed →
          </div>
        </div>
      </div>
    );
  }

  const progressionBar = gameInit && gameInit.xp > 0 ? (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
        <span>Level {gameInit.level}</span>
        {gameInit.streak.current > 0 && <span>🔥 {gameInit.streak.current} day streak</span>}
        <span>{gameInit.levelProgress.current}/{gameInit.levelProgress.required} XP</span>
      </div>
      <div style={{ height: '4px', background: 'var(--surface2)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${gameInit.levelProgress.percent}%`, background: 'var(--green)', borderRadius: '2px', transition: 'width 0.5s' }} />
      </div>
    </div>
  ) : null;

  const dailyBanner = gameInit?.isDailyChallenge && gameInit.dailyChallenge ? (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', marginBottom: '1rem', fontSize: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--green)', fontWeight: 600 }}>Daily #{gameInit.dailyChallenge.dayNumber}</span>
        <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{gameInit.dailyChallenge.difficulty}</span>
      </div>
      <div style={{ color: 'var(--muted)', marginTop: '4px' }}>
        ⏰ {gameInit.expiresIn.hours}h {gameInit.expiresIn.minutes}m left · {gameInit.playerCount} playing today
      </div>
    </div>
  ) : null;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '440px',
        padding: '1rem',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* ── TUTORIAL SCREEN (first-time only) ── */}
      {phase === 'tutorial' && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          {/* Header */}
          <div
            style={{
              fontSize: '13px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--green)',
              marginBottom: '0.5rem',
              fontWeight: 600,
            }}
          >
            Number Memory
          </div>

          {/* INTRO step */}
          {tutorialStep === 'intro' && (
            <>
              <div style={{ fontSize: '26px', fontWeight: 700, marginBottom: '8px' }}>
                How it works
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '2rem', lineHeight: 1.6 }}>
                We'll walk you through a quick demo so you know what to expect.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem', textAlign: 'left' }}>
                {[
                  { icon: '👁', label: 'A number flashes on screen for a few seconds' },
                  { icon: '🧠', label: 'It disappears — hold it in your memory' },
                  { icon: '⌨️', label: 'Type it back before time runs out' },
                  { icon: '📈', label: 'Each correct answer adds one more digit' },
                  { icon: '❤️', label: 'You have 3 lives — wrong or timeout costs one' },
                ].map((item) => (
                  <div
                    key={item.icon}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                    }}
                  >
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>{item.label}</span>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px', fontSize: '16px' }}
                onClick={runTutorialDemo}
              >
                See a demo →
              </button>
            </>
          )}

          {/* WATCH step — number is shown/hidden */}
          {tutorialStep === 'watch' && (
            <>
              <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>
                Watch the number
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '1.5rem' }}>
                Memorise it before it disappears…
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '2.5rem 1rem',
                  marginBottom: '1rem',
                  minHeight: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '52px',
                    letterSpacing: '0.2em',
                    opacity: tutorialShowNumber ? 1 : 0,
                    transition: 'opacity 0.3s',
                    color: 'var(--text)',
                  }}
                >
                  {TUTORIAL_NUMBER}
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                {tutorialShowNumber ? '👁 Look at it carefully…' : '⏳ Getting ready…'}
              </div>
            </>
          )}

          {/* TYPE step */}
          {tutorialStep === 'type' && (
            <>
              <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>
                Now type it back
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '1.5rem' }}>
                What was the number?
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '2.5rem 1rem',
                  marginBottom: '1rem',
                  minHeight: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '52px',
                    letterSpacing: '0.2em',
                    color: 'var(--muted)',
                    opacity: 0.25,
                  }}
                >
                  ????
                </div>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="type the number…"
                autoComplete="off"
                autoFocus
                value={tutorialInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d+$/.test(val)) {
                    setTutorialInput(val);
                    setTutorialInputError(false);
                    setTutorialFeedback('');
                    setTutorialFeedbackType('');
                  } else {
                    setTutorialInputError(true);
                    setTutorialFeedback('⚠️ Only numbers allowed');
                    setTutorialFeedbackType('bad');
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') checkTutorialAnswer(); }}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '24px',
                  fontFamily: 'var(--mono)',
                  letterSpacing: '0.15em',
                  textAlign: 'center',
                  background: 'var(--surface)',
                  border: `2px solid ${tutorialInputError ? 'var(--red)' : 'var(--border-strong)'}`,
                  borderRadius: '12px',
                  color: 'var(--text)',
                  outline: 'none',
                  marginBottom: '10px',
                  boxSizing: 'border-box',
                }}
              />

              <div
                style={{
                  fontSize: '14px',
                  minHeight: '22px',
                  marginBottom: '10px',
                  color: tutorialFeedbackType === 'ok' ? 'var(--green)' : tutorialFeedbackType === 'bad' ? 'var(--red)' : 'inherit',
                }}
              >
                {tutorialFeedback}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '16px' }}
                onClick={checkTutorialAnswer}
                disabled={!tutorialInput.trim()}
              >
                Submit
              </button>

              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '13px',
                  marginTop: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                onClick={() => setTutorialStep('done')}
              >
                Skip demo
              </button>
            </>
          )}

          {/* DONE step */}
          {tutorialStep === 'done' && (
            <>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧠</div>
              <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                You're ready!
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '2rem', lineHeight: 1.6 }}>
                Numbers get longer as you level up. Stay focused and beat your record.
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                  marginBottom: '2rem',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: 'var(--green)',
                        boxShadow: '0 0 8px var(--green)',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '2rem' }}>
                Your 3 lives
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px', fontSize: '16px', letterSpacing: '0.02em' }}
                onClick={initPlay}
              >
                Start game →
              </button>
            </>
          )}
        </div>
      )}

      {/* ── PLAY SCREEN ── */}
      {(phase === 'showing' || phase === 'input' || phase === 'result') && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          {dailyBanner}
          {progressionBar}
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
              className="btn btn-quit"
              onClick={quitGame}
              title="Quit game"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              ✕ Quit
            </button>
          </div>

          {showWrongBanner && (
            <div className="wrong-banner">
              <span style={{ fontSize: '18px' }}>✗</span>
              <span>
                {feedbackType === 'bad' && feedback.includes("Time")
                  ? `⏱ Time's up! The number was ${currentNumber}`
                  : `Wrong! The number was ${currentNumber}`}
              </span>
            </div>
          )}

          <div
            className={shakeCard ? 'shake' : ''}
            style={{
              background: 'var(--surface)',
              border: `1px solid ${cardState === 'correct' ? 'rgba(0,229,160,0.4)' : cardState === 'wrong' ? 'rgba(255,78,106,0.4)' : 'var(--border)'}`,
              borderRadius: '16px',
              padding: '2rem 1rem',
              marginBottom: '0.75rem',
              minHeight: '120px',
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
                fontSize: numberFontSize(currentNumber.length),
                letterSpacing: currentNumber.length <= 5 ? '0.18em' : '0.1em',
                color: 'var(--text)',
                opacity: showNumber ? 1 : 0,
                transition: 'opacity 0.25s',
                wordBreak: 'break-all',
                lineHeight: 1.3,
              }}
            >
              {showNumber ? formatNumber(currentNumber) : ''}
            </div>
          </div>

          {/* ── CORRECT BANNER ── */}
          {showCorrectBanner && (
            <div
              style={{
                animation: 'correctPop 0.35s ease-out forwards',
                background: 'var(--green-dim)',
                border: '1px solid rgba(16,185,129,0.45)',
                borderRadius: '12px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                color: 'var(--green)',
                fontSize: '17px',
                fontWeight: 700,
                marginTop: '8px',
              }}
            >
              <span style={{ fontSize: '22px' }}>🎉</span>
              <span>
                {level <= 4 ? 'Nice one!' : level <= 7 ? 'Great job!' : level <= 10 ? 'Impressive!' : 'Incredible! 🔥'}
              </span>
            </div>
          )}

          <div
            style={{
              fontSize: '13px',
              color: 'var(--muted)',
              marginBottom: '0.75rem',
              minHeight: '18px',
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
              marginBottom: '1rem',
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={22}
                  placeholder="type the number…"
                  autoComplete="off"
                  value={userInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setUserInput(val);
                      setInputError(false);
                      if (feedback && feedbackType === 'bad' && feedback.includes('only numbers')) {
                        setFeedback('');
                        setFeedbackType('');
                      }
                    } else {
                      setInputError(true);
                      setFeedback('⚠️ Only numbers allowed');
                      setFeedbackType('bad');
                    }
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') checkAnswer(); }}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '24px',
                    fontFamily: 'var(--mono)',
                    letterSpacing: '0.15em',
                    textAlign: 'center',
                    background: 'var(--surface)',
                    border: `2px solid ${inputError ? 'var(--red)' : 'var(--border-strong)'}`,
                    borderRadius: '12px',
                    color: 'var(--text)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="10" cy="10" r="8" fill="none" stroke="var(--surface2)" strokeWidth="2" />
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="50.27"
                        strokeDashoffset={50.27 * (1 - timeLeft / maxTime)}
                        style={{ transition: 'stroke 0.5s' }}
                      />
                    </svg>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: timeLeft <= 5 ? 'var(--red)' : 'var(--text)',
                        minWidth: '20px',
                        textAlign: 'center',
                      }}
                    >
                      {timeLeft}s
                    </span>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={checkAnswer}
                    disabled={!userInput.trim()}
                    style={{ flex: 1, padding: '16px 20px', fontSize: '16px' }}
                  >
                    Submit
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

      {/* ── GAME OVER SCREEN ── */}
      {phase === 'gameover' && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>{emoji}</div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: 'var(--green)',
              fontFamily: 'var(--mono)',
              lineHeight: 1,
            }}
          >
            {levelsCompleted}
          </div>
          <div style={{ fontSize: '15px', color: 'var(--muted)', margin: '6px 0 4px' }}>
            {levelsCompleted === 1 ? 'level completed' : 'levels completed'}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>
            Well done!
          </div>

          {/* Milestone strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0',
              marginBottom: '1.5rem',
              padding: '0 4px',
            }}
          >
            {MILESTONES.map((m, i) => {
              const reached = levelsCompleted >= m;
              const isNext = !reached && (i === 0 || levelsCompleted >= (MILESTONES[i - 1] ?? 0));
              return (
                <div
                  key={m}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: i < MILESTONES.length - 1 ? 1 : 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: isNext ? '20px' : '14px',
                        height: isNext ? '20px' : '14px',
                        borderRadius: '50%',
                        background: reached ? 'var(--green)' : isNext ? 'transparent' : 'var(--surface2)',
                        border: isNext ? '2px dashed var(--green)' : reached ? 'none' : '1px solid var(--border)',
                        boxShadow: reached ? '0 0 6px var(--green)' : 'none',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {reached && <span style={{ fontSize: '8px', color: '#000', fontWeight: 900 }}>✓</span>}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: reached ? 'var(--green)' : isNext ? 'var(--text)' : 'var(--muted)',
                        fontWeight: reached || isNext ? 600 : 400,
                        minWidth: '16px',
                        textAlign: 'center',
                      }}
                    >
                      {m}
                    </div>
                  </div>
                  {i < MILESTONES.length - 1 && (
                    <div
                      style={{
                        height: '2px',
                        flex: 1,
                        background: levelsCompleted > m ? 'var(--green)' : 'var(--surface2)',
                        marginBottom: '14px',
                        transition: 'background 0.3s',
                      }}
                    />
                  )}
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
              marginBottom: '1rem',
            }}
          >
            {tag}
          </div>

          {submitResult && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '1rem', textAlign: 'left' }}>
              <div style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 600, marginBottom: '8px' }}>
                +{submitResult.xpEarned} XP earned
                {submitResult.isPersonalBest && ' · New personal best!'}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--muted)' }}>
                <span>Level {submitResult.level}</span>
                {submitResult.streak.current > 0 && <span>🔥 {submitResult.streak.current} day streak</span>}
                {submitResult.rank !== null && <span>Rank #{submitResult.rank} today</span>}
              </div>
            </div>
          )}

          {leaderboard.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', marginBottom: '1rem', textAlign: 'left' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Today's leaderboard
              </div>
              {leaderboard.slice(0, 5).map((entry) => (
                <div key={entry.rank} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid var(--border)' }}>
                  <span>
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`} {entry.username}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{entry.score}</span>
                </div>
              ))}
            </div>
          )}

          {gameInit && gameInit.personalBest > levelsCompleted && (
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '1rem' }}>
              Personal best: {gameInit.personalBest} levels
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: '16px', letterSpacing: '0.02em' }}
              onClick={restartGame}
            >
              Play again
            </button>
          </div>
        </div>
      )}

      {/* ── QUIT MODAL ── */}
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
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Quit game?</div>
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
                className="btn btn-danger"
                style={{ width: '100%', padding: '16px', fontSize: '16px', letterSpacing: '0.02em' }}
                onClick={confirmQuit}
              >
                Yes, quit
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', padding: '16px', fontSize: '16px' }}
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
