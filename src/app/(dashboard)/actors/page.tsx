"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Map,
  Linkedin,
  Database,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn, formatNumber } from "@/lib/utils";

interface Actor {
  id: string;
  name: string;
  description: string;
  icon: typeof Map;
  category: string;
}

interface Run {
  id: string;
  actor_type: string;
  search_query: string;
  status: string;
  total_results: number | null;
  processed_count: number;
  leads_created: number;
  started_at: string | null;
  completed_at: string | null;
}

const actors: Actor[] = [
  {
    id: "google_maps",
    name: "Google Maps Scraper",
    description: "Extract business listings with contact info, reviews, and location data from Google Maps",
    icon: Map,
    category: "Lead Generation",
  },
  {
    id: "google_search",
    name: "Google Search Scraper",
    description: "Find business contact pages and extract emails from Google Search results using SerpAPI",
    icon: Search,
    category: "Lead Generation",
  },
  {
    id: "apollo",
    name: "Apollo.io Extractor",
    description: "Get verified B2B contacts with emails, job titles, and company data from Apollo",
    icon: Database,
    category: "B2B Data",
  },
  {
    id: "linkedin_sales_nav",
    name: "LinkedIn Sales Navigator",
    description: "Scrape decision makers and company info from LinkedIn Sales Navigator searches",
    icon: Linkedin,
    category: "B2B Data",
  },
];

const statusConfig = {
  pending: { label: "Queued", variant: "secondary" as const, icon: Clock },
  running: { label: "Running", variant: "info" as const, icon: Loader2 },
  completed: { label: "Completed", variant: "success" as const, icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive" as const, icon: XCircle },
};

export default function ActorsPage() {
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    async function fetchRuns() {
      const supabase = createClient();
      const { data } = await supabase
        .from("scraper_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      setRuns(data || []);
      setLoading(false);
    }

    fetchRuns();
  }, []);

  const handleRunActor = async () => {
    if (!selectedActor || !searchQuery) return;

    setStarting(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("scraper_jobs")
      .insert({
        scraper_type: selectedActor,
        search_query: searchQuery,
        location: location || null,
        status: "pending",
      })
      .select()
      .single();

    if (!error && data) {
      setRuns((prev) => [data, ...prev]);
      setSearchQuery("");
      setLocation("");
      setSelectedActor(null);
    }

    setStarting(false);
  };

  const getActorInfo = (type: string) => actors.find((a) => a.id === type);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Actors</h1>
        <p className="mt-1 text-muted-foreground">
          Pre-built scrapers for lead generation
        </p>
      </div>

      {/* Actor Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {actors.map((actor) => {
          const Icon = actor.icon;
          const isSelected = selectedActor === actor.id;

          return (
            <button
              key={actor.id}
              onClick={() => setSelectedActor(isSelected ? null : actor.id)}
              className={cn(
                "group flex flex-col rounded-xl p-5 text-left transition-all",
                isSelected
                  ? "bg-accent ring-2 ring-ring"
                  : "bg-card hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "rounded-lg p-2.5",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{actor.name}</h3>
                  <Badge variant="secondary" className="mt-1">{actor.category}</Badge>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                {actor.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Run Actor Panel */}
      {selectedActor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Run {getActorInfo(selectedActor)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Search Query
                </label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., IT services, marketing agencies..."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Location (optional)
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Austin TX, New York..."
                />
              </div>
            </div>

            <Button onClick={handleRunActor} disabled={!searchQuery || starting}>
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Run
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-medium text-foreground">No runs yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Select an actor above and start your first run to begin scraping leads.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => {
                const actor = getActorInfo(run.actor_type);
                const status = statusConfig[run.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = status.icon;
                const progress = run.total_results && run.total_results > 0
                  ? (run.processed_count / run.total_results) * 100
                  : 0;

                return (
                  <div
                    key={run.id}
                    className="rounded-lg bg-muted p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {actor && (
                          <div className="rounded-lg bg-background p-2">
                            <actor.icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{run.search_query}</p>
                            <Badge variant={status.variant}>
                              <StatusIcon className={cn(
                                "mr-1 h-3 w-3",
                                run.status === "running" && "animate-spin"
                              )} />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {actor?.name || run.actor_type}
                          </p>
                        </div>
                      </div>

                      {run.leads_created > 0 && (
                        <div className="text-right">
                          <p className="text-lg font-semibold text-[#039855]">
                            +{formatNumber(run.leads_created)}
                          </p>
                          <p className="text-xs text-muted-foreground">leads</p>
                        </div>
                      )}
                    </div>

                    {run.status === "running" && run.total_results && (
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{run.processed_count} / {run.total_results}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-background">
                          <div
                            className="h-full bg-foreground transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
