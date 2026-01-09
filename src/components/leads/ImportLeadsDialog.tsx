"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ParsedLead {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  industry?: string;
  phone?: string;
}

export function ImportLeadsDialog({ open, onOpenChange, onImportComplete }: ImportLeadsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedLead[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "complete">("upload");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: number }>({ imported: 0, skipped: 0, errors: 0 });

  const leadFields = [
    { key: "email", label: "Email", required: true },
    { key: "first_name", label: "First Name", required: false },
    { key: "last_name", label: "Last Name", required: false },
    { key: "company_name", label: "Company Name", required: false },
    { key: "industry", label: "Industry", required: false },
    { key: "phone", label: "Phone", required: false },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length === 0) return;

      // Parse headers
      const headerLine = lines[0];
      const csvHeaders = headerLine.split(",").map((h) => h.trim().replace(/"/g, ""));
      setHeaders(csvHeaders);

      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      csvHeaders.forEach((header) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes("email")) autoMapping[header] = "email";
        else if (lowerHeader.includes("first") && lowerHeader.includes("name")) autoMapping[header] = "first_name";
        else if (lowerHeader.includes("last") && lowerHeader.includes("name")) autoMapping[header] = "last_name";
        else if (lowerHeader.includes("company")) autoMapping[header] = "company_name";
        else if (lowerHeader.includes("industry")) autoMapping[header] = "industry";
        else if (lowerHeader.includes("phone")) autoMapping[header] = "phone";
      });
      setColumnMapping(autoMapping);

      // Parse data rows
      const data: ParsedLead[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
        const row: Record<string, string> = {};
        csvHeaders.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        if (row[csvHeaders[0]]) {
          data.push(row as unknown as ParsedLead);
        }
      }
      setParsedData(data);
      setStep("mapping");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    setStep("importing");

    const supabase = createClient();
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Map data using column mapping
    const mappedData = parsedData.map((row) => {
      const mapped: Record<string, string | null> = {};
      Object.entries(columnMapping).forEach(([csvColumn, leadField]) => {
        if (leadField && leadField !== "skip") {
          mapped[leadField] = (row as unknown as Record<string, string>)[csvColumn] || null;
        }
      });
      return mapped;
    });

    // Import in batches
    const batchSize = 50;
    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);

      for (const lead of batch) {
        if (!lead.email) {
          skipped++;
          continue;
        }

        const { error } = await supabase.from("leads").insert({
          email: lead.email,
          first_name: lead.first_name || null,
          last_name: lead.last_name || null,
          company_name: lead.company_name || null,
          industry: lead.industry || null,
          phone: lead.phone || null,
          source: "import",
          status: "new",
        });

        if (error) {
          if (error.code === "23505") {
            skipped++; // Duplicate
          } else {
            errors++;
          }
        } else {
          imported++;
        }
      }
    }

    setImportResult({ imported, skipped, errors });
    setImporting(false);
    setStep("complete");
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setColumnMapping({});
    setStep("upload");
    setImportResult({ imported: 0, skipped: 0, errors: 0 });
    onOpenChange(false);
    if (step === "complete") {
      onImportComplete?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import leads into your database.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 transition-colors hover:border-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium">Click to upload or drag and drop</p>
              <p className="mt-1 text-xs text-muted-foreground">CSV files only</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">{file?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{parsedData.length} rows</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setFile(null);
                    setParsedData([]);
                    setHeaders([]);
                    setStep("upload");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-[300px] space-y-3 overflow-y-auto">
              <p className="text-sm font-medium">Map CSV columns to lead fields:</p>
              {headers.map((header) => (
                <div key={header} className="flex items-center justify-between gap-4">
                  <span className="min-w-[150px] truncate text-sm">{header}</span>
                  <select
                    className="flex h-9 w-full max-w-[200px] rounded-lg border border-input bg-background px-3 py-1 text-sm"
                    value={columnMapping[header] || ""}
                    onChange={(e) =>
                      setColumnMapping({ ...columnMapping, [header]: e.target.value })
                    }
                  >
                    <option value="">Skip this column</option>
                    {leadFields.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label} {field.required && "*"}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!columnMapping.email && !Object.values(columnMapping).includes("email")}
              >
                Import {parsedData.length} Leads
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">Importing leads...</p>
            <p className="mt-1 text-xs text-muted-foreground">This may take a moment</p>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-4">
              <CheckCircle className="h-10 w-10 text-[#039855]" />
              <p className="mt-4 text-lg font-semibold">Import Complete</p>
            </div>

            <div className="space-y-2 rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Successfully imported</span>
                <span className="font-medium text-[#039855]">{importResult.imported}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Skipped (duplicates/invalid)</span>
                <span className="font-medium text-muted-foreground">{importResult.skipped}</span>
              </div>
              {importResult.errors > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Errors</span>
                  <span className="font-medium text-destructive">{importResult.errors}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
