import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { GoogleMapsScraper } from "@/scrapers/google-maps/scraper";
import { SerpAPIGoogleMapsScraper } from "@/scrapers/serpapi/google-maps";
import { SerpAPIGoogleSearchScraper } from "@/scrapers/serpapi/google-search";
import type { ScraperJob } from "@/lib/qstash/client";

// This endpoint is called by QStash to run a scraper job
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("upstash-signature") || "";
    if (process.env.NODE_ENV === "production" && !signature) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job: ScraperJob = await request.json();
    const { jobId, scraperType, query, location, maxResults = 100 } = job;

    console.log(`Starting scraper job ${jobId}: ${scraperType} - ${query}`);

    // Update job status to running
    await supabaseAdmin
      .from("scraper_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    let leadsCreated = 0;
    let leadsUpdated = 0;
    let errorsCount = 0;
    let processedCount = 0;

    try {
      // Get appropriate scraper
      const scraper = getScraperForType(scraperType);

      if (!scraper) {
        throw new Error(`Unknown scraper type: ${scraperType}`);
      }

      // Run scraper
      for await (const result of scraper.scrape({ query, location, maxResults })) {
        processedCount++;

        try {
          if (!result.email && !result.company_website) {
            // Skip results without contact info
            continue;
          }

          // Try to find or create lead
          if (result.email) {
            const { data: existing } = await supabaseAdmin
              .from("leads")
              .select("id")
              .eq("email", result.email)
              .single();

            if (existing) {
              // Update existing lead
              await supabaseAdmin
                .from("leads")
                .update({
                  company_name: result.company_name || undefined,
                  phone: result.phone || undefined,
                  company_website: result.company_website || undefined,
                  city: result.city || undefined,
                  state: result.state || undefined,
                  address: result.address || undefined,
                  source_url: result.source_url || undefined,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);

              leadsUpdated++;
            } else {
              // Create new lead
              await supabaseAdmin.from("leads").insert({
                email: result.email,
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
                source: scraperType as "google_maps" | "yellowpages" | "yelp",
                source_url: result.source_url || null,
                scraper_job_id: jobId,
                status: "new",
              });

              leadsCreated++;
            }
          }

          // Update job progress periodically
          if (processedCount % 10 === 0) {
            await supabaseAdmin
              .from("scraper_jobs")
              .update({
                processed_count: processedCount,
                leads_created: leadsCreated,
                leads_updated: leadsUpdated,
                errors_count: errorsCount,
              })
              .eq("id", jobId);
          }
        } catch (error) {
          console.error(`Error processing scraper result:`, error);
          errorsCount++;
        }
      }

      // Mark job as completed
      await supabaseAdmin
        .from("scraper_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_results: processedCount,
          processed_count: processedCount,
          leads_created: leadsCreated,
          leads_updated: leadsUpdated,
          errors_count: errorsCount,
        })
        .eq("id", jobId);

      console.log(
        `Scraper job ${jobId} completed: ${leadsCreated} created, ${leadsUpdated} updated`
      );

      return NextResponse.json({
        success: true,
        processed: processedCount,
        created: leadsCreated,
        updated: leadsUpdated,
        errors: errorsCount,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Mark job as failed
      await supabaseAdmin
        .from("scraper_jobs")
        .update({
          status: "failed",
          last_error: errorMessage,
          processed_count: processedCount,
          leads_created: leadsCreated,
          leads_updated: leadsUpdated,
          errors_count: errorsCount,
        })
        .eq("id", jobId);

      throw error;
    }
  } catch (error) {
    console.error("Scraper job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getScraperForType(type: string) {
  // Check if SerpAPI is available
  const hasSerpAPI = !!process.env.SERPAPI_API_KEY;

  switch (type) {
    case "google_maps":
      // Prefer SerpAPI if available, fallback to Playwright
      return hasSerpAPI ? new SerpAPIGoogleMapsScraper() : new GoogleMapsScraper();
    case "serpapi_google_maps":
      if (!hasSerpAPI) {
        throw new Error("SERPAPI_API_KEY is required for this scraper type");
      }
      return new SerpAPIGoogleMapsScraper();
    case "serpapi_google_search":
    case "google_search":
      if (!hasSerpAPI) {
        throw new Error("SERPAPI_API_KEY is required for this scraper type");
      }
      return new SerpAPIGoogleSearchScraper();
    default:
      return null;
  }
}
