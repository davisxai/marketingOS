"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Upload,
  MoreHorizontal,
  CheckCircle,
  Clock,
  Users,
  Play,
  Loader2,
  Trash2,
  Mail,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { AddLeadDialog } from "@/components/leads/AddLeadDialog";
import { ImportLeadsDialog } from "@/components/leads/ImportLeadsDialog";

interface Lead {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  industry: string | null;
  status: string;
  email_verified: boolean;
  email_verification_status: string | null;
  source: string | null;
  created_at: string;
}

const statusConfig = {
  new: { label: "New", variant: "info" as const },
  verified: { label: "Verified", variant: "success" as const },
  contacted: { label: "Contacted", variant: "warning" as const },
  converted: { label: "Converted", variant: "success" as const },
  unsubscribed: { label: "Unsubscribed", variant: "destructive" as const },
  bounced: { label: "Bounced", variant: "destructive" as const },
};

const sourceConfig: Record<string, string> = {
  linkedin: "LinkedIn",
  google_maps: "Google Maps",
  apollo: "Apollo",
  import: "Import",
  manual: "Manual",
};

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [verifyingLead, setVerifyingLead] = useState<string | null>(null);
  const [verifyingAll, setVerifyingAll] = useState(false);

  const fetchLeads = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("leads").delete().eq("id", id);

    if (!error) {
      setLeads(leads.filter((l) => l.id !== id));
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      setLeads(leads.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
    }
  };

  const handleVerifyEmail = async (leadId: string) => {
    setVerifyingLead(leadId);
    try {
      const response = await fetch("/api/leads/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: [leadId] }),
      });

      if (response.ok) {
        // Update local state to show pending
        setLeads(leads.map((l) =>
          l.id === leadId
            ? { ...l, email_verification_status: "pending" }
            : l
        ));
      }
    } catch (error) {
      console.error("Failed to queue verification:", error);
    }
    setVerifyingLead(null);
  };

  const handleVerifyAll = async () => {
    const unverifiedCount = leads.filter(
      (l) => !l.email_verified && l.email_verification_status !== "pending"
    ).length;

    if (unverifiedCount === 0) {
      alert("No unverified leads to verify.");
      return;
    }

    if (!confirm(`Queue ${unverifiedCount} leads for email verification?`)) {
      return;
    }

    setVerifyingAll(true);
    try {
      const response = await fetch("/api/leads/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifyAll: true }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Queued ${data.queued} leads for verification.`);
        // Refresh leads to show updated status
        fetchLeads();
      }
    } catch (error) {
      console.error("Failed to queue bulk verification:", error);
    }
    setVerifyingAll(false);
  };

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.email.toLowerCase().includes(query) ||
      lead.first_name?.toLowerCase().includes(query) ||
      lead.last_name?.toLowerCase().includes(query) ||
      lead.company_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Leads</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your lead database and contacts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleVerifyAll}
            disabled={verifyingAll}
          >
            {verifyingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Verify All
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            No leads yet
          </h2>
          <p className="mt-2 max-w-md text-center text-muted-foreground">
            Import leads from a CSV file or run an actor to start scraping new leads.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
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
          {/* Filters */}
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          </Card>

          {/* Leads Table */}
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {lead.first_name || lead.last_name
                            ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim()
                            : "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-foreground">{lead.company_name || "-"}</p>
                        <p className="text-sm text-muted-foreground">{lead.industry || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusConfig[lead.status as keyof typeof statusConfig]
                            ?.variant || "default"
                        }
                      >
                        {statusConfig[lead.status as keyof typeof statusConfig]
                          ?.label || lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {lead.email_verified || lead.email_verification_status === "valid" ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-[#039855]" />
                            <span className="text-sm text-[#039855]">Verified</span>
                          </>
                        ) : lead.email_verification_status === "invalid" ? (
                          <>
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span className="text-sm text-destructive">Invalid</span>
                          </>
                        ) : lead.email_verification_status === "risky" ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-[#dc6803]" />
                            <span className="text-sm text-[#dc6803]">Risky</span>
                          </>
                        ) : lead.email_verification_status === "pending" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Verifying</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Not Verified</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">
                        {sourceConfig[lead.source || ""] || lead.source || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(lead.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!lead.email_verified && lead.email_verification_status !== "pending" && (
                            <DropdownMenuItem
                              onClick={() => handleVerifyEmail(lead.id)}
                              disabled={verifyingLead === lead.id}
                            >
                              {verifyingLead === lead.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <ShieldCheck className="mr-2 h-4 w-4" />
                              )}
                              Verify Email
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleStatusChange(lead.id, "verified")}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Mark as Verified
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(lead.id, "contacted")}>
                            <Mail className="mr-2 h-4 w-4" />
                            Mark as Contacted
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteLead(lead.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Lead
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Dialogs */}
      <AddLeadDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onLeadAdded={fetchLeads}
      />
      <ImportLeadsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={fetchLeads}
      />
    </div>
  );
}
