"use client";

import { useState, useEffect } from "react";
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

interface Template {
  id: string;
  name: string;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  template_type: string;
  is_active: boolean;
  variables: string[];
}

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  onSave?: () => void;
}

const templateTypes = [
  { value: "campaign", label: "Campaign" },
  { value: "follow_up", label: "Follow-up" },
  { value: "warm_up", label: "Warm-up" },
];

const availableVariables = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "company", label: "Company" },
  { key: "industry", label: "Industry" },
  { key: "jobTitle", label: "Job Title" },
];

export function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  onSave,
}: TemplateEditorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body_html: "",
    body_text: "",
    template_type: "campaign",
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        subject: template.subject,
        body_html: template.body_html || "",
        body_text: template.body_text || "",
        template_type: template.template_type,
      });
    } else {
      setFormData({
        name: "",
        subject: "",
        body_html: "",
        body_text: "",
        template_type: "campaign",
      });
    }
  }, [template, open]);

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const variables = extractVariables(formData.subject + formData.body_html + formData.body_text);

    const templateData = {
      name: formData.name,
      subject: formData.subject,
      body_html: formData.body_html || null,
      body_text: formData.body_text || null,
      template_type: formData.template_type,
      variables,
      is_active: true,
    };

    let result;
    if (template) {
      result = await supabase
        .from("email_templates")
        .update(templateData)
        .eq("id", template.id);
    } else {
      result = await supabase.from("email_templates").insert(templateData);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onOpenChange(false);
    onSave?.();
  };

  const insertVariable = (variable: string) => {
    setFormData({ ...formData, body_html: formData.body_html + `{{${variable}}}` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create New Template"}</DialogTitle>
          <DialogDescription>
            {template
              ? "Update your email template details."
              : "Create a new email template for your campaigns."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Template Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Welcome Email"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Template Type</label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.template_type}
                onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
              >
                {templateTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Subject Line <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Quick question about {{company}}"
              required
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">
                Email Body (HTML) <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-wrap gap-1">
                {availableVariables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className="rounded bg-secondary px-2 py-0.5 text-xs text-foreground hover:bg-secondary/80"
                    onClick={() => insertVariable(v.key)}
                  >
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              name="body_html"
              className="flex min-h-[200px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.body_html}
              onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
              placeholder={`Hi {{firstName}},\n\nI noticed that {{company}} is doing great work in the {{industry}} space.\n\nI'd love to discuss how we can help you...\n\nBest,\nYour Name`}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Plain Text Version (optional)</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.body_text}
              onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
              placeholder="Plain text fallback for email clients that don't support HTML..."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {template ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
