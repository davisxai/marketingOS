import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const supabase = await createClient();

    // Get original campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Create new campaign with copied settings
    const { data: newCampaign, error: insertError } = await supabase
      .from("campaigns")
      .insert({
        name: `${campaign.name} (Copy)`,
        description: campaign.description,
        template_id: campaign.template_id,
        from_name: campaign.from_name,
        from_email: campaign.from_email,
        reply_to: campaign.reply_to,
        status: "draft",
        daily_limit: campaign.daily_limit,
        send_window_start: campaign.send_window_start,
        send_window_end: campaign.send_window_end,
        send_days: campaign.send_days,
        delay_between_sends: campaign.delay_between_sends,
        target_filters: campaign.target_filters,
        total_leads: 0,
        sent_count: 0,
        delivered_count: 0,
        opened_count: 0,
        clicked_count: 0,
        replied_count: 0,
        bounced_count: 0,
        unsubscribed_count: 0,
        is_ab_test: campaign.is_ab_test,
        ab_variants: campaign.ab_variants,
      })
      .select()
      .single();

    if (insertError || !newCampaign) {
      return NextResponse.json(
        { error: "Failed to duplicate campaign" },
        { status: 500 }
      );
    }

    // Copy campaign leads (as pending)
    const { data: originalLeads } = await supabase
      .from("campaign_leads")
      .select("lead_id")
      .eq("campaign_id", campaignId);

    if (originalLeads && originalLeads.length > 0) {
      const newCampaignLeads = originalLeads.map((lead) => ({
        campaign_id: newCampaign.id,
        lead_id: lead.lead_id,
        status: "pending",
      }));

      const { error: leadsError } = await supabase
        .from("campaign_leads")
        .insert(newCampaignLeads);

      if (!leadsError) {
        // Update total leads count
        await supabase
          .from("campaigns")
          .update({ total_leads: originalLeads.length })
          .eq("id", newCampaign.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Campaign duplicated successfully",
      id: newCampaign.id,
      name: newCampaign.name,
    });
  } catch (error) {
    console.error("Error duplicating campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
