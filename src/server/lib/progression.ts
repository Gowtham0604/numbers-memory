import { redis } from '@devvit/web/server';
import {
  getDateString,
  getLevelFromXp,
  getProgressToNextLevel,
  STREAK_MILESTONE_XP,
  XP_AWARDS,
  type StreakInfo,
} from '../../shared/game';
import { parseRedisNumber } from './context-guards';
import { REDIS_KEYS } from './redis-keys';

const getYesterdayDate = (): string => {
  return getDateString(new Date(Date.now() - 86400000));
};

export const getUserXp = async (userId: string): Promise<number> => {
  return parseRedisNumber(await redis.get(REDIS_KEYS.userXp(userId)), 0);
};

export const getUserStreak = async (userId: string): Promise<StreakInfo> => {
  const data = await redis.hGetAll(REDIS_KEYS.userStreak(userId));
  return {
    current: parseRedisNumber(data['current'], 0),
    longest: parseRedisNumber(data['longest'], 0),
    extended: false,
    broken: false,
    freezeUsed: false,
  };
};

export const updateStreak = async (userId: string): Promise<StreakInfo> => {
  const today = getDateString(new Date());
  const streakData = await redis.hGetAll(REDIS_KEYS.userStreak(userId));
  const lastPlayed = streakData['lastPlayedDate'];
  const current = parseRedisNumber(streakData['current'], 0);
  const longest = parseRedisNumber(streakData['longest'], 0);

  if (lastPlayed === today) {
    return { current, longest, extended: false, broken: false, freezeUsed: false };
  }

  const yesterday = getYesterdayDate();

  if (lastPlayed === yesterday) {
    const newStreak = current + 1;
    await redis.hSet(REDIS_KEYS.userStreak(userId), {
      current: String(newStreak),
      lastPlayedDate: today,
      longest: String(Math.max(newStreak, longest)),
    });
    return { current: newStreak, longest: Math.max(newStreak, longest), extended: true, broken: false, freezeUsed: false };
  }

  const freezes = parseRedisNumber(streakData['freezesAvailable'], 0);
  if (freezes > 0) {
    await redis.hSet(REDIS_KEYS.userStreak(userId), {
      freezesAvailable: String(freezes - 1),
      freezesUsed: String(parseRedisNumber(streakData['freezesUsed'], 0) + 1),
      lastPlayedDate: today,
    });
    return { current, longest, extended: false, broken: false, freezeUsed: true };
  }

  await redis.hSet(REDIS_KEYS.userStreak(userId), {
    current: '1',
    lastPlayedDate: today,
    longest: String(longest),
  });
  return { current: 1, longest, extended: false, broken: current > 0, freezeUsed: false };
};

export const awardXp = async (userId: string, amount: number): Promise<number> => {
  return await redis.incrBy(REDIS_KEYS.userXp(userId), amount);
};

export const getBestScoreToday = async (userId: string): Promise<number> => {
  const today = getDateString(new Date());
  return parseRedisNumber(await redis.get(REDIS_KEYS.userBestToday(userId, today)), 0);
};

export const getPersonalBest = async (userId: string): Promise<number> => {
  return parseRedisNumber(await redis.get(REDIS_KEYS.userPersonalBest(userId)), 0);
};

export const isFirstGameToday = async (userId: string): Promise<boolean> => {
  const today = getDateString(new Date());
  const flag = await redis.get(REDIS_KEYS.userFirstGameToday(userId, today));
  return flag === undefined;
};

export const markFirstGameToday = async (userId: string): Promise<void> => {
  const today = getDateString(new Date());
  await redis.set(REDIS_KEYS.userFirstGameToday(userId, today), '1');
};

export const updateBestScores = async (
  userId: string,
  score: number
): Promise<{ isNewBest: boolean; isPersonalBest: boolean }> => {
  const today = getDateString(new Date());
  const bestToday = await getBestScoreToday(userId);
  const personalBest = await getPersonalBest(userId);
  let isNewBest = false;
  let isPersonalBest = false;

  if (score > bestToday) {
    await redis.set(REDIS_KEYS.userBestToday(userId, today), String(score));
    isNewBest = true;
  }

  if (score > personalBest) {
    await redis.set(REDIS_KEYS.userPersonalBest(userId), String(score));
    isPersonalBest = true;
  }

  return { isNewBest, isPersonalBest };
};

export const calculateXpEarned = async (
  userId: string,
  score: number,
  isDailyChallenge: boolean,
  isPersonalBest: boolean,
  streak: StreakInfo
): Promise<number> => {
  let xp = XP_AWARDS.completeGame;

  if (isDailyChallenge) xp += XP_AWARDS.dailyChallenge;
  if (isPersonalBest) xp += XP_AWARDS.personalBest;
  if (await isFirstGameToday(userId)) xp += XP_AWARDS.firstGameOfDay;

  const milestoneXp = STREAK_MILESTONE_XP[streak.current];
  if (streak.extended && milestoneXp !== undefined) {
    xp += milestoneXp;
  }

  if (score >= 10) xp += 10;
  if (score >= 15) xp += 15;

  return xp;
};

export const buildProgressionSnapshot = (totalXp: number, streak: StreakInfo) => ({
  xp: totalXp,
  level: getLevelFromXp(totalXp),
  levelProgress: getProgressToNextLevel(totalXp),
  streak,
});
