import type {
  GameInitResponse,
  LeaderboardResponse,
  SplashStatsResponse,
  SubmitScoreResponse,
} from '../../shared/api';

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  return (await response.json()) as T;
};

export const fetchGameInit = (): Promise<GameInitResponse> =>
  fetchJson<GameInitResponse>('/api/game/init');

export const fetchSplashStats = (): Promise<SplashStatsResponse> =>
  fetchJson<SplashStatsResponse>('/api/game/splash-stats');

export const submitGameScore = (score: number): Promise<SubmitScoreResponse> =>
  fetchJson<SubmitScoreResponse>('/api/game/submit-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score }),
  });

export const fetchLeaderboard = (limit = 10): Promise<LeaderboardResponse> =>
  fetchJson<LeaderboardResponse>(`/api/leaderboard?limit=${limit}`);
