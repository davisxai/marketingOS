"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Send,
  Mail,
  MousePointerClick,
  TrendingUp,
  AlertCircle,
  Plus,
  Play,
} from "lucide-react";
import { StatsCard } from "@/components/shared/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalLeads: number;
  activeCampaigns: number;
  emailsSent: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  stats_sent: number;
  stats_opened: number;
  stats_clicked: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeCampaigns: 0,
    emailsSent: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Fetch lead count
      const { count: leadCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

      // Fetch active campaigns
      const { count: activeCampaignCount } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch all campaigns for recent list
      const { data: recentCampaigns } = await supabase
        .from("campaigns")
        .select("id, name, status, stats_sent, stats_opened, stats_clicked")
        .order("created_at", { ascending: false })
        .limit(5);

      // Calculate totals
      const totalSent = recentCampaigns?.reduce((sum, c) => sum + (c.stats_sent || 0), 0) || 0;
      const totalOpened = recentCampaigns?.reduce((sum, c) => sum + (c.stats_opened || 0), 0) || 0;
      const totalClicked = recentCampaigns?.reduce((sum, c) => sum + (c.stats_clicked || 0), 0) || 0;

      setStats({
        totalLeads: leadCount || 0,
        activeCampaigns: activeCampaignCount || 0,
        emailsSent: totalSent,
        openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
        bounceRate: 0,
      });

      setCampaigns(recentCampaigns || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  const hasNoData = stats.totalLeads === 0 && campaigns.length === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your email outreach performance
        </p>
      </div>

      {/* Empty State */}
      {!loading && hasNoData ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            Welcome to Email Blaster
          </h2>
          <p className="mt-2 max-w-md text-center text-muted-foreground">
            Get started by importing leads or running an actor to scrape them. Then create a campaign to start sending.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/leads">
              <Button variant="outline">
                <Plus className="h-4 w-4" />
                Import Leads
              </Button>
            </Link>
            <Link href="/actors">
              <Button>
                <Play className="h-4 w-4" />
                Run Actor
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatsCard title="Total Leads" value={stats.totalLeads} icon={Users} />
            <StatsCard
              title="Active Campaigns"
              value={stats.activeCampaigns}
              icon={Send}
            />
            <StatsCard title="Emails Sent" value={stats.emailsSent} icon={Mail} />
            <StatsCard
              title="Open Rate"
              value={stats.openRate}
              format="percentage"
              icon={TrendingUp}
            />
            <StatsCard
              title="Click Rate"
              value={stats.clickRate}
              format="percentage"
              icon={MousePointerClick}
            />
            <StatsCard
              title="Bounce Rate"
              value={stats.bounceRate}
              format="percentage"
              icon={AlertCircle}
            />
          </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Campaigns</CardTitle>
              <Link href="/campaigns/new">
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  New Campaign
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Send className="h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No campaigns yet. Create your first campaign to start sending.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between rounded-lg bg-muted p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            campaign.status === "active"
                              ? "bg-[#039855]"
                              : "bg-muted-foreground"
                          )}
                        />
                        <div>
                          <p className="font-medium text-foreground">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {campaign.stats_sent || 0} sent
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground">Opened</p>
                          <p className="font-medium text-foreground">{campaign.stats_opened || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Clicked</p>
                          <p className="font-medium text-foreground">{campaign.stats_clicked || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
