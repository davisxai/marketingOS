"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Mail, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface Campaign {
  id: string;
  name: string;
  template_id: string | null;
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  daily_limit: number;
  send_window_start: string | null;
  send_window_end: string | null;
  status: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
}

export default function CampaignSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [campaignResult, templatesResult] = await Promise.all([
        supabase.from("campaigns").select("*").eq("id", campaignId).single(),
        supabase.from("email_templates").select("id, name, subject").eq("is_active", true),
      ]);

      if (campaignResult.data) {
        setCampaign(campaignResult.data);
      }
      if (templatesResult.data) {
        setTemplates(templatesResult.data);
      }

      setLoading(false);
    }

    fetchData();
  }, [campaignId]);

  const handleSave = async () => {
    if (!campaign) return;

    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    await supabase
      .from("campaigns")
      .update({
        name: campaign.name,
        template_id: campaign.template_id,
        from_name: campaign.from_name,
        from_email: campaign.from_email,
        reply_to: campaign.reply_to,
        daily_limit: campaign.daily_limit,
        send_window_start: campaign.send_window_start,
        send_window_end: campaign.send_window_end,
      })
      .eq("id", campaignId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Campaign not found</p>
        <Link href="/campaigns" className="mt-4">
          <Button variant="outline">Back to Campaigns</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/campaigns/${campaignId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Campaign Settings</h1>
            <p className="mt-1 text-muted-foreground">{campaign.name}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Saved" : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Campaign Details</CardTitle>
            </div>
            <CardDescription>Basic campaign information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Campaign Name</label>
              <Input
                value={campaign.name}
                onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                placeholder="Q1 Outreach"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Email Template</label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={campaign.template_id || ""}
                onChange={(e) => setCampaign({ ...campaign, template_id: e.target.value || null })}
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Daily Send Limit</label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={campaign.daily_limit}
                onChange={(e) => setCampaign({ ...campaign, daily_limit: parseInt(e.target.value) || 100 })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Maximum emails to send per day for this campaign
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Email Configuration</CardTitle>
            </div>
            <CardDescription>
              Override default sender settings for this campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">From Name</label>
              <Input
                value={campaign.from_name || ""}
                onChange={(e) => setCampaign({ ...campaign, from_name: e.target.value })}
                placeholder="Leave empty to use default"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">From Email</label>
              <Input
                type="email"
                value={campaign.from_email || ""}
                onChange={(e) => setCampaign({ ...campaign, from_email: e.target.value })}
                placeholder="Leave empty to use default"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Reply-To</label>
              <Input
                type="email"
                value={campaign.reply_to || ""}
                onChange={(e) => setCampaign({ ...campaign, reply_to: e.target.value })}
                placeholder="Leave empty to use default"
              />
            </div>
          </CardContent>
        </Card>

        {/* Send Window */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Send Window</CardTitle>
            </div>
            <CardDescription>
              Override default send times for this campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={campaign.send_window_start || ""}
                  onChange={(e) => setCampaign({ ...campaign, send_window_start: e.target.value })}
                  placeholder="Default"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={campaign.send_window_end || ""}
                  onChange={(e) => setCampaign({ ...campaign, send_window_end: e.target.value })}
                  placeholder="Default"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to use the global send window from Settings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
