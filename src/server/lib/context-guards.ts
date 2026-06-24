import { context } from '@devvit/web/server';

export const requireUserId = (): string => {
  const { userId } = context;
  if (!userId) throw new Error('User must be logged in');
  return userId;
};

export const requirePostId = (): string => {
  const { postId } = context;
  if (!postId) throw new Error('Must be in a post context');
  return postId;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
};

export const parseRedisNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};
