-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LEADS TABLE
-- ============================================
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Contact Information
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),

    -- Company Information
    company_name VARCHAR(255),
    company_website VARCHAR(500),
    company_linkedin VARCHAR(500),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    estimated_revenue VARCHAR(50),

    -- Location
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'USA',
    address TEXT,

    -- Lead Status & Quality
    status VARCHAR(50) DEFAULT 'new',
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),

    -- Email Verification
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_status VARCHAR(50),
    email_verified_at TIMESTAMPTZ,
    email_verification_provider VARCHAR(50),

    -- Source Tracking
    source VARCHAR(50) NOT NULL,
    source_url TEXT,
    scraper_job_id UUID,

    -- Enrichment Data
    enrichment_data JSONB DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    notes TEXT,
    tags TEXT[] DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_email UNIQUE(email)
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_quality_score ON leads(quality_score DESC);
CREATE INDEX idx_leads_industry ON leads(industry);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);

-- ============================================
-- EMAIL TEMPLATES TABLE
-- ============================================
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables TEXT[] DEFAULT '{}',
    template_type VARCHAR(50) DEFAULT 'campaign',
    is_active BOOLEAN DEFAULT TRUE,
    times_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX idx_templates_active ON email_templates(is_active);
CREATE INDEX idx_templates_type ON email_templates(template_type);

-- ============================================
-- CAMPAIGNS TABLE
-- ============================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id UUID REFERENCES email_templates(id) NOT NULL,
    from_name VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    reply_to VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    daily_limit INTEGER DEFAULT 50,
    send_window_start TIME DEFAULT '09:00',
    send_window_end TIME DEFAULT '17:00',
    send_days INTEGER[] DEFAULT '{1,2,3,4,5}',
    delay_between_sends INTEGER DEFAULT 60,
    target_filters JSONB DEFAULT '{}',
    total_leads INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    is_ab_test BOOLEAN DEFAULT FALSE,
    ab_variants JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_at);

-- ============================================
-- CAMPAIGN LEADS (Junction Table)
-- ============================================
CREATE TABLE campaign_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_at TIMESTAMPTZ,
    queued_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    opened_count INTEGER DEFAULT 0,
    clicked_at TIMESTAMPTZ,
    clicked_count INTEGER DEFAULT 0,
    replied_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    resend_email_id VARCHAR(255),
    personalized_subject TEXT,
    personalized_body TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_campaign_lead UNIQUE(campaign_id, lead_id)
);

CREATE INDEX idx_campaign_leads_campaign ON campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_lead ON campaign_leads(lead_id);
CREATE INDEX idx_campaign_leads_status ON campaign_leads(status);
CREATE INDEX idx_campaign_leads_scheduled ON campaign_leads(scheduled_at);

-- ============================================
-- EMAIL EVENTS TABLE
-- ============================================
CREATE TABLE email_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_lead_id UUID REFERENCES campaign_leads(id),
    resend_email_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    clicked_url TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_events_campaign_lead ON email_events(campaign_lead_id);
CREATE INDEX idx_email_events_type ON email_events(event_type);
CREATE INDEX idx_email_events_resend_id ON email_events(resend_email_id);

-- ============================================
-- SCRAPER JOBS TABLE
-- ============================================
CREATE TABLE scraper_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scraper_type VARCHAR(50) NOT NULL,
    search_query TEXT NOT NULL,
    search_parameters JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending',
    total_results INTEGER,
    processed_count INTEGER DEFAULT 0,
    leads_created INTEGER DEFAULT 0,
    leads_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_error TEXT,
    error_log JSONB DEFAULT '[]',
    requests_made INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX idx_scraper_jobs_status ON scraper_jobs(status);
CREATE INDEX idx_scraper_jobs_type ON scraper_jobs(scraper_type);

-- Add foreign key for leads.scraper_job_id
ALTER TABLE leads ADD CONSTRAINT fk_leads_scraper_job
    FOREIGN KEY (scraper_job_id) REFERENCES scraper_jobs(id);

-- ============================================
-- UNSUBSCRIBES TABLE
-- ============================================
CREATE TABLE unsubscribes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    lead_id UUID REFERENCES leads(id),
    campaign_id UUID REFERENCES campaigns(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    source VARCHAR(50) DEFAULT 'link',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_unsubscribe_email UNIQUE(email)
);

CREATE INDEX idx_unsubscribes_email ON unsubscribes(email);
CREATE INDEX idx_unsubscribes_token ON unsubscribes(token);

-- ============================================
-- DOMAIN WARM-UP TABLE
-- ============================================
CREATE TABLE domain_warmup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(255) NOT NULL,
    warmup_started_at TIMESTAMPTZ DEFAULT NOW(),
    current_daily_limit INTEGER DEFAULT 10,
    target_daily_limit INTEGER DEFAULT 1000,
    warmup_day INTEGER DEFAULT 1,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    deliverability_rate DECIMAL(5,2),
    is_healthy BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
    ('email_daily_limit', '50', 'Maximum emails per day'),
    ('warm_up_enabled', 'true', 'Enable domain warm-up'),
    ('verification_enabled', 'true', 'Enable email verification before sending');

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER campaign_leads_updated_at BEFORE UPDATE ON campaign_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER scraper_jobs_updated_at BEFORE UPDATE ON scraper_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER domain_warmup_updated_at BEFORE UPDATE ON domain_warmup
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RPC FUNCTIONS FOR ATOMIC UPDATES
-- ============================================

-- Increment campaign stat (sent, delivered, opened, clicked, bounced, unsubscribed)
CREATE OR REPLACE FUNCTION increment_campaign_stat(
    p_campaign_id UUID,
    p_stat_field TEXT
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE campaigns SET %I = %I + 1 WHERE id = $1',
        p_stat_field, p_stat_field
    ) USING p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- Increment opened count for campaign lead
CREATE OR REPLACE FUNCTION increment_opened_count(
    p_campaign_lead_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE campaign_leads
    SET opened_count = opened_count + 1
    WHERE id = p_campaign_lead_id;
END;
$$ LANGUAGE plpgsql;

-- Increment clicked count for campaign lead
CREATE OR REPLACE FUNCTION increment_clicked_count(
    p_campaign_lead_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE campaign_leads
    SET clicked_count = clicked_count + 1
    WHERE id = p_campaign_lead_id;
END;
$$ LANGUAGE plpgsql;
