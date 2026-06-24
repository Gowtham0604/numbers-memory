import type {
  DailyChallengeConfig,
  LeaderboardEntry,
  LevelProgress,
  StreakInfo,
} from './game';

export type ApiSuccess<T> = {
  status: 'success';
  data: T;
};

export type ApiError = {
  status: 'error';
  message: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type GameInitData = {
  postId: string;
  username: string;
  isDailyChallenge: boolean;
  isExpired: boolean;
  dailyChallenge: DailyChallengeConfig | null;
  expiresIn: { hours: number; minutes: number };
  playerCount: number;
  xp: number;
  level: number;
  levelProgress: LevelProgress;
  streak: StreakInfo;
  bestScoreToday: number;
  personalBest: number;
  leaderboardPreview: LeaderboardEntry[];
};

export type GameInitResponse = ApiResponse<GameInitData>;

export type SubmitScoreData = {
  score: number;
  isNewBest: boolean;
  isPersonalBest: boolean;
  xpEarned: number;
  totalXp: number;
  level: number;
  levelProgress: LevelProgress;
  streak: StreakInfo;
  rank: number | null;
};

export type SubmitScoreResponse = ApiResponse<SubmitScoreData>;

export type LeaderboardData = {
  entries: LeaderboardEntry[];
  playerRank: number | null;
  playerScore: number | null;
  type: 'daily';
  resetsAt: string;
  playerCount: number;
};

export type LeaderboardResponse = ApiResponse<LeaderboardData>;

export type SplashStatsData = {
  playerCount: number;
  dayNumber: number;
  difficulty: string;
  expiresIn: { hours: number; minutes: number };
};

export type SplashStatsResponse = ApiResponse<SplashStatsData>;

export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};
