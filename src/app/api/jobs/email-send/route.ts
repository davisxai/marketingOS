import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend/client";
import { incrementEmailCount } from "@/lib/redis/client";
import {
  processEmailForSending,
  generateUnsubscribeToken,
} from "@/lib/utils/template-parser";
import type { EmailSendJob } from "@/lib/qstash/client";

// This endpoint is called by QStash to send an email
export async function POST(request: NextRequest) {
  try {
    // Verify QStash signature in production
    const signature = request.headers.get("upstash-signature") || "";
    if (process.env.NODE_ENV === "production" && !signature) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job: EmailSendJob = await request.json();
    const {
      campaignLeadId,
      campaignId,
      leadId,
      to,
      from,
      fromName,
      replyTo,
      subject,
      html,
      text,
    } = job;

    console.log(`Processing email send job: ${campaignLeadId} -> ${to}`);

    // Check if email is unsubscribed
    const { data: unsubscribed } = await supabaseAdmin
      .from("unsubscribes")
      .select("id")
      .eq("email", to)
      .single();

    if (unsubscribed) {
      // Mark as skipped
      await supabaseAdmin
        .from("campaign_leads")
        .update({
          status: "skipped",
          error_message: "Email is unsubscribed",
        })
        .eq("id", campaignLeadId);

      return NextResponse.json({
        success: false,
        reason: "unsubscribed",
      });
    }

    // Generate unsubscribe token
    const unsubscribeToken = generateUnsubscribeToken();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Process email with tracking and compliance
    const processedHtml = processEmailForSending(
      html,
      campaignLeadId,
      unsubscribeToken,
      appUrl
    );

    // Send via Resend
    const result = await sendEmail({
      to,
      from,
      fromName,
      replyTo,
      subject,
      html: processedHtml,
      text,
      campaignId,
    });

    if (result.error) {
      // Update campaign lead with error
      await supabaseAdmin
        .from("campaign_leads")
        .update({
          status: "failed",
          error_message: result.error.message,
          retry_count: 1,
        })
        .eq("id", campaignLeadId);

      console.error(`Email send failed: ${result.error.message}`);
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 }
      );
    }

    // Update campaign lead as sent
    await supabaseAdmin
      .from("campaign_leads")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        resend_email_id: result.data?.id,
      })
      .eq("id", campaignLeadId);

    // Update campaign sent count
    await supabaseAdmin.rpc("increment_campaign_stat", {
      p_campaign_id: campaignId,
      p_stat_field: "sent_count",
    });

    // Store unsubscribe token for this email (ignore if email already exists)
    await supabaseAdmin.from("unsubscribes").upsert({
      email: to,
      lead_id: leadId,
      campaign_id: campaignId,
      token: unsubscribeToken,
      source: "link",
    }, { onConflict: "email", ignoreDuplicates: true });

    // Increment rate limit counters
    await incrementEmailCount();

    console.log(`Email sent successfully: ${result.data?.id}`);

    return NextResponse.json({
      success: true,
      emailId: result.data?.id,
    });
  } catch (error) {
    console.error("Email send job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
