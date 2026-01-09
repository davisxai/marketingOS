import { Client } from "@upstash/qstash";

// QStash client for serverless job queuing
export const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Base URL for your app (QStash will call these endpoints)
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Fallback for local dev (use ngrok or similar for testing)
  return "http://localhost:3000";
};

// Queue types
export type QueueName = "email-send" | "email-verify" | "scraper-job";

// Job payloads
export interface EmailSendJob {
  campaignLeadId: string;
  campaignId: string;
  leadId: string;
  to: string;
  from: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailVerifyJob {
  leadId: string;
  email: string;
}

export interface ScraperJob {
  jobId: string;
  scraperType: string;
  query: string;
  location?: string;
  maxResults?: number;
}

// Queue an email to be sent
export async function queueEmailSend(
  job: EmailSendJob,
  options?: { delay?: number; scheduleAt?: Date }
) {
  const url = `${getBaseUrl()}/api/jobs/email-send`;

  const publishOptions: Parameters<typeof qstash.publishJSON>[0] = {
    url,
    body: job,
    retries: 3,
  };

  // Add delay if specified (in seconds)
  if (options?.delay) {
    publishOptions.delay = options.delay;
  }

  // Schedule for specific time
  if (options?.scheduleAt) {
    publishOptions.notBefore = Math.floor(options.scheduleAt.getTime() / 1000);
  }

  return qstash.publishJSON(publishOptions);
}

// Queue email verification
export async function queueEmailVerify(
  job: EmailVerifyJob,
  options?: { delay?: number }
) {
  const url = `${getBaseUrl()}/api/jobs/email-verify`;

  return qstash.publishJSON({
    url,
    body: job,
    retries: 2,
    delay: options?.delay,
  });
}

// Queue scraper job
export async function queueScraperJob(job: ScraperJob) {
  const url = `${getBaseUrl()}/api/jobs/scraper`;

  return qstash.publishJSON({
    url,
    body: job,
    retries: 2,
  });
}

// Batch queue multiple emails with delays
export async function queueEmailBatch(
  jobs: EmailSendJob[],
  options: {
    delayBetween: number; // seconds between each email
    startDelay?: number; // initial delay before first email
  }
) {
  const { delayBetween, startDelay = 0 } = options;

  const messages = jobs.map((job, index) => ({
    destination: `${getBaseUrl()}/api/jobs/email-send`,
    body: JSON.stringify(job),
    delay: startDelay + index * delayBetween,
  }));

  // QStash batch endpoint (up to 100 messages per batch)
  const batches = chunk(messages, 100);

  for (const batch of batches) {
    await qstash.batchJSON(batch);
  }
}

// Schedule daily campaign processing
export async function scheduleDailyCampaignProcess(campaignId: string) {
  const url = `${getBaseUrl()}/api/jobs/campaign-process`;

  // Create a schedule that runs daily at 9 AM UTC
  return qstash.schedules.create({
    destination: url,
    body: JSON.stringify({ campaignId }),
    cron: "0 9 * * 1-5", // Monday-Friday at 9 AM UTC
  });
}

// Helper to chunk array
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Verify QStash webhook signature
export function verifySignature(signature: string): boolean {
  // QStash provides a receiver for signature verification
  // In production, use the Receiver class from @upstash/qstash
  // For now, return true in development
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // TODO: Implement proper signature verification
  return !!signature;
}
