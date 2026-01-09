"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, CheckCircle2, Users, Building2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  industry: string | null;
  status: string;
  email_verified: boolean;
}

interface AddLeadsToCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onLeadsAdded?: () => void;
}

export function AddLeadsToCampaignDialog({
  open,
  onOpenChange,
  campaignId,
  onLeadsAdded,
}: AddLeadsToCampaignDialogProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [existingLeadIds, setExistingLeadIds] = useState<Set<string>>(new Set());

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch leads not already in campaign
    let query = supabase
      .from("leads")
      .select("id, email, first_name, last_name, company_name, industry, status, email_verified")
      .not("status", "in", '("unsubscribed","bounced")')
      .order("created_at", { ascending: false })
      .limit(200);

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%`
      );
    }

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    setLeads(data || []);
    setLoading(false);
  }, [search, statusFilter]);

  const fetchExistingLeads = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("campaign_leads")
      .select("lead_id")
      .eq("campaign_id", campaignId);

    setExistingLeadIds(new Set(data?.map((l) => l.lead_id) || []));
  }, [campaignId]);

  useEffect(() => {
    if (open) {
      fetchLeads();
      fetchExistingLeads();
      setSelectedLeads(new Set());
    }
  }, [open, fetchLeads, fetchExistingLeads]);

  const toggleLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const toggleAll = () => {
    const availableLeads = leads.filter((l) => !existingLeadIds.has(l.id));
    if (selectedLeads.size === availableLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(availableLeads.map((l) => l.id)));
    }
  };

  const handleAddLeads = async () => {
    if (selectedLeads.size === 0) return;

    setAdding(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedLeads) }),
      });

      if (response.ok) {
        onOpenChange(false);
        onLeadsAdded?.();
      }
    } catch (error) {
      console.error("Error adding leads:", error);
    }
    setAdding(false);
  };

  const availableLeads = leads.filter((l) => !existingLeadIds.has(l.id));
  const allSelected = availableLeads.length > 0 && selectedLeads.size === availableLeads.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Leads to Campaign</DialogTitle>
          <DialogDescription>
            Select leads to add to this campaign. Already added leads are shown as disabled.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="verified">Verified</option>
            <option value="contacted">Contacted</option>
          </select>
        </div>

        {/* Select All */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <div
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded border",
                allSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input"
              )}
            >
              {allSelected && <CheckCircle2 className="h-3 w-3" />}
            </div>
            Select All ({availableLeads.length} available)
          </button>
          <span className="text-sm text-muted-foreground">
            {selectedLeads.size} selected
          </span>
        </div>

        {/* Leads List */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[400px] space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No leads found</p>
            </div>
          ) : (
            leads.map((lead) => {
              const isExisting = existingLeadIds.has(lead.id);
              const isSelected = selectedLeads.has(lead.id);

              return (
                <button
                  key={lead.id}
                  onClick={() => !isExisting && toggleLead(lead.id)}
                  disabled={isExisting}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors",
                    isExisting
                      ? "cursor-not-allowed opacity-50 bg-muted/30"
                      : isSelected
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border flex-shrink-0",
                      isExisting
                        ? "border-muted-foreground/30 bg-muted"
                        : isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    )}
                  >
                    {(isSelected || isExisting) && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {lead.first_name || lead.last_name
                          ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim()
                          : lead.email}
                      </span>
                      {isExisting && (
                        <Badge variant="secondary" className="text-xs">
                          Already added
                        </Badge>
                      )}
                      {lead.email_verified && (
                        <Badge variant="success" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </span>
                      {lead.company_name && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3" />
                          {lead.company_name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddLeads}
            disabled={selectedLeads.size === 0 || adding}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            Add {selectedLeads.size} Lead{selectedLeads.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
