"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Send,
  MousePointer,
  AlertTriangle,
  CheckCircle2,
  Eye,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { formatNumber, formatPercentage, formatDate } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_leads: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  started_at: string | null;
  created_at: string;
}

interface CampaignLead {
  id: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  opened_count: number;
  clicked_count: number;
  lead: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  };
}

interface DailyStats {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
  pending: { label: "Pending", variant: "secondary" },
  sent: { label: "Sent", variant: "default" },
  delivered: { label: "Delivered", variant: "success" },
  opened: { label: "Opened", variant: "success" },
  clicked: { label: "Clicked", variant: "success" },
  bounced: { label: "Bounced", variant: "destructive" },
  failed: { label: "Failed", variant: "destructive" },
};

export default function CampaignAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    // Fetch campaign
    const { data: campaignData } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignData) {
      setCampaign(campaignData);
    }

    // Fetch campaign leads with engagement data
    const { data: leadsData } = await supabase
      .from("campaign_leads")
      .select(`
        id,
        status,
        sent_at,
        delivered_at,
        opened_at,
        clicked_at,
        opened_count,
        clicked_count,
        lead:leads(email, first_name, last_name, company_name)
      `)
      .eq("campaign_id", campaignId)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(100);

    if (leadsData) {
      setCampaignLeads(leadsData as unknown as CampaignLead[]);
    }

    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <Link href="/campaigns">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate rates
  const deliveryRate = campaign.sent_count > 0
    ? (campaign.delivered_count / campaign.sent_count) * 100
    : 0;
  const openRate = campaign.delivered_count > 0
    ? (campaign.opened_count / campaign.delivered_count) * 100
    : 0;
  const clickRate = campaign.opened_count > 0
    ? (campaign.clicked_count / campaign.opened_count) * 100
    : 0;
  const bounceRate = campaign.sent_count > 0
    ? (campaign.bounced_count / campaign.sent_count) * 100
    : 0;
  const unsubscribeRate = campaign.delivered_count > 0
    ? (campaign.unsubscribed_count / campaign.delivered_count) * 100
    : 0;

  // Engagement breakdown
  const engaged = campaign.opened_count;
  const notEngaged = campaign.delivered_count - campaign.opened_count;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/campaigns/${campaignId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{campaign.name}</h1>
          <p className="mt-1 text-muted-foreground">
            Campaign Analytics and Performance
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="mt-1 text-3xl font-semibold text-foreground">
                  {formatPercentage(deliveryRate)}
                </p>
              </div>
              <div className={`rounded-full p-3 ${deliveryRate >= 95 ? "bg-[#039855]/10 text-[#039855]" : "bg-[#dc6803]/10 text-[#dc6803]"}`}>
                <Send className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatNumber(campaign.delivered_count)} of {formatNumber(campaign.sent_count)} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="mt-1 text-3xl font-semibold text-foreground">
                  {formatPercentage(openRate)}
                </p>
              </div>
              <div className={`rounded-full p-3 ${openRate >= 20 ? "bg-[#039855]/10 text-[#039855]" : "bg-muted text-muted-foreground"}`}>
                <Eye className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs">
              {openRate >= 20 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-[#039855]" />
                  <span className="text-[#039855]">Above average</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Below 20% benchmark</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="mt-1 text-3xl font-semibold text-foreground">
                  {formatPercentage(clickRate)}
                </p>
              </div>
              <div className={`rounded-full p-3 ${clickRate >= 3 ? "bg-[#039855]/10 text-[#039855]" : "bg-muted text-muted-foreground"}`}>
                <MousePointer className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatNumber(campaign.clicked_count)} total clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bounce Rate</p>
                <p className="mt-1 text-3xl font-semibold text-foreground">
                  {formatPercentage(bounceRate)}
                </p>
              </div>
              <div className={`rounded-full p-3 ${bounceRate <= 2 ? "bg-[#039855]/10 text-[#039855]" : "bg-destructive/10 text-destructive"}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs">
              {bounceRate <= 2 ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-[#039855]" />
                  <span className="text-[#039855]">Healthy</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  <span className="text-destructive">Above 2% threshold</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Email Funnel</CardTitle>
            </div>
            <CardDescription>How recipients moved through the funnel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Sent */}
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sent</span>
                  <span className="font-medium">{formatNumber(campaign.sent_count)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-full bg-foreground" />
                </div>
              </div>

              {/* Delivered */}
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivered</span>
                  <span className="font-medium">{formatNumber(campaign.delivered_count)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-[#039855]"
                    style={{ width: `${deliveryRate}%` }}
                  />
                </div>
              </div>

              {/* Opened */}
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Opened</span>
                  <span className="font-medium">{formatNumber(campaign.opened_count)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-[#0086c9]"
                    style={{ width: campaign.sent_count > 0 ? `${(campaign.opened_count / campaign.sent_count) * 100}%` : "0%" }}
                  />
                </div>
              </div>

              {/* Clicked */}
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Clicked</span>
                  <span className="font-medium">{formatNumber(campaign.clicked_count)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-[#7c3aed]"
                    style={{ width: campaign.sent_count > 0 ? `${(campaign.clicked_count / campaign.sent_count) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Engagement Breakdown</CardTitle>
            </div>
            <CardDescription>How recipients interacted with your email</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#039855]/10 p-4 text-center">
                  <p className="text-2xl font-semibold text-[#039855]">
                    {formatNumber(engaged)}
                  </p>
                  <p className="text-sm text-[#039855]/80">Engaged</p>
                </div>
                <div className="rounded-xl bg-muted p-4 text-center">
                  <p className="text-2xl font-semibold text-muted-foreground">
                    {formatNumber(notEngaged)}
                  </p>
                  <p className="text-sm text-muted-foreground">Not Engaged</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#039855]" />
                    Opened
                  </span>
                  <span>{formatNumber(campaign.opened_count)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#0086c9]" />
                    Clicked
                  </span>
                  <span>{formatNumber(campaign.clicked_count)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-destructive" />
                    Bounced
                  </span>
                  <span>{formatNumber(campaign.bounced_count)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#dc6803]" />
                    Unsubscribed
                  </span>
                  <span>{formatNumber(campaign.unsubscribed_count)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Engagement */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Recent Engagement</CardTitle>
          </div>
          <CardDescription>Individual recipient activity</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {campaignLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Mail className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No emails sent yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Opens</TableHead>
                  <TableHead>Clicks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignLeads.map((cl) => (
                  <TableRow key={cl.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {cl.lead.first_name || cl.lead.last_name
                            ? `${cl.lead.first_name || ""} ${cl.lead.last_name || ""}`.trim()
                            : "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">{cl.lead.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[cl.status]?.variant || "default"}>
                        {statusConfig[cl.status]?.label || cl.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {cl.sent_at ? formatDate(cl.sent_at) : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {cl.opened_count > 0 ? (
                        <span className="text-sm font-medium text-[#039855]">
                          {cl.opened_count}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cl.clicked_count > 0 ? (
                        <span className="text-sm font-medium text-[#0086c9]">
                          {cl.clicked_count}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
