"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Flame,
  Plus,
  Loader2,
  Play,
  Pause,
  TrendingUp,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { formatNumber, formatPercentage, formatDate } from "@/lib/utils";

interface DomainWarmup {
  id: string;
  domain: string;
  warmup_started_at: string;
  current_daily_limit: number;
  target_daily_limit: number;
  warmup_day: number;
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  deliverability_rate: number | null;
  is_healthy: boolean;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  completed: { label: "Completed", variant: "default" },
  unhealthy: { label: "Unhealthy", variant: "destructive" },
};

const warmupSchedule = [
  { day: 1, limit: 10 },
  { day: 3, limit: 20 },
  { day: 5, limit: 35 },
  { day: 7, limit: 50 },
  { day: 10, limit: 75 },
  { day: 14, limit: 125 },
  { day: 18, limit: 175 },
  { day: 21, limit: 250 },
  { day: 25, limit: 350 },
  { day: 28, limit: 450 },
  { day: 32, limit: 600 },
  { day: 35, limit: 750 },
  { day: 40, limit: 900 },
  { day: 45, limit: 1000 },
];

interface ScheduleStatus {
  active: boolean;
  schedule: {
    scheduleId: string;
    cron: string;
  } | null;
}

export default function WarmupPage() {
  const [warmups, setWarmups] = useState<DomainWarmup[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [targetLimit, setTargetLimit] = useState(1000);
  const [adding, setAdding] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus | null>(null);
  const [togglingSchedule, setTogglingSchedule] = useState(false);
  const [runningManual, setRunningManual] = useState(false);

  const fetchWarmups = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("domain_warmup")
      .select("*")
      .order("created_at", { ascending: false });

    setWarmups(data || []);
    setLoading(false);
  }, []);

  const fetchScheduleStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/warmup/schedule");
      if (response.ok) {
        const data = await response.json();
        setScheduleStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch schedule status:", error);
    }
  }, []);

  useEffect(() => {
    fetchWarmups();
    fetchScheduleStatus();
  }, [fetchWarmups, fetchScheduleStatus]);

  const handleAddDomain = async () => {
    if (!newDomain) return;
    setAdding(true);

    const supabase = createClient();
    const { error } = await supabase.from("domain_warmup").insert({
      domain: newDomain,
      target_daily_limit: targetLimit,
      current_daily_limit: 10,
      warmup_day: 1,
      status: "active",
    });

    if (!error) {
      setNewDomain("");
      setTargetLimit(1000);
      setAddOpen(false);
      fetchWarmups();
    }

    setAdding(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const supabase = createClient();
    await supabase
      .from("domain_warmup")
      .update({ status: newStatus })
      .eq("id", id);

    setWarmups(warmups.map((w) => (w.id === id ? { ...w, status: newStatus } : w)));
  };

  const handleToggleSchedule = async () => {
    setTogglingSchedule(true);
    try {
      if (scheduleStatus?.active) {
        await fetch("/api/warmup/schedule", { method: "DELETE" });
      } else {
        await fetch("/api/warmup/schedule", { method: "POST" });
      }
      await fetchScheduleStatus();
    } catch (error) {
      console.error("Failed to toggle schedule:", error);
    }
    setTogglingSchedule(false);
  };

  const handleRunManual = async () => {
    setRunningManual(true);
    try {
      await fetch("/api/warmup/progress", { method: "POST" });
      await fetchWarmups();
    } catch (error) {
      console.error("Failed to run manual progression:", error);
    }
    setRunningManual(false);
  };

  const getProgressPercentage = (warmup: DomainWarmup) => {
    return Math.min(100, (warmup.current_daily_limit / warmup.target_daily_limit) * 100);
  };

  const getExpectedLimit = (day: number): number => {
    for (let i = warmupSchedule.length - 1; i >= 0; i--) {
      if (day >= warmupSchedule[i].day) {
        return warmupSchedule[i].limit;
      }
    }
    return 10;
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
          <h1 className="text-3xl font-semibold text-foreground">Domain Warm-up</h1>
          <p className="mt-1 text-muted-foreground">
            Gradually increase sending volume to build sender reputation
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Domain
        </Button>
      </div>

      {/* Warmup Schedule Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Warm-up Schedule</CardTitle>
            </div>
            <CardDescription>
              Automatic daily limit increases based on deliverability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {warmupSchedule.map((step) => (
                <div
                  key={step.day}
                  className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs"
                >
                  <span className="text-muted-foreground">Day {step.day}:</span>
                  <span className="font-medium">{step.limit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Automatic Progression</CardTitle>
            </div>
            <CardDescription>
              Daily automatic updates to domain limits and health checks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Scheduler Status</p>
                <p className="text-xs text-muted-foreground">
                  {scheduleStatus?.active
                    ? "Running daily at 6 AM UTC"
                    : "Scheduler is disabled"}
                </p>
              </div>
              <Badge variant={scheduleStatus?.active ? "success" : "default"}>
                {scheduleStatus?.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleSchedule}
                disabled={togglingSchedule}
              >
                {togglingSchedule ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : scheduleStatus?.active ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {scheduleStatus?.active ? "Disable" : "Enable"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunManual}
                disabled={runningManual}
              >
                {runningManual ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Run Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Domain List */}
      {warmups.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <Flame className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            No domains warming up
          </h2>
          <p className="mt-2 max-w-md text-center text-muted-foreground">
            Add a domain to start the warm-up process. This gradually increases sending limits to build reputation.
          </p>
          <Button className="mt-6" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Domain
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {warmups.map((warmup) => {
            const progress = getProgressPercentage(warmup);
            const deliverability = warmup.total_sent > 0
              ? ((warmup.total_delivered / warmup.total_sent) * 100)
              : 100;
            const bounceRate = warmup.total_sent > 0
              ? ((warmup.total_bounced / warmup.total_sent) * 100)
              : 0;

            return (
              <Card key={warmup.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{warmup.domain}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Day {warmup.warmup_day} - Started {formatDate(warmup.warmup_started_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusConfig[warmup.status]?.variant}>
                        {statusConfig[warmup.status]?.label}
                      </Badge>
                      {!warmup.is_healthy && (
                        <Badge variant="destructive">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Issues
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress bar */}
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted-foreground">Daily Limit Progress</span>
                      <span className="font-medium">
                        {warmup.current_daily_limit} / {warmup.target_daily_limit}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-[#039855] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="text-xs">Sent</span>
                      </div>
                      <p className="text-lg font-semibold">{formatNumber(warmup.total_sent)}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="text-xs">Delivered</span>
                      </div>
                      <p className="text-lg font-semibold text-[#039855]">
                        {formatPercentage(deliverability)}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="text-xs">Bounced</span>
                      </div>
                      <p className={`text-lg font-semibold ${bounceRate > 2 ? "text-destructive" : ""}`}>
                        {formatPercentage(bounceRate)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-border pt-4">
                    {warmup.status === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(warmup.id, "paused")}
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                    ) : warmup.status === "paused" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(warmup.id, "active")}
                      >
                        <Play className="h-4 w-4" />
                        Resume
                      </Button>
                    ) : null}
                    <span className="flex-1 text-right text-xs text-muted-foreground">
                      Expected: {getExpectedLimit(warmup.warmup_day)} emails/day
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Domain Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Domain to Warm-up</DialogTitle>
            <DialogDescription>
              Start warming up a new sending domain to build reputation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Domain</label>
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="marketing.operatoros.ai"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The domain you want to warm up for sending
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Target Daily Limit</label>
              <Input
                type="number"
                value={targetLimit}
                onChange={(e) => setTargetLimit(parseInt(e.target.value) || 1000)}
                min={100}
                max={10000}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Maximum emails per day after warm-up completes
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDomain} disabled={!newDomain || adding}>
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}
              Start Warm-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
