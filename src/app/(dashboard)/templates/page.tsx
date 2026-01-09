"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Copy, Trash2, Eye, FileText, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate } from "@/lib/utils";
import { TemplateEditorDialog } from "@/components/templates/TemplateEditorDialog";
import { PreviewTemplateDialog } from "@/components/templates/PreviewTemplateDialog";

interface Template {
  id: string;
  name: string;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  template_type: string;
  is_active: boolean;
  variables: string[];
  created_at: string;
}

const typeConfig = {
  campaign: { label: "Campaign", variant: "default" as const },
  follow_up: { label: "Follow-up", variant: "secondary" as const },
  warm_up: { label: "Warm-up", variant: "info" as const },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<Template | null>(null);

  const fetchTemplates = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });

    setTemplates(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handlePreview = (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewingTemplate(template);
    setPreviewOpen(true);
  };

  const handleDuplicate = async (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    const supabase = createClient();
    const { error } = await supabase.from("email_templates").insert({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text,
      template_type: template.template_type,
      variables: template.variables,
      is_active: true,
    });

    if (!error) {
      fetchTemplates();
    }
  };

  const handleDelete = async (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("email_templates").delete().eq("id", template.id);

    if (!error) {
      setTemplates(templates.filter((t) => t.id !== template.id));
      if (selectedTemplate === template.id) {
        setSelectedTemplate(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Email Templates</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage your email templates
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            No templates yet
          </h2>
          <p className="mt-2 max-w-md text-center text-muted-foreground">
            Create your first email template to use in campaigns. Templates support variables like {`{{firstName}}`} and {`{{company}}`}.
          </p>
          <Button className="mt-6" onClick={handleCreateNew}>
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const bodyPreview = (template.body_html || template.body_text || "")
              .replace(/\n+/g, " ")
              .trim()
              .slice(0, 120);

            return (
              <Card
                key={template.id}
                className={cn(
                  "cursor-pointer transition-all overflow-hidden p-0",
                  selectedTemplate === template.id
                    ? "ring-2 ring-ring"
                    : "hover:bg-accent/50"
                )}
                onClick={() => setSelectedTemplate(template.id)}
              >
                {/* Email Preview Header */}
                <div className="bg-muted/50 px-3 py-2.5 border-b border-border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
                        OP
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground truncate">hello@marketing.operatoros.ai</p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        typeConfig[template.template_type as keyof typeof typeConfig]?.variant
                      }
                      className="flex-shrink-0"
                    >
                      {typeConfig[template.template_type as keyof typeof typeConfig]?.label}
                    </Badge>
                  </div>
                </div>

                {/* Email Content */}
                <div className="px-3 py-3">
                  {/* Subject Line */}
                  <div className="flex items-start gap-2 mb-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="font-medium text-foreground text-sm line-clamp-1">{template.subject}</p>
                  </div>

                  {/* Body Preview */}
                  <p className="text-sm text-muted-foreground line-clamp-2 pl-6">
                    {bodyPreview || "No content"}
                    {bodyPreview.length >= 120 && "..."}
                  </p>

                  {/* Variables */}
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-6 mt-2">
                      {template.variables.slice(0, 4).map((variable) => (
                        <span
                          key={variable}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                      {template.variables.length > 4 && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          +{template.variables.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(template.created_at)}
                  </span>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handlePreview(template, e)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleEdit(template, e)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleDuplicate(template, e)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleDelete(template, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={fetchTemplates}
      />
      <PreviewTemplateDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        template={previewingTemplate}
      />
    </div>
  );
}
