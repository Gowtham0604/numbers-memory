import { redis } from '@devvit/web/server';
import {
  generateDailyChallenge,
  getDateString,
  type LeaderboardEntry,
} from '../../shared/game';
import { GAME_LAUNCH_DATE, REDIS_KEYS } from './redis-keys';
import { parseRedisNumber } from './context-guards';

export const getLaunchDate = async (): Promise<string> => {
  const stored = await redis.get(REDIS_KEYS.launchDate);
  if (stored) return stored;
  await redis.set(REDIS_KEYS.launchDate, GAME_LAUNCH_DATE);
  return GAME_LAUNCH_DATE;
};

export const getTodayChallenge = async (): Promise<ReturnType<typeof generateDailyChallenge>> => {
  const today = getDateString(new Date());
  const cached = await redis.hGetAll(REDIS_KEYS.dailyChallenge(today));

  if (cached['seed']) {
    return {
      date: cached['date'] ?? today,
      dayNumber: parseRedisNumber(cached['dayNumber'], 1),
      seed: parseRedisNumber(cached['seed'], 0),
      difficulty: (cached['difficulty'] as 'easy' | 'medium' | 'hard') ?? 'medium',
      displayTimeMultiplier: parseFloat(cached['displayTimeMultiplier'] ?? '1'),
      inputTimeBonus: parseRedisNumber(cached['inputTimeBonus'], 0),
    };
  }

  const launchDate = await getLaunchDate();
  const config = generateDailyChallenge(today, launchDate);
  await redis.hSet(REDIS_KEYS.dailyChallenge(today), {
    date: config.date,
    dayNumber: String(config.dayNumber),
    seed: String(config.seed),
    difficulty: config.difficulty,
    displayTimeMultiplier: String(config.displayTimeMultiplier),
    inputTimeBonus: String(config.inputTimeBonus),
  });

  return config;
};

export const storeDailyChallenge = async (
  config: ReturnType<typeof generateDailyChallenge>
): Promise<void> => {
  await redis.hSet(REDIS_KEYS.dailyChallenge(config.date), {
    date: config.date,
    dayNumber: String(config.dayNumber),
    seed: String(config.seed),
    difficulty: config.difficulty,
    displayTimeMultiplier: String(config.displayTimeMultiplier),
    inputTimeBonus: String(config.inputTimeBonus),
  });
};

export const submitLeaderboardScore = async (
  key: string,
  userId: string,
  score: number
): Promise<boolean> => {
  const current = await redis.zScore(key, userId);
  if (current !== undefined && score <= current) return false;
  await redis.zAdd(key, { member: userId, score });
  return true;
};

export const getLeaderboardEntries = async (
  key: string,
  limit: number
): Promise<LeaderboardEntry[]> => {
  const rows = await redis.zRange(key, 0, limit - 1, { by: 'rank', reverse: true });
  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const username = (await redis.get(REDIS_KEYS.userUsername(row.member))) ?? 'Anonymous';
    entries.push({ rank: i + 1, username, score: row.score });
  }

  return entries;
};

export const getPlayerRank = async (key: string, userId: string): Promise<number | null> => {
  const playerScore = await redis.zScore(key, userId);
  if (playerScore === undefined) return null;

  const all = await redis.zRange(key, 0, -1, { by: 'rank', reverse: true });
  const index = all.findIndex((entry) => entry.member === userId);
  return index >= 0 ? index + 1 : null;
};

export const getPlayerScore = async (key: string, userId: string): Promise<number | null> => {
  const score = await redis.zScore(key, userId);
  return score ?? null;
};

export const trackPlayerActivity = async (userId: string): Promise<void> => {
  const today = getDateString(new Date());
  await redis.zAdd(REDIS_KEYS.dailyPlayers(today), { member: userId, score: Date.now() });
};

export const getTodayPlayerCount = async (): Promise<number> => {
  const today = getDateString(new Date());
  return await redis.zCard(REDIS_KEYS.dailyPlayers(today));
};

export const storeUsername = async (userId: string, username: string): Promise<void> => {
  await redis.set(REDIS_KEYS.userUsername(userId), username);
};

export const incrementWeekStats = async (weekId: string): Promise<void> => {
  await redis.incrBy(REDIS_KEYS.statsWeekGames(weekId), 1);
};

export const trackWeekPlayer = async (weekId: string, userId: string): Promise<void> => {
  await redis.zAdd(`stats:week:${weekId}:playerSet`, { member: userId, score: Date.now() });
  const count = await redis.zCard(`stats:week:${weekId}:playerSet`);
  await redis.set(REDIS_KEYS.statsWeekPlayers(weekId), String(count));
};
