import { Redis } from "@upstash/redis";

// Upstash Redis client for serverless environments
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiter keys
export const RATE_LIMIT_KEYS = {
  emailDaily: "email:daily:count",
  emailHourly: "email:hourly:count",
  scraperDaily: (type: string) => `scraper:${type}:daily`,
  scraperHourly: (type: string) => `scraper:${type}:hourly`,
};

// Email rate limiter
export async function canSendEmail(dailyLimit: number): Promise<boolean> {
  const [daily, hourly] = await Promise.all([
    redis.get<number>(RATE_LIMIT_KEYS.emailDaily),
    redis.get<number>(RATE_LIMIT_KEYS.emailHourly),
  ]);

  const hourlyLimit = Math.ceil(dailyLimit / 8); // 8-hour send window

  return (daily || 0) < dailyLimit && (hourly || 0) < hourlyLimit;
}

// Increment email counters
export async function incrementEmailCount(): Promise<void> {
  const pipeline = redis.pipeline();

  pipeline.incr(RATE_LIMIT_KEYS.emailDaily);
  pipeline.expire(RATE_LIMIT_KEYS.emailDaily, 86400); // 24 hours

  pipeline.incr(RATE_LIMIT_KEYS.emailHourly);
  pipeline.expire(RATE_LIMIT_KEYS.emailHourly, 3600); // 1 hour

  await pipeline.exec();
}

// Get current email counts
export async function getEmailCounts(): Promise<{
  daily: number;
  hourly: number;
}> {
  const [daily, hourly] = await Promise.all([
    redis.get<number>(RATE_LIMIT_KEYS.emailDaily),
    redis.get<number>(RATE_LIMIT_KEYS.emailHourly),
  ]);

  return {
    daily: daily || 0,
    hourly: hourly || 0,
  };
}

// Scraper rate limiter
export async function canRunScraper(
  type: string,
  dailyLimit: number,
  hourlyLimit: number
): Promise<boolean> {
  const [daily, hourly] = await Promise.all([
    redis.get<number>(RATE_LIMIT_KEYS.scraperDaily(type)),
    redis.get<number>(RATE_LIMIT_KEYS.scraperHourly(type)),
  ]);

  return (daily || 0) < dailyLimit && (hourly || 0) < hourlyLimit;
}

// Increment scraper counters
export async function incrementScraperCount(type: string): Promise<void> {
  const pipeline = redis.pipeline();

  pipeline.incr(RATE_LIMIT_KEYS.scraperDaily(type));
  pipeline.expire(RATE_LIMIT_KEYS.scraperDaily(type), 86400);

  pipeline.incr(RATE_LIMIT_KEYS.scraperHourly(type));
  pipeline.expire(RATE_LIMIT_KEYS.scraperHourly(type), 3600);

  await pipeline.exec();
}
