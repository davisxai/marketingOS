import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { qstash } from "@/lib/qstash/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const supabase = await createClient();

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, status, template_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Validate campaign state
    if (campaign.status !== "paused") {
      return NextResponse.json(
        { error: "Only paused campaigns can be resumed" },
        { status: 400 }
      );
    }

    // Check if there are still pending leads
    const { count: pendingCount } = await supabase
      .from("campaign_leads")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");

    if (!pendingCount || pendingCount === 0) {
      // No pending leads, mark as completed
      await supabase
        .from("campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return NextResponse.json({
        success: true,
        message: "Campaign completed - no pending leads remaining",
        campaignId,
        status: "completed",
      });
    }

    // Update campaign status to active
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({ status: "active" })
      .eq("id", campaignId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update campaign status" },
        { status: 500 }
      );
    }

    // Trigger immediate campaign processing via QStash
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    try {
      await qstash.publishJSON({
        url: `${baseUrl}/api/jobs/campaign-process`,
        body: { campaignId },
        retries: 3,
      });
    } catch (qstashError) {
      console.error("QStash publish error:", qstashError);
    }

    // Re-create schedule for daily processing
    try {
      const schedule = await qstash.schedules.create({
        destination: `${baseUrl}/api/jobs/campaign-process`,
        body: JSON.stringify({ campaignId }),
        cron: "0 9 * * 1-5",
      });

      await supabase
        .from("campaigns")
        .update({ qstash_schedule_id: schedule.scheduleId })
        .eq("id", campaignId);
    } catch (scheduleError) {
      console.error("Failed to create schedule:", scheduleError);
    }

    return NextResponse.json({
      success: true,
      message: "Campaign resumed successfully",
      campaignId,
      pendingLeads: pendingCount,
    });
  } catch (error) {
    console.error("Error resuming campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
