"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadAdded?: () => void;
}

const industries = [
  "Technology",
  "SaaS",
  "Finance",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Real Estate",
  "Professional Services",
  "Other",
];

export function AddLeadDialog({ open, onOpenChange, onLeadAdded }: AddLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    company_name: "",
    industry: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: insertError } = await supabase.from("leads").insert({
      email: formData.email,
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      company_name: formData.company_name || null,
      industry: formData.industry || null,
      phone: formData.phone || null,
      source: "manual",
      status: "new",
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("A lead with this email already exists.");
      } else {
        setError(insertError.message);
      }
      setLoading(false);
      return;
    }

    // Reset form
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      company_name: "",
      industry: "",
      phone: "",
    });

    setLoading(false);
    onOpenChange(false);
    onLeadAdded?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Manually add a lead to your database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Email <span className="text-destructive">*</span>
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="lead@company.com"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">First Name</label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Last Name</label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Smith"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Company Name</label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Industry</label>
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            >
              <option value="">Select industry...</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Phone</label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
