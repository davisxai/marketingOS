import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// 1x1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignLeadId: string }> }
) {
  try {
    const { campaignLeadId } = await params;

    // Get campaign lead details
    const { data: campaignLead } = await supabaseAdmin
      .from("campaign_leads")
      .select("id, campaign_id, lead_id, opened_at, opened_count")
      .eq("id", campaignLeadId)
      .single();

    if (campaignLead) {
      // Record email event
      await supabaseAdmin.from("email_events").insert({
        campaign_lead_id: campaignLeadId,
        event_type: "opened",
        event_data: {
          user_agent: request.headers.get("user-agent"),
          ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
          timestamp: new Date().toISOString(),
        },
      });

      // Update campaign lead (first open sets opened_at)
      const updates: Record<string, unknown> = {
        opened_count: (campaignLead.opened_count || 0) + 1,
      };

      if (!campaignLead.opened_at) {
        updates.opened_at = new Date().toISOString();
        updates.status = "opened";
      }

      await supabaseAdmin
        .from("campaign_leads")
        .update(updates)
        .eq("id", campaignLeadId);

      // Increment campaign opened count (only on first open)
      if (!campaignLead.opened_at) {
        await supabaseAdmin.rpc("increment_campaign_stat", {
          p_campaign_id: campaignLead.campaign_id,
          p_stat_field: "opened_count",
        });
      }
    }

    // Return transparent 1x1 GIF
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error tracking open:", error);
    // Still return the image to avoid breaking email rendering
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store",
      },
    });
  }
}
