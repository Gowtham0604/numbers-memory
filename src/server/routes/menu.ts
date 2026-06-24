import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, reddit, redis } from '@devvit/web/server';
import { createPost } from '../core/post';
import { getTodayChallenge, storeDailyChallenge } from '../lib/leaderboard';
import { REDIS_KEYS } from '../lib/redis-keys';
import { getDateString } from '../../shared/game';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/daily-challenge-create', async (c) => {
  try {
    const today = getDateString(new Date());
    const challengeConfig = await getTodayChallenge();
    await storeDailyChallenge(challengeConfig);

    const post = await createPost({
      title: `Daily Challenge #${challengeConfig.dayNumber} 🎯 — Can you beat it?`,
      postData: {
        type: 'daily-challenge',
        dayNumber: challengeConfig.dayNumber,
        date: today,
        seed: challengeConfig.seed,
        difficulty: challengeConfig.difficulty,
      },
    });

    await redis.set(REDIS_KEYS.dailyPost(today), post.id);
    await redis.set(REDIS_KEYS.dailyLatest, post.id);

    const scoreComment = await reddit.submitComment({
      id: post.id,
      text: '📊 **Share your score below!**\n\nReply to this comment with your result.',
    });
    await redis.set(REDIS_KEYS.postScoreThread(post.id), scoreComment.id);

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating daily challenge: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create daily challenge' }, 400);
  }
});

menu.post('/example-form', async (c) => {
  return c.json<UiResponse>({
    showForm: {
      name: 'exampleForm',
      form: {
        fields: [{ type: 'string', name: 'message', label: 'Message' }],
      },
      data: { message: 'Hello from Number Memory!' },
    },
  });
});
