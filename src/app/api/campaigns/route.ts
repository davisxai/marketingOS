import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  template_id: z.string().uuid(),
  from_name: z.string().min(1),
  from_email: z.string().email(),
  reply_to: z.string().email().optional(),
  daily_limit: z.number().min(1).max(1000).default(50),
  send_window_start: z.string().default("09:00"),
  send_window_end: z.string().default("17:00"),
  send_days: z.array(z.number().min(1).max(7)).default([1, 2, 3, 4, 5]),
  delay_between_sends: z.number().min(30).max(3600).default(60),
  target_filters: z.record(z.string(), z.unknown()).optional(),
});

// GET - List campaigns
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "25");
    const offset = (page - 1) * pageSize;

    let query = supabase.from("campaigns").select("*", { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validatedData = createCampaignSchema.parse(body);

    // Verify template exists
    const { data: template } = await supabase
      .from("email_templates")
      .select("id")
      .eq("id", validatedData.template_id)
      .single();

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Create campaign
    const { data, error } = await supabase
      .from("campaigns")
      .insert([{ ...validatedData, status: "draft" }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
