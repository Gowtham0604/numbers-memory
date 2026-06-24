import { reddit } from '@devvit/web/server';
import type { JsonObject } from '@devvit/web/shared';
import type { DailyChallengeConfig } from '../../shared/game';

type CreatePostOptions = {
  title?: string;
  entry?: string;
  postData?: JsonObject;
};

export const createPost = async (options: CreatePostOptions = {}) => {
  return await reddit.submitCustomPost({
    title: options.title ?? 'Number Memory — How far can you go? 🧠',
    entry: options.entry ?? 'default',
    postData: options.postData,
  });
};

export const createDailyChallengePost = async (config: DailyChallengeConfig) => {
  const postData: JsonObject = {
    type: 'daily-challenge',
    dayNumber: config.dayNumber,
    date: config.date,
    seed: config.seed,
    difficulty: config.difficulty,
  };

  return await createPost({
    title: `Daily Challenge #${config.dayNumber} 🎯 — Can you beat it?`,
    postData,
  });
};
