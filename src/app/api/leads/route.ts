import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Validation schemas
const createLeadSchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  company_name: z.string().optional(),
  company_website: z.string().url().optional(),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  estimated_revenue: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("USA"),
  source: z.enum([
    "linkedin",
    "google_maps",
    "yellowpages",
    "yelp",
    "manual",
    "import",
  ]),
  source_url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(25),
  status: z.string().optional(),
  source: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// GET - List leads with filtering, pagination, and search
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const query = querySchema.parse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      status: searchParams.get("status"),
      source: searchParams.get("source"),
      search: searchParams.get("search"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
    });

    const { page, pageSize, status, source, search, sortBy, sortOrder } = query;
    const offset = (page - 1) * pageSize;

    // Build query
    let dbQuery = supabase.from("leads").select("*", { count: "exact" });

    // Apply filters
    if (status) {
      dbQuery = dbQuery.eq("status", status);
    }
    if (source) {
      dbQuery = dbQuery.eq("source", source);
    }
    if (search) {
      dbQuery = dbQuery.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%`
      );
    }

    // Apply sorting and pagination
    dbQuery = dbQuery
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await dbQuery;

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validatedData = createLeadSchema.parse(body);

    // Check if email already exists
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("email", validatedData.email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A lead with this email already exists" },
        { status: 409 }
      );
    }

    // Create lead
    const { data, error } = await supabase
      .from("leads")
      .insert([validatedData])
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

// DELETE - Bulk delete leads
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of lead IDs to delete" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("leads").delete().in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: `Deleted ${ids.length} leads` });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
