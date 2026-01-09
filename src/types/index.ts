// Lead Types
export type LeadStatus =
  | 'new'
  | 'verified'
  | 'qualified'
  | 'contacted'
  | 'converted'
  | 'unsubscribed'
  | 'bounced';

export type LeadSource =
  | 'linkedin'
  | 'google_maps'
  | 'yellowpages'
  | 'yelp'
  | 'manual'
  | 'import';

export type EmailVerificationStatus =
  | 'pending'
  | 'valid'
  | 'invalid'
  | 'risky'
  | 'unknown';

export interface Lead {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  linkedin_url: string | null;
  company_name: string | null;
  company_website: string | null;
  company_linkedin: string | null;
  industry: string | null;
  company_size: string | null;
  estimated_revenue: string | null;
  city: string | null;
  state: string | null;
  country: string;
  address: string | null;
  status: LeadStatus;
  quality_score: number | null;
  email_verified: boolean;
  email_verification_status: EmailVerificationStatus | null;
  email_verified_at: string | null;
  email_verification_provider: string | null;
  source: LeadSource;
  source_url: string | null;
  scraper_job_id: string | null;
  enrichment_data: Record<string, unknown>;
  custom_fields: Record<string, unknown>;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Campaign Types
export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  template_id: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  status: CampaignStatus;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  daily_limit: number;
  send_window_start: string;
  send_window_end: string;
  send_days: number[];
  delay_between_sends: number;
  target_filters: Record<string, unknown>;
  total_leads: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  replied_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Campaign Lead Types
export type CampaignLeadStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'bounced'
  | 'failed'
  | 'skipped';

export interface CampaignLead {
  id: string;
  campaign_id: string;
  lead_id: string;
  status: CampaignLeadStatus;
  scheduled_at: string | null;
  queued_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  opened_count: number;
  clicked_at: string | null;
  clicked_count: number;
  replied_at: string | null;
  error_message: string | null;
  retry_count: number;
  resend_email_id: string | null;
  personalized_subject: string | null;
  personalized_body: string | null;
  created_at: string;
  updated_at: string;
  lead?: Lead;
}

// Email Template Types
export type TemplateType = 'campaign' | 'follow_up' | 'warm_up';

export interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  body_text: string | null;
  variables: string[];
  template_type: TemplateType;
  is_active: boolean;
  times_used: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Scraper Types
export type ScraperType =
  | 'linkedin_search'
  | 'linkedin_company'
  | 'google_maps'
  | 'yellowpages'
  | 'yelp';

export type ScraperJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ScraperJob {
  id: string;
  scraper_type: ScraperType;
  search_query: string;
  search_parameters: Record<string, unknown>;
  status: ScraperJobStatus;
  total_results: number | null;
  processed_count: number;
  leads_created: number;
  leads_updated: number;
  errors_count: number;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  error_log: Array<{ message: string; timestamp: string }>;
  requests_made: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Email Event Types
export type EmailEventType =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'unsubscribed';

export interface EmailEvent {
  id: string;
  campaign_lead_id: string | null;
  resend_email_id: string | null;
  event_type: EmailEventType;
  event_data: Record<string, unknown>;
  clicked_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Unsubscribe Types
export interface Unsubscribe {
  id: string;
  email: string;
  lead_id: string | null;
  campaign_id: string | null;
  token: string;
  source: 'link' | 'reply' | 'manual' | 'complaint';
  reason: string | null;
  created_at: string;
}

// Domain Warmup Types
export type WarmupStatus = 'active' | 'paused' | 'completed';

export interface DomainWarmup {
  id: string;
  domain: string;
  warmup_started_at: string;
  current_daily_limit: number;
  target_daily_limit: number;
  warmup_day: number;
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  deliverability_rate: number | null;
  is_healthy: boolean;
  status: WarmupStatus;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
