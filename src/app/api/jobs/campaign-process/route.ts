import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { queueEmailSend, type EmailSendJob } from "@/lib/qstash/client";
import { canSendEmail } from "@/lib/redis/client";
import { personalizeTemplate } from "@/lib/utils/template-parser";

// This endpoint is called by QStash (or cron) to process daily campaign emails
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("upstash-signature") || "";
    if (process.env.NODE_ENV === "production" && !signature) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const campaignId = body.campaignId;

    // If no specific campaign, process all active campaigns
    const campaignIds = campaignId ? [campaignId] : await getActiveCampaignIds();

    let totalQueued = 0;

    for (const cId of campaignIds) {
      const queued = await processCampaign(cId);
      totalQueued += queued;
    }

    return NextResponse.json({
      success: true,
      campaignsProcessed: campaignIds.length,
      emailsQueued: totalQueued,
    });
  } catch (error) {
    console.error("Campaign process job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getActiveCampaignIds(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("campaigns")
    .select("id")
    .eq("status", "active");

  return data?.map((c) => c.id) || [];
}

async function processCampaign(campaignId: string): Promise<number> {
  // Get campaign details
  const { data: campaign } = await supabaseAdmin
    .from("campaigns")
    .select("*, template:email_templates(*)")
    .eq("id", campaignId)
    .single();

  if (!campaign || campaign.status !== "active") {
    console.log(`Campaign ${campaignId} is not active, skipping`);
    return 0;
  }

  // Check if within send window
  if (!isWithinSendWindow(campaign.send_window_start, campaign.send_window_end)) {
    console.log(`Campaign ${campaignId} outside send window, skipping`);
    return 0;
  }

  // Check day of week
  const today = new Date().getDay() || 7; // Convert Sunday from 0 to 7
  if (!campaign.send_days.includes(today)) {
    console.log(`Campaign ${campaignId} not scheduled for today, skipping`);
    return 0;
  }

  // Get daily limit (respect warm-up)
  const { data: warmup } = await supabaseAdmin
    .from("domain_warmup")
    .select("current_daily_limit")
    .eq("status", "active")
    .single();

  const effectiveLimit = Math.min(
    campaign.daily_limit,
    warmup?.current_daily_limit || 50
  );

  // Check how many we can still send today
  const canSend = await canSendEmail(effectiveLimit);
  if (!canSend) {
    console.log(`Daily email limit reached for campaign ${campaignId}`);
    return 0;
  }

  // Get pending campaign leads
  const { data: pendingLeads } = await supabaseAdmin
    .from("campaign_leads")
    .select("*, lead:leads(*)")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .limit(effectiveLimit);

  if (!pendingLeads || pendingLeads.length === 0) {
    console.log(`No pending leads for campaign ${campaignId}`);

    // Check if campaign is complete
    const { count: remaining } = await supabaseAdmin
      .from("campaign_leads")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");

    if (remaining === 0) {
      await supabaseAdmin
        .from("campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
    }

    return 0;
  }

  // Queue emails with delays
  const delayBetween = campaign.delay_between_sends || 60; // seconds
  let queued = 0;

  for (let i = 0; i < pendingLeads.length; i++) {
    const campaignLead = pendingLeads[i];
    const lead = campaignLead.lead;

    if (!lead) continue;

    // Personalize content
    const personalized = personalizeTemplate(
      {
        subject: campaign.template.subject,
        body_html: campaign.template.body_html,
        body_text: campaign.template.body_text,
      },
      lead
    );

    // Build job payload
    const job: EmailSendJob = {
      campaignLeadId: campaignLead.id,
      campaignId: campaign.id,
      leadId: lead.id,
      to: lead.email,
      from: campaign.from_email,
      fromName: campaign.from_name,
      replyTo: campaign.reply_to || undefined,
      subject: personalized.subject,
      html: personalized.html,
      text: personalized.text,
    };

    // Queue with delay
    const delay = i * delayBetween;
    await queueEmailSend(job, { delay });

    // Mark as queued
    await supabaseAdmin
      .from("campaign_leads")
      .update({
        status: "queued",
        queued_at: new Date().toISOString(),
        personalized_subject: personalized.subject,
        personalized_body: personalized.html,
      })
      .eq("id", campaignLead.id);

    queued++;
  }

  console.log(`Queued ${queued} emails for campaign ${campaignId}`);
  return queued;
}

function isWithinSendWindow(startTime: string, endTime: string): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentTime >= startMinutes && currentTime <= endMinutes;
}
