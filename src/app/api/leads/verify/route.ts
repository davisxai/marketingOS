import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { queueEmailVerify } from "@/lib/qstash/client";

// POST: Queue leads for email verification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadIds, verifyAll } = body;

    // Get leads to verify
    let query = supabaseAdmin
      .from("leads")
      .select("id, email, email_verification_status");

    if (verifyAll) {
      // Get all leads that haven't been verified or are pending
      query = query.or("email_verification_status.is.null,email_verification_status.eq.pending");
    } else if (leadIds && leadIds.length > 0) {
      // Get specific leads
      query = query.in("id", leadIds);
    } else {
      return NextResponse.json(
        { error: "Please provide leadIds or set verifyAll to true" },
        { status: 400 }
      );
    }

    const { data: leads, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching leads:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 }
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        queued: 0,
        message: "No leads to verify",
      });
    }

    // Queue each lead for verification with staggered delays
    let queued = 0;
    const errors: string[] = [];
    const DELAY_BETWEEN_VERIFICATIONS = 2; // 2 seconds between each verification

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      try {
        await queueEmailVerify(
          {
            leadId: lead.id,
            email: lead.email,
          },
          {
            delay: i * DELAY_BETWEEN_VERIFICATIONS,
          }
        );

        // Update status to pending
        await supabaseAdmin
          .from("leads")
          .update({ email_verification_status: "pending" })
          .eq("id", lead.id);

        queued++;
      } catch (error) {
        console.error(`Failed to queue verification for ${lead.email}:`, error);
        errors.push(lead.email);
      }
    }

    return NextResponse.json({
      success: true,
      queued,
      total: leads.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Queued ${queued} leads for verification`,
    });
  } catch (error) {
    console.error("Error in verify endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
