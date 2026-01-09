"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Play, Pause, BarChart3, MoreHorizontal, Send, Loader2, Trash2, Copy, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber, formatPercentage, calculateRate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Campaign {
  id: string;
  name: string;
  status: string;
  template_id: string | null;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  daily_limit: number;
  created_at: string;
  email_templates?: { name: string } | null;
  campaign_leads?: { count: number }[];
}

const statusConfig = {
  draft: { label: "Draft", variant: "secondary" as const },
  scheduled: { label: "Scheduled", variant: "info" as const },
  active: { label: "Active", variant: "success" as const },
  paused: { label: "Paused", variant: "warning" as const },
  completed: { label: "Completed", variant: "default" as const },
  cancelled: { label: "Cancelled", variant: "destructive" as const },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("campaigns")
      .select(`
        *,
        email_templates (name),
        campaign_leads (count)
      `)
      .order("created_at", { ascending: false });

    setCampaigns(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("campaigns")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      setCampaigns(campaigns.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) return;

    const supabase = createClient();
    const { error } = await supabase.from("campaigns").delete().eq("id", id);

    if (!error) {
      setCampaigns(campaigns.filter((c) => c.id !== id));
    }
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    const supabase = createClient();
    const { error } = await supabase.from("campaigns").insert({
      name: `${campaign.name} (Copy)`,
      template_id: campaign.template_id,
      status: "draft",
      daily_limit: campaign.daily_limit,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
    });

    if (!error) {
      fetchCampaigns();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Campaigns</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your email outreach campaigns
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            No campaigns yet
          </h2>
          <p className="mt-2 max-w-md text-center text-muted-foreground">
            Create your first campaign to start sending emails to your leads.
          </p>
          <Link href="/campaigns/new" className="mt-6">
            <Button>
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const totalLeads = campaign.campaign_leads?.[0]?.count || 0;
            const sentCount = campaign.sent_count || 0;
            const deliveredCount = campaign.delivered_count || 0;
            const openedCount = campaign.opened_count || 0;
            const clickedCount = campaign.clicked_count || 0;
            const openRate = calculateRate(openedCount, deliveredCount);
            const clickRate = calculateRate(clickedCount, deliveredCount);
            const progress = totalLeads > 0 ? calculateRate(sentCount, totalLeads) : 0;

            return (
              <Card key={campaign.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg text-foreground">{campaign.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {campaign.email_templates?.name || "No template"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          statusConfig[
                            campaign.status as keyof typeof statusConfig
                          ]?.variant
                        }
                      >
                        {
                          statusConfig[
                            campaign.status as keyof typeof statusConfig
                          ]?.label
                        }
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/campaigns/${campaign.id}`}>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/campaigns/${campaign.id}/settings`}>
                              <Settings className="mr-2 h-4 w-4" />
                              Settings
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateCampaign(campaign)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Campaign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-foreground">
                        {formatNumber(sentCount)} /{" "}
                        {formatNumber(totalLeads)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-foreground transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatNumber(sentCount)}
                      </p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatNumber(deliveredCount)}
                      </p>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatPercentage(openRate)}
                      </p>
                      <p className="text-xs text-muted-foreground">Open Rate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatPercentage(clickRate)}
                      </p>
                      <p className="text-xs text-muted-foreground">Click Rate</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                    {campaign.status === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(campaign.id, "paused")}
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                    ) : campaign.status === "paused" ||
                      campaign.status === "draft" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(campaign.id, "active")}
                      >
                        <Play className="h-4 w-4" />
                        {campaign.status === "draft" ? "Start" : "Resume"}
                      </Button>
                    ) : null}
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
