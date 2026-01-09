import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema for adding leads to campaign
const addLeadsSchema = z.object({
  leadIds: z.array(z.string().uuid()),
});

// GET - Fetch leads assigned to a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Get campaign leads with lead details
    const { data, error, count } = await supabase
      .from("campaign_leads")
      .select(`
        id,
        status,
        scheduled_at,
        sent_at,
        delivered_at,
        opened_at,
        clicked_at,
        opened_count,
        clicked_count,
        error_message,
        leads (
          id,
          email,
          first_name,
          last_name,
          company_name,
          industry,
          status,
          email_verified
        )
      `, { count: "exact" })
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching campaign leads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add leads to a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validate input
    const result = addLeadsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const { leadIds } = result.data;

    // Verify campaign exists and is in valid state
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, status")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status === "completed" || campaign.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot add leads to a completed or cancelled campaign" },
        { status: 400 }
      );
    }

    // Get valid leads (not unsubscribed, not bounced)
    const { data: validLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id, email")
      .in("id", leadIds)
      .not("status", "in", '("unsubscribed","bounced")');

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    // Check for unsubscribed emails
    const emails = validLeads?.map((l) => l.email) || [];
    const { data: unsubscribed } = await supabase
      .from("unsubscribes")
      .select("email")
      .in("email", emails);

    const unsubscribedEmails = new Set(unsubscribed?.map((u) => u.email) || []);
    const eligibleLeads = validLeads?.filter(
      (l) => !unsubscribedEmails.has(l.email)
    ) || [];

    if (eligibleLeads.length === 0) {
      return NextResponse.json(
        { error: "No eligible leads to add", added: 0, skipped: leadIds.length },
        { status: 400 }
      );
    }

    // Get existing campaign leads to avoid duplicates
    const { data: existingLeads } = await supabase
      .from("campaign_leads")
      .select("lead_id")
      .eq("campaign_id", campaignId)
      .in("lead_id", eligibleLeads.map((l) => l.id));

    const existingLeadIds = new Set(existingLeads?.map((l) => l.lead_id) || []);
    const newLeads = eligibleLeads.filter((l) => !existingLeadIds.has(l.id));

    if (newLeads.length === 0) {
      return NextResponse.json({
        message: "All leads are already in this campaign",
        added: 0,
        skipped: leadIds.length,
      });
    }

    // Insert campaign leads
    const campaignLeadsToInsert = newLeads.map((lead) => ({
      campaign_id: campaignId,
      lead_id: lead.id,
      status: "pending",
    }));

    const { error: insertError } = await supabase
      .from("campaign_leads")
      .insert(campaignLeadsToInsert);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update campaign total_leads count
    const { count: totalLeads } = await supabase
      .from("campaign_leads")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    await supabase
      .from("campaigns")
      .update({ total_leads: totalLeads || 0 })
      .eq("id", campaignId);

    return NextResponse.json({
      message: "Leads added successfully",
      added: newLeads.length,
      skipped: leadIds.length - newLeads.length,
      total: totalLeads,
    });
  } catch (error) {
    console.error("Error adding leads to campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove leads from a campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const leadIds = searchParams.get("leadIds")?.split(",") || [];

    if (leadIds.length === 0) {
      return NextResponse.json(
        { error: "No lead IDs provided" },
        { status: 400 }
      );
    }

    // Only allow removing leads that haven't been sent
    const { error: deleteError, count } = await supabase
      .from("campaign_leads")
      .delete({ count: "exact" })
      .eq("campaign_id", campaignId)
      .in("lead_id", leadIds)
      .eq("status", "pending");

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Update campaign total_leads count
    const { count: totalLeads } = await supabase
      .from("campaign_leads")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    await supabase
      .from("campaigns")
      .update({ total_leads: totalLeads || 0 })
      .eq("id", campaignId);

    return NextResponse.json({
      message: "Leads removed successfully",
      removed: count || 0,
    });
  } catch (error) {
    console.error("Error removing leads from campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
