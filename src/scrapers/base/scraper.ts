import type { Lead } from "@/types";

export interface ScraperConfig {
  query: string;
  location?: string;
  maxResults?: number;
  filters?: Record<string, unknown>;
}

export interface ScraperResult {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_name?: string;
  company_website?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  source_url?: string;
  raw_data?: Record<string, unknown>;
}

export abstract class BaseScraper {
  protected name: string;
  protected requestsPerMinute: number;
  protected requestsPerHour: number;
  protected lastRequestTime: number = 0;

  constructor(
    name: string,
    rateLimit: { perMinute: number; perHour: number }
  ) {
    this.name = name;
    this.requestsPerMinute = rateLimit.perMinute;
    this.requestsPerHour = rateLimit.perHour;
  }

  abstract scrape(config: ScraperConfig): AsyncGenerator<ScraperResult>;

  protected async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const minDelay = (60 * 1000) / this.requestsPerMinute;
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(
          `${this.name}: Attempt ${attempt + 1} failed, retrying in ${delay}ms...`
        );
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  protected transformToLead(
    result: ScraperResult,
    source: string
  ): Partial<Lead> {
    return {
      email: result.email || "",
      first_name: result.first_name || null,
      last_name: result.last_name || null,
      phone: result.phone || null,
      company_name: result.company_name || null,
      company_website: result.company_website || null,
      industry: result.industry || null,
      city: result.city || null,
      state: result.state || null,
      country: result.country || "USA",
      address: result.address || null,
      source: source as Lead["source"],
      source_url: result.source_url || null,
      status: "new",
      email_verified: false,
    };
  }

  protected extractEmailFromText(text: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    return matches ? matches[0] : null;
  }

  protected extractPhoneFromText(text: string): string | null {
    // US phone number patterns
    const phoneRegex =
      /(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
    const matches = text.match(phoneRegex);
    return matches ? matches[0] : null;
  }

  protected cleanText(text: string): string {
    return text.replace(/\s+/g, " ").trim();
  }
}
