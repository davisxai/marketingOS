import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Warmup schedule - maps days to daily limits
const WARMUP_SCHEDULE = [
  { day: 1, limit: 10 },
  { day: 3, limit: 20 },
  { day: 5, limit: 35 },
  { day: 7, limit: 50 },
  { day: 10, limit: 75 },
  { day: 14, limit: 125 },
  { day: 18, limit: 175 },
  { day: 21, limit: 250 },
  { day: 25, limit: 350 },
  { day: 28, limit: 450 },
  { day: 32, limit: 600 },
  { day: 35, limit: 750 },
  { day: 40, limit: 900 },
  { day: 45, limit: 1000 },
];

// Health thresholds
const MIN_DELIVERABILITY_RATE = 95; // Pause if deliverability drops below 95%
const MAX_BOUNCE_RATE = 2; // Pause if bounce rate exceeds 2%
const MIN_EMAILS_FOR_HEALTH_CHECK = 50; // Need at least 50 emails to evaluate health

function getExpectedLimit(day: number, targetLimit: number): number {
  for (let i = WARMUP_SCHEDULE.length - 1; i >= 0; i--) {
    if (day >= WARMUP_SCHEDULE[i].day) {
      // Cap at target limit
      return Math.min(WARMUP_SCHEDULE[i].limit, targetLimit);
    }
  }
  return 10;
}

function calculateDaysSinceStart(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

async function handler(request: NextRequest) {
  try {
    // Get all active warmup domains
    const { data: warmups, error: fetchError } = await supabaseAdmin
      .from("domain_warmup")
      .select("*")
      .eq("status", "active");

    if (fetchError) {
      console.error("Error fetching warmups:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch warmups" },
        { status: 500 }
      );
    }

    if (!warmups || warmups.length === 0) {
      return NextResponse.json({ message: "No active warmups to process" });
    }

    const results = [];

    for (const warmup of warmups) {
      const result: Record<string, unknown> = {
        domain: warmup.domain,
        previousDay: warmup.warmup_day,
        previousLimit: warmup.current_daily_limit,
      };

      // Calculate current day
      const currentDay = calculateDaysSinceStart(warmup.warmup_started_at);
      const expectedLimit = getExpectedLimit(currentDay, warmup.target_daily_limit);

      // Check health if we have enough data
      let isHealthy = true;
      if (warmup.total_sent >= MIN_EMAILS_FOR_HEALTH_CHECK) {
        const deliverabilityRate = warmup.total_delivered / warmup.total_sent * 100;
        const bounceRate = warmup.total_bounced / warmup.total_sent * 100;

        isHealthy = deliverabilityRate >= MIN_DELIVERABILITY_RATE && bounceRate <= MAX_BOUNCE_RATE;

        result.deliverabilityRate = deliverabilityRate.toFixed(2);
        result.bounceRate = bounceRate.toFixed(2);
        result.isHealthy = isHealthy;
      }

      // Determine status
      let newStatus = warmup.status;
      let newLimit = warmup.current_daily_limit;

      if (!isHealthy) {
        // Pause unhealthy domains
        newStatus = "paused";
        result.action = "paused_unhealthy";
      } else if (warmup.current_daily_limit >= warmup.target_daily_limit) {
        // Reached target, mark as completed
        newStatus = "completed";
        newLimit = warmup.target_daily_limit;
        result.action = "completed";
      } else if (expectedLimit > warmup.current_daily_limit) {
        // Time to increase the limit
        newLimit = expectedLimit;
        result.action = "increased_limit";
      } else {
        result.action = "no_change";
      }

      // Update the warmup record
      const { error: updateError } = await supabaseAdmin
        .from("domain_warmup")
        .update({
          warmup_day: currentDay,
          current_daily_limit: newLimit,
          is_healthy: isHealthy,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", warmup.id);

      if (updateError) {
        result.error = updateError.message;
      }

      result.newDay = currentDay;
      result.newLimit = newLimit;
      result.newStatus = newStatus;

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error in warmup progression:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export with QStash signature verification for production
// For local testing, you can bypass verification
export const POST = process.env.NODE_ENV === "development"
  ? handler
  : verifySignatureAppRouter(handler);
