"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface Template {
  id: string;
  name: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_id: "",
    from_name: "Operator OS",
    from_email: "hello@marketing.operatoros.ai",
    reply_to: "",
    daily_limit: 50,
    send_window_start: "09:00",
    send_window_end: "17:00",
  });

  useEffect(() => {
    async function fetchTemplates() {
      const supabase = createClient();
      const { data } = await supabase
        .from("email_templates")
        .select("id, name")
        .eq("is_active", true);

      setTemplates(data || []);
    }

    fetchTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("campaigns").insert({
      name: formData.name,
      template_id: formData.template_id || null,
      from_name: formData.from_name,
      from_email: formData.from_email,
      reply_to: formData.reply_to || null,
      daily_limit: formData.daily_limit,
      send_window_start: formData.send_window_start,
      send_window_end: formData.send_window_end,
      status: "draft",
    });

    if (!error) {
      router.push("/campaigns");
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Create Campaign</h1>
          <p className="mt-1 text-muted-foreground">
            Set up a new email outreach campaign
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign Details */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Campaign Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., RAG Services Outreach - Q1"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Description (optional)
              </label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this campaign"
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Template */}
        <Card>
          <CardHeader>
            <CardTitle>Email Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Select Template
              </label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.template_id}
                onChange={(e) =>
                  setFormData({ ...formData, template_id: e.target.value })
                }
                required
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Sender Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Sender Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  From Name
                </label>
                <Input
                  value={formData.from_name}
                  onChange={(e) =>
                    setFormData({ ...formData, from_name: e.target.value })
                  }
                  placeholder="Your name or company name"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  From Email
                </label>
                <Input
                  type="email"
                  value={formData.from_email}
                  onChange={(e) =>
                    setFormData({ ...formData, from_email: e.target.value })
                  }
                  placeholder="you@marketing.operatoros.ai"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Reply-To Email (optional)
              </label>
              <Input
                type="email"
                value={formData.reply_to}
                onChange={(e) =>
                  setFormData({ ...formData, reply_to: e.target.value })
                }
                placeholder="replies@operatoros.ai"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sending Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Sending Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Daily Send Limit
              </label>
              <Input
                type="number"
                value={formData.daily_limit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    daily_limit: parseInt(e.target.value),
                  })
                }
                min={1}
                max={1000}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Maximum emails to send per day (respects domain warm-up limits)
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Send Window Start
                </label>
                <Input
                  type="time"
                  value={formData.send_window_start}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      send_window_start: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Send Window End
                </label>
                <Input
                  type="time"
                  value={formData.send_window_end}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      send_window_end: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Emails will be sent randomly within this time window (recipient&apos;s
              local time)
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/campaigns">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Create Campaign
          </Button>
        </div>
      </form>
    </div>
  );
}
