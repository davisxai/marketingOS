import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function UnsubscribePage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  // Find the unsubscribe record
  const { data: unsubscribe } = await supabase
    .from("unsubscribes")
    .select("email, created_at")
    .eq("token", token)
    .single();

  // If no record found, try to process new unsubscribe
  if (!unsubscribe) {
    // Check if this is a valid campaign lead token
    const { data: campaignLead } = await supabase
      .from("campaign_leads")
      .select("id, lead_id, campaign_id, lead:leads(email)")
      .eq("id", token)
      .single();

    if (campaignLead && campaignLead.lead) {
      // Process unsubscribe
      const leadData = campaignLead.lead as unknown as { email: string };
      const email = leadData.email;

      // Add to unsubscribes table
      await supabase.from("unsubscribes").upsert({
        email,
        lead_id: campaignLead.lead_id,
        campaign_id: campaignLead.campaign_id,
        token,
        source: "link",
      });

      // Update lead status
      await supabase
        .from("leads")
        .update({ status: "unsubscribed" })
        .eq("id", campaignLead.lead_id);

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#039855]/10">
                <CheckCircle className="h-8 w-8 text-[#039855]" />
              </div>
              <CardTitle>Successfully Unsubscribed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-400">
                You have been unsubscribed from our mailing list. You will no
                longer receive emails from us.
              </p>
              <p className="mt-4 text-sm text-neutral-500">
                If this was a mistake, please contact us at{" "}
                <a
                  href="mailto:support@operatoros.ai"
                  className="text-white underline"
                >
                  support@operatoros.ai
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Invalid token
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#d92d20]/10">
              <XCircle className="h-8 w-8 text-[#d92d20]" />
            </div>
            <CardTitle>Invalid Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-400">
              This unsubscribe link is invalid or has expired. If you continue
              to receive unwanted emails, please contact us.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already unsubscribed
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#039855]/10">
            <CheckCircle className="h-8 w-8 text-[#039855]" />
          </div>
          <CardTitle>Already Unsubscribed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-400">
            The email <span className="text-white">{unsubscribe.email}</span> is
            already unsubscribed from our mailing list.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
