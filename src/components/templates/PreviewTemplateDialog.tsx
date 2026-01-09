"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, User, Building2, Briefcase, Factory, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface PreviewTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
}

const typeConfig = {
  campaign: { label: "Campaign", variant: "default" as const },
  follow_up: { label: "Follow-up", variant: "secondary" as const },
  warm_up: { label: "Warm-up", variant: "info" as const },
};

const defaultSampleData: Record<string, string> = {
  firstName: "John",
  lastName: "Smith",
  company: "Acme Corp",
  industry: "Technology",
  jobTitle: "CEO",
};

const variableIcons: Record<string, typeof User> = {
  firstName: User,
  lastName: User,
  company: Building2,
  industry: Factory,
  jobTitle: Briefcase,
};

export function PreviewTemplateDialog({
  open,
  onOpenChange,
  template,
}: PreviewTemplateDialogProps) {
  const [sampleData, setSampleData] = useState(defaultSampleData);
  const [showVariables, setShowVariables] = useState(false);

  if (!template) return null;

  const replaceVariables = (text: string): string => {
    return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return sampleData[variable] || match;
    });
  };

  const updateSampleData = (key: string, value: string) => {
    setSampleData(prev => ({ ...prev, [key]: value }));
  };

  const previewSubject = replaceVariables(template.subject);
  const previewBody = replaceVariables(template.body_html || template.body_text || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg">Email Preview</DialogTitle>
              <Badge
                variant={
                  typeConfig[template.template_type as keyof typeof typeConfig]?.variant
                }
              >
                {typeConfig[template.template_type as keyof typeof typeConfig]?.label}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Sample Data Panel */}
        {template.variables && template.variables.length > 0 && (
          <div className="border-b border-border">
            <button
              onClick={() => setShowVariables(!showVariables)}
              className="flex w-full items-center justify-between px-6 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">Sample Data</span>
                <span className="text-xs">({template.variables.length} variables)</span>
              </span>
              {showVariables ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showVariables && (
              <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {template.variables.map((variable) => {
                  const Icon = variableIcons[variable] || User;
                  return (
                    <div key={variable} className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {`{{${variable}}}`}
                      </label>
                      <Input
                        value={sampleData[variable] || ""}
                        onChange={(e) => updateSampleData(variable, e.target.value)}
                        className="h-8 text-sm"
                        placeholder={`Enter ${variable}...`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Email Preview */}
        <div className="flex flex-col max-h-[60vh] overflow-hidden">
          {/* Email Header */}
          <div className="flex-shrink-0 bg-muted/30 px-6 py-4 space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                OP
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Operator OS</span>
                  <span className="text-xs text-muted-foreground">
                    &lt;hello@marketing.operatoros.ai&gt;
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>to</span>
                  <span className="font-medium text-foreground">
                    {sampleData.firstName} {sampleData.lastName}
                  </span>
                  <span>&lt;{sampleData.firstName.toLowerCase()}.{sampleData.lastName.toLowerCase()}@{sampleData.company.toLowerCase().replace(/\s+/g, "")}.com&gt;</span>
                </div>
              </div>
            </div>

            {/* Subject Line */}
            <div className="pl-[52px]">
              <h2 className="text-lg font-semibold text-foreground">{previewSubject}</h2>
            </div>
          </div>

          {/* Email Body */}
          <div className="flex-1 overflow-auto">
            <div className="px-6 py-6 pl-[76px]">
              <div
                className={cn(
                  "text-foreground leading-relaxed",
                  "prose prose-sm max-w-none dark:prose-invert",
                  "[&_p]:mb-4 [&_p:last-child]:mb-0"
                )}
                style={{ whiteSpace: "pre-wrap" }}
              >
                {previewBody.split("\n").map((line, i) => (
                  <p key={i} className={cn(!line.trim() && "h-4")}>
                    {line || "\u00A0"}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span>Template: {template.name}</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
