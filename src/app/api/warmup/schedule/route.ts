import { NextRequest, NextResponse } from "next/server";
import { qstash as qstashClient } from "@/lib/qstash/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const WARMUP_SCHEDULE_ID = "warmup-progression-daily";

// GET: Check if the warmup scheduler is active
export async function GET() {
  try {
    const schedules = await qstashClient.schedules.list();
    const warmupSchedule = schedules.find(
      (s) => s.scheduleId === WARMUP_SCHEDULE_ID || s.destination?.includes("/api/warmup/progress")
    );

    return NextResponse.json({
      active: !!warmupSchedule,
      schedule: warmupSchedule || null,
    });
  } catch (error) {
    console.error("Error checking warmup schedule:", error);
    return NextResponse.json(
      { error: "Failed to check schedule status" },
      { status: 500 }
    );
  }
}

// POST: Create or update the warmup scheduler
export async function POST(request: NextRequest) {
  try {
    // First, try to delete any existing schedule
    try {
      const schedules = await qstashClient.schedules.list();
      const existingSchedule = schedules.find(
        (s) => s.destination?.includes("/api/warmup/progress")
      );
      if (existingSchedule) {
        await qstashClient.schedules.delete(existingSchedule.scheduleId);
      }
    } catch {
      // Ignore errors when deleting
    }

    // Create a daily schedule at 6 AM UTC (adjust based on preference)
    // Cron: minute hour day month weekday
    const schedule = await qstashClient.schedules.create({
      destination: `${APP_URL}/api/warmup/progress`,
      cron: "0 6 * * *", // Daily at 6 AM UTC
    });

    return NextResponse.json({
      success: true,
      scheduleId: schedule.scheduleId,
      message: "Warmup progression scheduled daily at 6 AM UTC",
    });
  } catch (error) {
    console.error("Error creating warmup schedule:", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}

// DELETE: Remove the warmup scheduler
export async function DELETE() {
  try {
    const schedules = await qstashClient.schedules.list();
    const warmupSchedule = schedules.find(
      (s) => s.destination?.includes("/api/warmup/progress")
    );

    if (warmupSchedule) {
      await qstashClient.schedules.delete(warmupSchedule.scheduleId);
      return NextResponse.json({
        success: true,
        message: "Warmup schedule deleted",
      });
    }

    return NextResponse.json({
      success: true,
      message: "No warmup schedule found",
    });
  } catch (error) {
    console.error("Error deleting warmup schedule:", error);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    );
  }
}
