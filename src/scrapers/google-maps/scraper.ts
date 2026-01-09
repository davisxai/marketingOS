import { chromium, type Browser, type Page } from "playwright";
import { BaseScraper, type ScraperConfig, type ScraperResult } from "../base/scraper";

export class GoogleMapsScraper extends BaseScraper {
  private browser: Browser | null = null;

  constructor() {
    super("GoogleMaps", { perMinute: 30, perHour: 500 });
  }

  async *scrape(config: ScraperConfig): AsyncGenerator<ScraperResult> {
    const { query, location, maxResults = 100 } = config;
    const searchQuery = location ? `${query} ${location}` : query;

    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--disable-blink-features=AutomationControlled"],
      });

      const context = await this.browser.newContext({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
      });

      const page = await context.newPage();

      // Navigate to Google Maps
      const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      await page.goto(mapsUrl, { waitUntil: "networkidle" });

      // Wait for results to load
      await page.waitForSelector('[role="feed"]', { timeout: 10000 });

      let resultsCount = 0;

      // Scroll to load more results
      while (resultsCount < maxResults) {
        await this.respectRateLimit();

        // Get visible business cards
        const businesses = await this.extractBusinesses(page);

        for (const business of businesses) {
          if (resultsCount >= maxResults) break;

          yield business;
          resultsCount++;
        }

        // Try to scroll for more results
        const hasMore = await this.scrollForMore(page);
        if (!hasMore) break;
      }
    } catch (error) {
      console.error("Google Maps scraper error:", error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  private async extractBusinesses(page: Page): Promise<ScraperResult[]> {
    return page.evaluate(() => {
      const results: Array<{
        company_name?: string;
        address?: string;
        phone?: string;
        company_website?: string;
        source_url?: string;
      }> = [];

      const cards = document.querySelectorAll('[role="feed"] > div');

      cards.forEach((card) => {
        const nameEl = card.querySelector(".fontHeadlineSmall");
        const name = nameEl?.textContent?.trim();

        if (!name) return;

        // Extract address
        const addressEl = card.querySelector('[data-tooltip="Address"]');
        const address = addressEl?.textContent?.trim();

        // Extract phone
        const phoneEl = card.querySelector('[data-tooltip="Phone number"]');
        const phone = phoneEl?.textContent?.trim();

        // Extract website
        const websiteEl = card.querySelector('a[data-value="Website"]');
        const website = websiteEl?.getAttribute("href");

        results.push({
          company_name: name,
          address,
          phone,
          company_website: website || undefined,
          source_url: window.location.href,
        });
      });

      return results;
    });
  }

  private async scrollForMore(page: Page): Promise<boolean> {
    const feedSelector = '[role="feed"]';

    try {
      const previousHeight = await page.evaluate((selector) => {
        const feed = document.querySelector(selector);
        return feed?.scrollHeight || 0;
      }, feedSelector);

      await page.evaluate((selector) => {
        const feed = document.querySelector(selector);
        if (feed) {
          feed.scrollTop = feed.scrollHeight;
        }
      }, feedSelector);

      // Wait for new content to load
      await this.sleep(2000);

      const newHeight = await page.evaluate((selector) => {
        const feed = document.querySelector(selector);
        return feed?.scrollHeight || 0;
      }, feedSelector);

      return newHeight > previousHeight;
    } catch {
      return false;
    }
  }

  // Parse address into components
  protected parseAddress(address: string): {
    city?: string;
    state?: string;
    country?: string;
  } {
    // Simple US address parser
    const parts = address.split(",").map((p) => p.trim());

    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})?/);

      if (stateZipMatch) {
        return {
          city: parts[parts.length - 2],
          state: stateZipMatch[1],
          country: "USA",
        };
      }
    }

    return {};
  }
}
