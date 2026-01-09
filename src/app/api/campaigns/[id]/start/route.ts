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
      .select("*, email_templates(id, name)")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Validate campaign state
    if (campaign.status !== "draft") {
      return NextResponse.json(
        { error: "Campaign can only be started from draft status" },
        { status: 400 }
      );
    }

    // Validate template exists
    if (!campaign.template_id) {
      return NextResponse.json(
        { error: "Campaign must have a template assigned" },
        { status: 400 }
      );
    }

    // Check if campaign has leads
    const { count: leadsCount } = await supabase
      .from("campaign_leads")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    if (!leadsCount || leadsCount === 0) {
      return NextResponse.json(
        { error: "Campaign must have leads assigned" },
        { status: 400 }
      );
    }

    // Update campaign status to active
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
      })
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
      // Continue even if QStash fails - campaign is still marked as active
    }

    // Schedule recurring daily processing (Monday-Friday at 9 AM UTC)
    try {
      const schedule = await qstash.schedules.create({
        destination: `${baseUrl}/api/jobs/campaign-process`,
        body: JSON.stringify({ campaignId }),
        cron: "0 9 * * 1-5",
      });

      // Store schedule ID for later cancellation
      await supabase
        .from("campaigns")
        .update({ qstash_schedule_id: schedule.scheduleId })
        .eq("id", campaignId);
    } catch (scheduleError) {
      console.error("Failed to create schedule:", scheduleError);
      // Continue - immediate processing was triggered
    }

    return NextResponse.json({
      success: true,
      message: "Campaign started successfully",
      campaignId,
    });
  } catch (error) {
    console.error("Error starting campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
