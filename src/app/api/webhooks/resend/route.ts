import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

// Resend webhook event types
type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.complained"
  | "email.bounced"
  | "email.opened"
  | "email.clicked";

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    headers?: Record<string, string>;
    click?: {
      link: string;
      timestamp: string;
    };
    bounce?: {
      message: string;
    };
  };
}

// Verify webhook signature
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Map Resend event to our event type
function mapEventType(
  resendType: ResendEventType
): string {
  const mapping: Record<ResendEventType, string> = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.delivery_delayed": "delayed",
    "email.complained": "complained",
    "email.bounced": "bounced",
    "email.opened": "opened",
    "email.clicked": "clicked",
  };
  return mapping[resendType] || resendType;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("svix-signature") || "";

    // Verify webhook signature in production
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret && process.env.NODE_ENV === "production") {
      if (!verifySignature(payload, signature, webhookSecret)) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const event: ResendWebhookPayload = JSON.parse(payload);
    const { type, data } = event;

    console.log(`Received Resend webhook: ${type}`, data.email_id);

    // Find campaign lead by resend email ID
    const { data: campaignLead } = await supabaseAdmin
      .from("campaign_leads")
      .select("id, campaign_id, lead_id")
      .eq("resend_email_id", data.email_id)
      .single();

    // Record the event
    await supabaseAdmin.from("email_events").insert({
      campaign_lead_id: campaignLead?.id || null,
      resend_email_id: data.email_id,
      event_type: mapEventType(type),
      event_data: data,
      clicked_url: data.click?.link || null,
    });

    // Update campaign lead status if found
    if (campaignLead) {
      const updates: Record<string, unknown> = {};

      switch (type) {
        case "email.delivered":
          updates.status = "delivered";
          updates.delivered_at = new Date().toISOString();
          break;
        case "email.opened":
          updates.status = "opened";
          updates.opened_at = new Date().toISOString();
          // Increment open count
          await supabaseAdmin.rpc("increment_opened_count", {
            campaign_lead_id: campaignLead.id,
          });
          break;
        case "email.clicked":
          updates.status = "clicked";
          updates.clicked_at = new Date().toISOString();
          // Increment click count
          await supabaseAdmin.rpc("increment_clicked_count", {
            campaign_lead_id: campaignLead.id,
          });
          break;
        case "email.bounced":
          updates.status = "bounced";
          updates.error_message = data.bounce?.message || "Email bounced";
          // Update lead status
          await supabaseAdmin
            .from("leads")
            .update({ status: "bounced" })
            .eq("id", campaignLead.lead_id);
          break;
        case "email.complained":
          // Add to unsubscribe list
          const to = data.to[0];
          await supabaseAdmin.from("unsubscribes").upsert({
            email: to,
            lead_id: campaignLead.lead_id,
            campaign_id: campaignLead.campaign_id,
            token: crypto.randomUUID(),
            source: "complaint",
          });
          // Update lead status
          await supabaseAdmin
            .from("leads")
            .update({ status: "unsubscribed" })
            .eq("id", campaignLead.lead_id);
          break;
      }

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin
          .from("campaign_leads")
          .update(updates)
          .eq("id", campaignLead.id);
      }

      // Update campaign stats
      await updateCampaignStats(campaignLead.campaign_id, type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function updateCampaignStats(campaignId: string, eventType: ResendEventType) {
  const incrementField: Record<string, string> = {
    "email.delivered": "delivered_count",
    "email.opened": "opened_count",
    "email.clicked": "clicked_count",
    "email.bounced": "bounced_count",
    "email.complained": "unsubscribed_count",
  };

  const field = incrementField[eventType];
  if (field) {
    // Use raw SQL increment to avoid race conditions
    await supabaseAdmin.rpc("increment_campaign_stat", {
      campaign_id: campaignId,
      stat_field: field,
    });
  }
}
