"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  BarChart3,
  Mail,
  MousePointerClick,
  Eye,
  AlertTriangle,
  Users,
  Clock,
  Loader2,
  MoreHorizontal,
  Trash2,
  Copy,
  Settings,
  Plus,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatNumber, formatPercentage, calculateRate, formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddLeadsToCampaignDialog } from "@/components/campaigns/AddLeadsToCampaignDialog";

interface Campaign {
  id: string;
  name: string;
  status: string;
  template_id: string | null;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  daily_limit: number;
  send_window_start: string;
  send_window_end: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  created_at: string;
  email_templates?: { name: string; subject: string } | null;
}

interface CampaignLead {
  id: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  leads: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "info" }> = {
  draft: { label: "Draft", variant: "secondary" },
  scheduled: { label: "Scheduled", variant: "info" },
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [addLeadsOpen, setAddLeadsOpen] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);

  const fetchCampaign = useCallback(async () => {
    const supabase = createClient();

    const { data: campaignData } = await supabase
      .from("campaigns")
      .select(`
        *,
        email_templates (name, subject)
      `)
      .eq("id", campaignId)
      .single();

    if (campaignData) {
      setCampaign(campaignData);

      // Fetch campaign leads
      const { data: leadsData, count } = await supabase
        .from("campaign_leads")
        .select(`
          id,
          status,
          sent_at,
          opened_at,
          clicked_at,
          leads (email, first_name, last_name, company_name)
        `, { count: "exact" })
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(50);

      setCampaignLeads((leadsData as unknown as CampaignLead[]) || []);
      setTotalLeads(count || 0);
    }

    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  const handleStartCampaign = async () => {
    if (!campaign) return;

    // Validate campaign has leads
    if (totalLeads === 0) {
      alert("Please add leads to this campaign before starting.");
      return;
    }

    // Validate campaign has template
    if (!campaign.template_id) {
      alert("Please assign a template to this campaign before starting.");
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/start`, {
        method: "POST",
      });

      if (response.ok) {
        setCampaign({ ...campaign, status: "active" });
      } else {
        const data = await response.json();
        alert(data.error || "Failed to start campaign");
      }
    } catch (error) {
      console.error("Error starting campaign:", error);
    }
    setUpdating(false);
  };

  const handlePauseCampaign = async () => {
    if (!campaign) return;
    setUpdating(true);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/pause`, {
        method: "POST",
      });

      if (response.ok) {
        setCampaign({ ...campaign, status: "paused" });
      }
    } catch (error) {
      console.error("Error pausing campaign:", error);
    }
    setUpdating(false);
  };

  const handleResumeCampaign = async () => {
    if (!campaign) return;
    setUpdating(true);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/resume`, {
        method: "POST",
      });

      if (response.ok) {
        setCampaign({ ...campaign, status: "active" });
      }
    } catch (error) {
      console.error("Error resuming campaign:", error);
    }
    setUpdating(false);
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/duplicate`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/campaigns/${data.id}`);
      }
    } catch (error) {
      console.error("Error duplicating campaign:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId);

    if (!error) {
      router.push("/campaigns");
    }
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
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Campaign not found</h2>
        <p className="mt-2 text-muted-foreground">
          This campaign may have been deleted or does not exist.
        </p>
        <Link href="/campaigns" className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Button>
        </Link>
      </div>
    );
  }

  const statsSent = campaign.sent_count || 0;
  const statsDelivered = campaign.delivered_count || 0;
  const statsOpened = campaign.opened_count || 0;
  const statsClicked = campaign.clicked_count || 0;
  const statsBounced = campaign.bounced_count || 0;

  const openRate = calculateRate(statsOpened, statsDelivered);
  const clickRate = calculateRate(statsClicked, statsDelivered);
  const bounceRate = calculateRate(statsBounced, statsSent);
  const deliveryRate = calculateRate(statsDelivered, statsSent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-foreground">{campaign.name}</h1>
              <Badge variant={statusConfig[campaign.status]?.variant}>
                {statusConfig[campaign.status]?.label}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {campaign.email_templates?.name || "No template"} - Created {formatDate(campaign.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status === "active" ? (
            <Button
              variant="outline"
              onClick={handlePauseCampaign}
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
              Pause
            </Button>
          ) : campaign.status === "paused" ? (
            <Button
              onClick={handleResumeCampaign}
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Resume
            </Button>
          ) : campaign.status === "draft" ? (
            <Button
              onClick={handleStartCampaign}
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Campaign
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/campaigns/${campaignId}/analytics`}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Edit Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Campaign
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sent</span>
            </div>
            <p className="mt-2 text-3xl font-semibold">{formatNumber(statsSent)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Delivered</span>
            </div>
            <p className="mt-2 text-3xl font-semibold">{formatNumber(statsDelivered)}</p>
            <p className="text-xs text-muted-foreground">{formatPercentage(deliveryRate)} rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Opened</span>
            </div>
            <p className="mt-2 text-3xl font-semibold">{formatNumber(statsOpened)}</p>
            <p className="text-xs text-[#039855]">{formatPercentage(openRate)} open rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clicked</span>
            </div>
            <p className="mt-2 text-3xl font-semibold">{formatNumber(statsClicked)}</p>
            <p className="text-xs text-[#039855]">{formatPercentage(clickRate)} click rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Bounced</span>
            </div>
            <p className="mt-2 text-3xl font-semibold">{formatNumber(statsBounced)}</p>
            <p className={`text-xs ${bounceRate > 2 ? "text-destructive" : "text-muted-foreground"}`}>
              {formatPercentage(bounceRate)} bounce rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Recipients</span>
            </div>
            <p className="mt-2 text-3xl font-semibold">{formatNumber(campaignLeads.length)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Settings */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sender Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">From Name</span>
              <span className="font-medium">{campaign.from_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">From Email</span>
              <span className="font-medium">{campaign.from_email}</span>
            </div>
            {campaign.reply_to && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reply To</span>
                <span className="font-medium">{campaign.reply_to}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Limit</span>
              <span className="font-medium">{campaign.daily_limit} emails/day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Send Window</span>
              <span className="font-medium">
                {campaign.send_window_start} - {campaign.send_window_end}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Template</span>
              <span className="font-medium">{campaign.email_templates?.name || "None"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipients Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recipients</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {totalLeads} lead{totalLeads !== 1 ? "s" : ""} assigned
            </p>
          </div>
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <Button onClick={() => setAddLeadsOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add Leads
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {campaignLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">
                No recipients yet. Add leads to this campaign to start sending.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => setAddLeadsOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Leads
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {campaignLeads.map((cl) => (
                <div
                  key={cl.id}
                  className="flex items-center justify-between rounded-lg bg-muted p-3"
                >
                  <div>
                    <p className="font-medium">
                      {cl.leads.first_name || cl.leads.last_name
                        ? `${cl.leads.first_name || ""} ${cl.leads.last_name || ""}`.trim()
                        : cl.leads.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {cl.leads.email} {cl.leads.company_name && `- ${cl.leads.company_name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {cl.sent_at && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span>Sent</span>
                      </div>
                    )}
                    {cl.opened_at && (
                      <div className="flex items-center gap-1 text-[#039855]">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Opened</span>
                      </div>
                    )}
                    {cl.clicked_at && (
                      <div className="flex items-center gap-1 text-[#039855]">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        <span>Clicked</span>
                      </div>
                    )}
                    {!cl.sent_at && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Pending</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Leads Dialog */}
      <AddLeadsToCampaignDialog
        open={addLeadsOpen}
        onOpenChange={setAddLeadsOpen}
        campaignId={campaignId}
        onLeadsAdded={fetchCampaign}
      />
    </div>
  );
}
