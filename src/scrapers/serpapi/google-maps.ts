import { BaseScraper, type ScraperConfig, type ScraperResult } from "../base/scraper";

interface SerpAPIMapResult {
  title?: string;
  place_id?: string;
  data_id?: string;
  data_cid?: string;
  reviews_link?: string;
  photos_link?: string;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
  };
  place_id_search?: string;
  provider_id?: string;
  rating?: number;
  reviews?: number;
  price?: string;
  type?: string;
  types?: string[];
  address?: string;
  open_state?: string;
  hours?: string;
  operating_hours?: Record<string, string>;
  phone?: string;
  website?: string;
  description?: string;
  service_options?: Record<string, boolean>;
  thumbnail?: string;
}

interface SerpAPIResponse {
  search_metadata?: {
    id: string;
    status: string;
    created_at: string;
    processed_at: string;
    total_time_taken: number;
  };
  search_parameters?: Record<string, string>;
  local_results?: SerpAPIMapResult[];
  error?: string;
}

export class SerpAPIGoogleMapsScraper extends BaseScraper {
  private apiKey: string;

  constructor() {
    super("SerpAPI-GoogleMaps", { perMinute: 30, perHour: 500 });
    this.apiKey = process.env.SERPAPI_API_KEY || "";
  }

  async *scrape(config: ScraperConfig): AsyncGenerator<ScraperResult> {
    if (!this.apiKey) {
      throw new Error("SERPAPI_API_KEY environment variable is not set");
    }

    const { query, location, maxResults = 100 } = config;

    let start = 0;
    const resultsPerPage = 20;
    let totalResults = 0;

    while (totalResults < maxResults) {
      await this.respectRateLimit();

      try {
        const params = new URLSearchParams({
          engine: "google_maps",
          q: query,
          type: "search",
          api_key: this.apiKey,
          start: start.toString(),
        });

        if (location) {
          params.set("ll", `@${location},14z`);
        }

        const response = await this.withRetry(async () => {
          const res = await fetch(`https://serpapi.com/search?${params}`);
          if (!res.ok) {
            throw new Error(`SerpAPI error: ${res.status}`);
          }
          return res.json() as Promise<SerpAPIResponse>;
        });

        if (response.error) {
          throw new Error(`SerpAPI error: ${response.error}`);
        }

        const results = response.local_results || [];

        if (results.length === 0) {
          break; // No more results
        }

        for (const result of results) {
          if (totalResults >= maxResults) break;

          const scraperResult = this.transformResult(result);
          yield scraperResult;
          totalResults++;
        }

        if (results.length < resultsPerPage) {
          break; // Less than full page means no more results
        }

        start += resultsPerPage;
      } catch (error) {
        console.error("SerpAPI Google Maps scraper error:", error);
        throw error;
      }
    }
  }

  private transformResult(result: SerpAPIMapResult): ScraperResult {
    // Parse address to extract city/state
    const addressParts = this.parseAddress(result.address || "");

    return {
      company_name: result.title,
      phone: result.phone,
      company_website: result.website,
      address: result.address,
      city: addressParts.city,
      state: addressParts.state,
      country: addressParts.country || "USA",
      industry: result.type || (result.types ? result.types[0] : undefined),
      source_url: `https://www.google.com/maps/place/?q=place_id:${result.place_id}`,
      raw_data: {
        rating: result.rating,
        reviews: result.reviews,
        hours: result.operating_hours,
        place_id: result.place_id,
        gps_coordinates: result.gps_coordinates,
      },
    };
  }

  private parseAddress(address: string): {
    city?: string;
    state?: string;
    country?: string;
  } {
    // Parse US address format: "123 Main St, City, ST 12345"
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
