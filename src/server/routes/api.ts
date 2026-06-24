import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import {
  getDateString,
  getLevelFromXp,
  getProgressToNextLevel,
  getTimeUntilExpiry,
  getWeekId,
  isDateExpired,
  MAX_SUBMIT_SCORE,
} from '../../shared/game';
import type {
  DecrementResponse,
  GameInitResponse,
  IncrementResponse,
  InitResponse,
  LeaderboardResponse,
  SplashStatsResponse,
  SubmitScoreResponse,
} from '../../shared/api';
import { getErrorMessage, requirePostId, requireUserId } from '../lib/context-guards';
import {
  getLeaderboardEntries,
  getPlayerRank,
  getPlayerScore,
  getTodayChallenge,
  getTodayPlayerCount,
  storeUsername,
  submitLeaderboardScore,
  trackPlayerActivity,
  trackWeekPlayer,
  incrementWeekStats,
} from '../lib/leaderboard';
import {
  awardXp,
  buildProgressionSnapshot,
  calculateXpEarned,
  getBestScoreToday,
  getPersonalBest,
  getUserStreak,
  getUserXp,
  markFirstGameToday,
  updateBestScores,
  updateStreak,
} from '../lib/progression';
import { REDIS_KEYS } from '../lib/redis-keys';

const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_INTERNAL = 500;

type ErrorResponse = { status: 'error'; message: string };

export const api = new Hono();

api.get('/game/init', async (c) => {
  try {
    const postId = requirePostId();
    const userId = context.userId;
    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';

    if (userId) {
      await storeUsername(userId, username);
      await trackPlayerActivity(userId);
    }

    const today = getDateString(new Date());
    const dailyChallenge = await getTodayChallenge();
    const postData = context.postData as Record<string, unknown> | undefined;
    const isDailyChallengePost = postData?.['type'] === 'daily-challenge';
    const challengeDate = typeof postData?.['date'] === 'string' ? postData['date'] : today;
    const isExpired = isDailyChallengePost && isDateExpired(challengeDate);

    const leaderboardKey = REDIS_KEYS.leaderboardDaily(today);
    const xp = userId ? await getUserXp(userId) : 0;
    const streak = userId ? await getUserStreak(userId) : { current: 0, longest: 0, extended: false, broken: false, freezeUsed: false };
    const bestScoreToday = userId ? await getBestScoreToday(userId) : 0;
    const personalBest = userId ? await getPersonalBest(userId) : 0;
    const leaderboardPreview = await getLeaderboardEntries(leaderboardKey, 3);
    const playerCount = await getTodayPlayerCount();

    return c.json<GameInitResponse>({
      status: 'success',
      data: {
        postId,
        username,
        isDailyChallenge: isDailyChallengePost,
        isExpired,
        dailyChallenge: isDailyChallengePost ? dailyChallenge : null,
        expiresIn: getTimeUntilExpiry(),
        playerCount,
        xp,
        level: getLevelFromXp(xp),
        levelProgress: getProgressToNextLevel(xp),
        streak,
        bestScoreToday,
        personalBest,
        leaderboardPreview,
      },
    });
  } catch (error) {
    return c.json<ErrorResponse>({ status: 'error', message: getErrorMessage(error) }, HTTP_BAD_REQUEST);
  }
});

api.get('/game/splash-stats', async (c) => {
  try {
    requirePostId();
    const dailyChallenge = await getTodayChallenge();
    const playerCount = await getTodayPlayerCount();

    return c.json<SplashStatsResponse>({
      status: 'success',
      data: {
        playerCount,
        dayNumber: dailyChallenge.dayNumber,
        difficulty: dailyChallenge.difficulty,
        expiresIn: getTimeUntilExpiry(),
      },
    });
  } catch (error) {
    return c.json<ErrorResponse>({ status: 'error', message: getErrorMessage(error) }, HTTP_BAD_REQUEST);
  }
});

api.post('/game/submit-score', async (c) => {
  try {
    const userId = requireUserId();
    requirePostId();

    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return c.json<ErrorResponse>({ status: 'error', message: 'Invalid request body' }, HTTP_BAD_REQUEST);
    }

    const rawScore = (body as Record<string, unknown>)['score'];
    if (typeof rawScore !== 'number' || !Number.isInteger(rawScore) || rawScore < 0 || rawScore > MAX_SUBMIT_SCORE) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Invalid score' }, HTTP_BAD_REQUEST);
    }

    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
    await storeUsername(userId, username);
    await trackPlayerActivity(userId);

    const today = getDateString(new Date());
    const weekId = getWeekId(new Date());
    const postData = context.postData as Record<string, unknown> | undefined;
    const isDailyChallenge = postData?.['type'] === 'daily-challenge';

    const dailyKey = REDIS_KEYS.leaderboardDaily(today);
    const alltimeKey = REDIS_KEYS.leaderboardAlltime;

    await submitLeaderboardScore(dailyKey, userId, rawScore);
    await submitLeaderboardScore(alltimeKey, userId, rawScore);

    const { isNewBest, isPersonalBest } = await updateBestScores(userId, rawScore);
    const streak = await updateStreak(userId);
    const xpEarned = await calculateXpEarned(userId, rawScore, isDailyChallenge, isPersonalBest, streak);
    const totalXp = await awardXp(userId, xpEarned);
    await markFirstGameToday(userId);
    await incrementWeekStats(weekId);
    await trackWeekPlayer(weekId, userId);

    const rank = await getPlayerRank(dailyKey, userId);
    const progression = buildProgressionSnapshot(totalXp, streak);

    return c.json<SubmitScoreResponse>({
      status: 'success',
      data: {
        score: rawScore,
        isNewBest,
        isPersonalBest,
        xpEarned,
        totalXp: progression.xp,
        level: progression.level,
        levelProgress: progression.levelProgress,
        streak: progression.streak,
        rank,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes('logged in') ? HTTP_FORBIDDEN : HTTP_INTERNAL;
    return c.json<ErrorResponse>({ status: 'error', message }, status);
  }
});

api.get('/leaderboard', async (c) => {
  try {
    requirePostId();
    const userId = context.userId;
    const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10), 100);
    const today = getDateString(new Date());
    const key = REDIS_KEYS.leaderboardDaily(today);

    const entries = await getLeaderboardEntries(key, limit);
    const playerRank = userId ? await getPlayerRank(key, userId) : null;
    const playerScore = userId ? await getPlayerScore(key, userId) : null;
    const playerCount = await getTodayPlayerCount();

    const midnight = new Date();
    midnight.setUTCHours(24, 0, 0, 0);

    return c.json<LeaderboardResponse>({
      status: 'success',
      data: {
        entries,
        playerRank,
        playerScore,
        type: 'daily',
        resetsAt: midnight.toISOString(),
        playerCount,
      },
    });
  } catch (error) {
    return c.json<ErrorResponse>({ status: 'error', message: getErrorMessage(error) }, HTTP_BAD_REQUEST);
  }
});

api.get('/init', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, HTTP_BAD_REQUEST);
  }
  const [count, username] = await Promise.all([redis.get('count'), reddit.getCurrentUsername()]);
  return c.json<InitResponse>({
    type: 'init',
    postId,
    count: count ? parseInt(count, 10) : 0,
    username: username ?? 'anonymous',
  });
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, HTTP_BAD_REQUEST);
  }
  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({ type: 'increment', postId, count });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, HTTP_BAD_REQUEST);
  }
  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({ type: 'decrement', postId, count });
});
