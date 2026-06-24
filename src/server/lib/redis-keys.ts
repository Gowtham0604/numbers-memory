export const GAME_LAUNCH_DATE = '2025-06-01';

export const REDIS_KEYS = {
  launchDate: 'stats:launchDate',
  dailyPost: (date: string) => `daily:${date}:postId`,
  dailyLatest: 'daily:latest',
  dailyPlayers: (date: string) => `daily:${date}:players`,
  dailyChallenge: (date: string) => `daily:${date}:config`,
  leaderboardDaily: (date: string) => `leaderboard:daily:${date}`,
  leaderboardAlltime: 'leaderboard:alltime',
  userXp: (userId: string) => `user:${userId}:xp`,
  userStreak: (userId: string) => `user:${userId}:streak`,
  userUsername: (userId: string) => `user:${userId}:username`,
  userBestToday: (userId: string, date: string) => `user:${userId}:best:${date}`,
  userPersonalBest: (userId: string) => `user:${userId}:personalBest`,
  userFirstGameToday: (userId: string, date: string) => `user:${userId}:firstGame:${date}`,
  postScoreThread: (postId: string) => `post:${postId}:scoreThread`,
  statsWeekPlayers: (weekId: string) => `stats:week:${weekId}:uniquePlayers`,
  statsWeekGames: (weekId: string) => `stats:week:${weekId}:totalGames`,
} as const;
