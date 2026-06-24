import { context, reddit, redis } from '@devvit/web/server';
import type { JsonObject } from '@devvit/web/shared';
import { Hono } from 'hono';
import {
  generateDailyChallenge,
  getDateString,
  getWeekId,
} from '../../shared/game';
import { getErrorMessage } from '../lib/context-guards';
import { getLaunchDate, storeDailyChallenge } from '../lib/leaderboard';
import { REDIS_KEYS } from '../lib/redis-keys';

type CronResponse = { status: 'ok' } | { status: 'error'; message: string };

export const cron = new Hono();

cron.post('/daily-challenge', async (c) => {
  try {
    await c.req.json();
    const today = getDateString(new Date());
    const launchDate = await getLaunchDate();
    const challengeConfig = generateDailyChallenge(today, launchDate);

    await storeDailyChallenge(challengeConfig);

    const postData: JsonObject = {
      type: 'daily-challenge',
      dayNumber: challengeConfig.dayNumber,
      date: today,
      seed: challengeConfig.seed,
      difficulty: challengeConfig.difficulty,
    };

    const post = await reddit.submitCustomPost({
      subredditName: context.subredditName!,
      title: `Daily Challenge #${challengeConfig.dayNumber} 🎯 — Can you beat it?`,
      entry: 'default',
      postData,
    });

    await redis.set(REDIS_KEYS.dailyPost(today), post.id);
    await redis.set(REDIS_KEYS.dailyLatest, post.id);

    const scoreComment = await reddit.submitComment({
      id: post.id,
      text: '📊 **Share your score below!**\n\nReply to this comment with your result.',
    });
    await redis.set(REDIS_KEYS.postScoreThread(post.id), scoreComment.id);

    return c.json<CronResponse>({ status: 'ok' });
  } catch (error) {
    console.error('Daily challenge cron failed:', error);
    return c.json<CronResponse>({ status: 'error', message: getErrorMessage(error) }, 500);
  }
});

cron.post('/weekly-recap', async (c) => {
  try {
    await c.req.json();
    const weekId = getWeekId(new Date());

    const totalPlayers = (await redis.get(REDIS_KEYS.statsWeekPlayers(weekId))) ?? '0';
    const totalGames = (await redis.get(REDIS_KEYS.statsWeekGames(weekId))) ?? '0';

    const title = `📊 Week ${weekId} Recap — ${totalPlayers} players, ${totalGames} games!`;

    await reddit.submitCustomPost({
      subredditName: context.subredditName!,
      title,
      entry: 'default',
      postData: {
        type: 'weekly-recap',
        weekId,
        stats: { totalPlayers, totalGames },
      } as JsonObject,
    });

    return c.json<CronResponse>({ status: 'ok' });
  } catch (error) {
    console.error('Weekly recap cron failed:', error);
    return c.json<CronResponse>({ status: 'error', message: getErrorMessage(error) }, 500);
  }
});
