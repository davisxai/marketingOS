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
      .select("id, status, qstash_schedule_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Validate campaign state
    if (campaign.status !== "active") {
      return NextResponse.json(
        { error: "Only active campaigns can be paused" },
        { status: 400 }
      );
    }

    // Cancel QStash schedule if exists
    if (campaign.qstash_schedule_id) {
      try {
        await qstash.schedules.delete(campaign.qstash_schedule_id);
      } catch (error) {
        console.error("Failed to delete QStash schedule:", error);
        // Continue even if deletion fails
      }
    }

    // Update campaign status to paused
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({
        status: "paused",
        qstash_schedule_id: null,
      })
      .eq("id", campaignId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update campaign status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Campaign paused successfully",
      campaignId,
    });
  } catch (error) {
    console.error("Error pausing campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
