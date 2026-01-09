import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignLeadId: string }> }
) {
  try {
    const { campaignLeadId } = await params;
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Decode the URL
    let targetUrl: string;
    try {
      targetUrl = decodeURIComponent(url);
    } catch {
      targetUrl = url;
    }

    // Validate URL
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Get campaign lead details
    const { data: campaignLead } = await supabaseAdmin
      .from("campaign_leads")
      .select("id, campaign_id, lead_id, clicked_at, clicked_count")
      .eq("id", campaignLeadId)
      .single();

    if (campaignLead) {
      // Record email event
      await supabaseAdmin.from("email_events").insert({
        campaign_lead_id: campaignLeadId,
        event_type: "clicked",
        clicked_url: targetUrl,
        event_data: {
          user_agent: request.headers.get("user-agent"),
          ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
          timestamp: new Date().toISOString(),
        },
      });

      // Update campaign lead (first click sets clicked_at)
      const updates: Record<string, unknown> = {
        clicked_count: (campaignLead.clicked_count || 0) + 1,
      };

      if (!campaignLead.clicked_at) {
        updates.clicked_at = new Date().toISOString();
        updates.status = "clicked";
      }

      await supabaseAdmin
        .from("campaign_leads")
        .update(updates)
        .eq("id", campaignLeadId);

      // Increment campaign clicked count (only on first click)
      if (!campaignLead.clicked_at) {
        await supabaseAdmin.rpc("increment_campaign_stat", {
          p_campaign_id: campaignLead.campaign_id,
          p_stat_field: "clicked_count",
        });
      }
    }

    // Redirect to the target URL
    return NextResponse.redirect(targetUrl);
  } catch (error) {
    console.error("Error tracking click:", error);
    // Try to redirect anyway
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    if (url) {
      try {
        return NextResponse.redirect(decodeURIComponent(url));
      } catch {
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.redirect(new URL("/", request.url));
  }
}
