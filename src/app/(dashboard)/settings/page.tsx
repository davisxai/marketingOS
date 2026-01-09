"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Mail, Clock, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getSettings, saveSettings, DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";

const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "UTC", label: "UTC" },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
      setLoading(false);
    }

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    const success = await saveSettings(settings);

    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError("Failed to save settings. Please try again.");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Configure your email sending preferences
          </p>
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

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Email Configuration</CardTitle>
            </div>
            <CardDescription>
              Configure the sender details for your outreach emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">From Name</label>
              <Input
                value={settings.from_name}
                onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                placeholder="John from Operator"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The name that appears in the recipients inbox
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">From Email</label>
              <Input
                type="email"
                value={settings.from_email}
                onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                placeholder="outreach@marketing.operatoros.ai"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Must be a verified domain in Resend
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Reply-To Email</label>
              <Input
                type="email"
                value={settings.reply_to}
                onChange={(e) => setSettings({ ...settings, reply_to: e.target.value })}
                placeholder="hello@operatoros.ai"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Where replies will be sent
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sending Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Sending Limits</CardTitle>
            </div>
            <CardDescription>
              Control sending volume to protect deliverability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Daily Send Limit</label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={settings.daily_limit}
                onChange={(e) => setSettings({ ...settings, daily_limit: parseInt(e.target.value) || 100 })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Maximum emails sent per day across all campaigns
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm font-medium text-foreground">Warm-up Guidelines</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>Week 1: Start with 10-50 emails/day</li>
                <li>Week 2: Increase to 60-175 emails/day</li>
                <li>Week 3-4: Scale to 250-400 emails/day</li>
                <li>Week 5+: Up to 1,000 emails/day</li>
              </ul>
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
              When emails should be sent for best engagement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={settings.send_window_start}
                  onChange={(e) => setSettings({ ...settings, send_window_start: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={settings.send_window_end}
                  onChange={(e) => setSettings({ ...settings, send_window_end: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Timezone</label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* CAN-SPAM Compliance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <CardTitle>CAN-SPAM Compliance</CardTitle>
            </div>
            <CardDescription>
              Required footer information for compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Company Name</label>
              <Input
                value={settings.footer_company_name}
                onChange={(e) => setSettings({ ...settings, footer_company_name: e.target.value })}
                placeholder="Operator OS Inc."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Physical Address</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={settings.footer_address}
                onChange={(e) => setSettings({ ...settings, footer_address: e.target.value })}
                placeholder="123 Main St, Suite 100&#10;San Francisco, CA 94102"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Required by CAN-SPAM in all commercial emails
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
