import { BaseScraper, type ScraperConfig, type ScraperResult } from "../base/scraper";

interface SerpAPIOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  displayed_link?: string;
  snippet?: string;
  snippet_highlighted_words?: string[];
  sitelinks?: {
    inline?: Array<{ title: string; link: string }>;
    expanded?: Array<{ title: string; link: string; snippet: string }>;
  };
  rich_snippet?: {
    top?: Record<string, unknown>;
    bottom?: Record<string, unknown>;
  };
  about_page_link?: string;
  cached_page_link?: string;
  related_pages_link?: string;
}

interface SerpAPISearchResponse {
  search_metadata?: {
    id: string;
    status: string;
    created_at: string;
  };
  search_parameters?: Record<string, string>;
  organic_results?: SerpAPIOrganicResult[];
  local_results?: {
    places?: Array<{
      title: string;
      address: string;
      phone?: string;
      website?: string;
      rating?: number;
      reviews?: number;
      type?: string;
    }>;
  };
  error?: string;
}

export class SerpAPIGoogleSearchScraper extends BaseScraper {
  private apiKey: string;

  constructor() {
    super("SerpAPI-GoogleSearch", { perMinute: 30, perHour: 500 });
    this.apiKey = process.env.SERPAPI_API_KEY || "";
  }

  async *scrape(config: ScraperConfig): AsyncGenerator<ScraperResult> {
    if (!this.apiKey) {
      throw new Error("SERPAPI_API_KEY environment variable is not set");
    }

    const { query, location, maxResults = 50 } = config;

    // Modify query to find business contact pages
    const searchQuery = `${query} contact email`;

    let start = 0;
    const resultsPerPage = 10;
    let totalResults = 0;

    while (totalResults < maxResults) {
      await this.respectRateLimit();

      try {
        const params = new URLSearchParams({
          engine: "google",
          q: searchQuery,
          api_key: this.apiKey,
          start: start.toString(),
          num: resultsPerPage.toString(),
        });

        if (location) {
          params.set("location", location);
        }

        const response = await this.withRetry(async () => {
          const res = await fetch(`https://serpapi.com/search?${params}`);
          if (!res.ok) {
            throw new Error(`SerpAPI error: ${res.status}`);
          }
          return res.json() as Promise<SerpAPISearchResponse>;
        });

        if (response.error) {
          throw new Error(`SerpAPI error: ${response.error}`);
        }

        // Process organic results
        const organicResults = response.organic_results || [];
        for (const result of organicResults) {
          if (totalResults >= maxResults) break;

          const scraperResult = this.transformOrganicResult(result);
          if (scraperResult.email || scraperResult.company_website) {
            yield scraperResult;
            totalResults++;
          }
        }

        // Process local results if present
        const localPlaces = response.local_results?.places || [];
        for (const place of localPlaces) {
          if (totalResults >= maxResults) break;

          const scraperResult: ScraperResult = {
            company_name: place.title,
            phone: place.phone,
            company_website: place.website,
            address: place.address,
            industry: place.type,
            raw_data: {
              rating: place.rating,
              reviews: place.reviews,
            },
          };
          yield scraperResult;
          totalResults++;
        }

        if (organicResults.length < resultsPerPage) {
          break;
        }

        start += resultsPerPage;
      } catch (error) {
        console.error("SerpAPI Google Search scraper error:", error);
        throw error;
      }
    }
  }

  private transformOrganicResult(result: SerpAPIOrganicResult): ScraperResult {
    // Try to extract email from snippet
    const email = this.extractEmailFromText(result.snippet || "");

    // Try to extract phone from snippet
    const phone = this.extractPhoneFromText(result.snippet || "");

    // Extract company name from title
    const companyName = this.extractCompanyName(result.title || "");

    return {
      email: email || undefined,
      phone: phone || undefined,
      company_name: companyName,
      company_website: result.link,
      source_url: result.link,
      raw_data: {
        title: result.title,
        snippet: result.snippet,
        position: result.position,
      },
    };
  }

  private extractCompanyName(title: string): string {
    // Remove common suffixes like "| Contact Us", "- Home", etc.
    return title
      .replace(/\s*[-|]\s*(Contact|Home|About|Email|Phone|Call).*/i, "")
      .trim();
  }
}
