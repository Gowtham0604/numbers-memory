export type Difficulty = 'easy' | 'medium' | 'hard';

export type DailyChallengeConfig = {
  date: string;
  dayNumber: number;
  seed: number;
  difficulty: Difficulty;
  displayTimeMultiplier: number;
  inputTimeBonus: number;
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
};

export type StreakInfo = {
  current: number;
  longest: number;
  extended: boolean;
  broken: boolean;
  freezeUsed: boolean;
};

export type LevelProgress = {
  current: number;
  required: number;
  percent: number;
};

export const WEEKLY_DIFFICULTY_PATTERN = [
  'easy',
  'medium',
  'medium',
  'hard',
  'medium',
  'easy',
  'hard',
] as const satisfies readonly Difficulty[];

export const DIFFICULTY_MODIFIERS: Record<
  Difficulty,
  { displayTimeMultiplier: number; inputTimeBonus: number }
> = {
  easy: { displayTimeMultiplier: 1.25, inputTimeBonus: 2 },
  medium: { displayTimeMultiplier: 1, inputTimeBonus: 0 },
  hard: { displayTimeMultiplier: 0.85, inputTimeBonus: -1 },
};

export const STREAK_MILESTONE_XP: Record<number, number> = {
  3: 50,
  7: 150,
  14: 400,
  30: 1000,
  100: 5000,
};

export const XP_AWARDS = {
  completeGame: 10,
  dailyChallenge: 30,
  firstGameOfDay: 15,
  personalBest: 50,
} as const;

export const MAX_SUBMIT_SCORE = 500;

export const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
};

export const generateSeededNumber = (seed: number, level: number, length: number): string => {
  const rng = createSeededRandom(seed + level * 9973);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(rng() * 10).toString();
  }
  if (result.startsWith('0') && length > 1) {
    result = '1' + result.slice(1);
  }
  return result;
};

export const getDateString = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

export const getDayNumber = (date: Date, launchDate: string): number => {
  const launch = new Date(`${launchDate}T00:00:00.000Z`);
  const diff = date.getTime() - launch.getTime();
  return Math.max(1, Math.floor(diff / 86400000) + 1);
};

export const getDifficultyForDate = (date: Date): Difficulty => {
  const dayOfWeek = date.getUTCDay();
  const adjustedIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return WEEKLY_DIFFICULTY_PATTERN[adjustedIndex] ?? 'medium';
};

export const generateDailyChallenge = (dateString: string, launchDate: string): DailyChallengeConfig => {
  const date = new Date(`${dateString}T12:00:00.000Z`);
  const seed = hashString(dateString);
  const difficulty = getDifficultyForDate(date);
  const modifiers = DIFFICULTY_MODIFIERS[difficulty];

  return {
    date: dateString,
    dayNumber: getDayNumber(date, launchDate),
    seed,
    difficulty,
    displayTimeMultiplier: modifiers.displayTimeMultiplier,
    inputTimeBonus: modifiers.inputTimeBonus,
  };
};

export const getTimeUntilExpiry = (): { hours: number; minutes: number } => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  };
};

export const isDateExpired = (dateString: string): boolean => {
  return dateString < getDateString(new Date());
};

export const xpForLevel = (level: number): number => {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 1.5));
};

export const getLevelFromXp = (xp: number): number => {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
};

export const getProgressToNextLevel = (xp: number): LevelProgress => {
  const level = getLevelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const progress = xp - currentLevelXp;
  const required = nextLevelXp - currentLevelXp;
  return {
    current: progress,
    required,
    percent: required > 0 ? Math.floor((progress / required) * 100) : 100,
  };
};

export const getWeekId = (date: Date): string => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};
