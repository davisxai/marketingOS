import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { EmailVerifyJob } from "@/lib/qstash/client";
import dns from "dns/promises";

// This endpoint is called by QStash to verify an email
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("upstash-signature") || "";
    if (process.env.NODE_ENV === "production" && !signature) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job: EmailVerifyJob = await request.json();
    const { leadId, email } = job;

    console.log(`Verifying email: ${email}`);

    // Step 1: Basic syntax validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await updateLeadVerification(leadId, "invalid", "Invalid email syntax");
      return NextResponse.json({ valid: false, reason: "invalid_syntax" });
    }

    // Step 2: Check MX records (free)
    const domain = email.split("@")[1];
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        await updateLeadVerification(leadId, "invalid", "No MX records found");
        return NextResponse.json({ valid: false, reason: "no_mx_record" });
      }
    } catch {
      await updateLeadVerification(leadId, "invalid", "Domain does not exist");
      return NextResponse.json({ valid: false, reason: "invalid_domain" });
    }

    // Step 3: Check disposable email list (free)
    const disposableDomains = [
      "tempmail.com",
      "throwaway.email",
      "guerrillamail.com",
      "10minutemail.com",
      "mailinator.com",
      "temp-mail.org",
      "fakeinbox.com",
      "trashmail.com",
    ];

    if (disposableDomains.includes(domain.toLowerCase())) {
      await updateLeadVerification(leadId, "invalid", "Disposable email");
      return NextResponse.json({ valid: false, reason: "disposable_email" });
    }

    // Step 4: Try paid verification if API keys are configured
    const hunterKey = process.env.HUNTER_API_KEY;
    const zerobounceKey = process.env.ZEROBOUNCE_API_KEY;

    if (hunterKey) {
      try {
        const result = await verifyWithHunter(email, hunterKey);
        if (result.status === "valid") {
          await updateLeadVerification(leadId, "valid", null, "hunter");
          return NextResponse.json({ valid: true, provider: "hunter" });
        } else if (result.status === "invalid") {
          await updateLeadVerification(leadId, "invalid", result.reason ?? null, "hunter");
          return NextResponse.json({ valid: false, reason: result.reason });
        }
        // If risky or unknown, continue to fallback
      } catch (error) {
        console.error("Hunter.io verification failed:", error);
      }
    }

    if (zerobounceKey) {
      try {
        const result = await verifyWithZeroBounce(email, zerobounceKey);
        if (result.status === "valid") {
          await updateLeadVerification(leadId, "valid", null, "zerobounce");
          return NextResponse.json({ valid: true, provider: "zerobounce" });
        } else if (result.status === "invalid") {
          await updateLeadVerification(leadId, "invalid", result.reason ?? null, "zerobounce");
          return NextResponse.json({ valid: false, reason: result.reason });
        }
      } catch (error) {
        console.error("ZeroBounce verification failed:", error);
      }
    }

    // If no paid verification or inconclusive, mark as risky but usable
    await updateLeadVerification(leadId, "risky", "Unverified - use with caution");
    return NextResponse.json({ valid: true, status: "risky" });
  } catch (error) {
    console.error("Email verify job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function updateLeadVerification(
  leadId: string,
  status: string,
  errorMessage: string | null,
  provider?: string
) {
  await supabaseAdmin
    .from("leads")
    .update({
      email_verified: status === "valid",
      email_verification_status: status,
      email_verified_at: status === "valid" ? new Date().toISOString() : null,
      email_verification_provider: provider || null,
    })
    .eq("id", leadId);
}

async function verifyWithHunter(
  email: string,
  apiKey: string
): Promise<{ status: string; reason?: string }> {
  const response = await fetch(
    `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`Hunter API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.data;

  if (result.result === "deliverable") {
    return { status: "valid" };
  } else if (result.result === "undeliverable") {
    return { status: "invalid", reason: result.reason || "Undeliverable" };
  } else {
    return { status: "unknown", reason: result.result };
  }
}

async function verifyWithZeroBounce(
  email: string,
  apiKey: string
): Promise<{ status: string; reason?: string }> {
  const response = await fetch(
    `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`
  );

  if (!response.ok) {
    throw new Error(`ZeroBounce API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status === "valid") {
    return { status: "valid" };
  } else if (data.status === "invalid") {
    return { status: "invalid", reason: data.sub_status || "Invalid" };
  } else {
    return { status: "unknown", reason: data.status };
  }
}
