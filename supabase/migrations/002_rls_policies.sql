-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_warmup ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LEADS POLICIES
-- ============================================
CREATE POLICY "Authenticated users can view all leads"
    ON leads FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert leads"
    ON leads FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
    ON leads FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete leads"
    ON leads FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- EMAIL TEMPLATES POLICIES
-- ============================================
CREATE POLICY "Authenticated users can view all templates"
    ON email_templates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert templates"
    ON email_templates FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update templates"
    ON email_templates FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete templates"
    ON email_templates FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- CAMPAIGNS POLICIES
-- ============================================
CREATE POLICY "Authenticated users can view all campaigns"
    ON campaigns FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert campaigns"
    ON campaigns FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaigns"
    ON campaigns FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete campaigns"
    ON campaigns FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- CAMPAIGN LEADS POLICIES
-- ============================================
CREATE POLICY "Authenticated users can view all campaign_leads"
    ON campaign_leads FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert campaign_leads"
    ON campaign_leads FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaign_leads"
    ON campaign_leads FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete campaign_leads"
    ON campaign_leads FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- EMAIL EVENTS POLICIES
-- ============================================
CREATE POLICY "Authenticated users can view all email_events"
    ON email_events FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert email_events"
    ON email_events FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Service role can also insert (for webhooks)
CREATE POLICY "Service role can insert email_events"
    ON email_events FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ============================================
-- SCRAPER JOBS POLICIES
-- ============================================
CREATE POLICY "Authenticated users can view all scraper_jobs"
    ON scraper_jobs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert scraper_jobs"
    ON scraper_jobs FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update scraper_jobs"
    ON scraper_jobs FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete scraper_jobs"
    ON scraper_jobs FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- UNSUBSCRIBES POLICIES
-- ============================================
-- Public can insert (for unsubscribe links)
CREATE POLICY "Anyone can insert unsubscribes"
    ON unsubscribes FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can view unsubscribes"
    ON unsubscribes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete unsubscribes"
    ON unsubscribes FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- DOMAIN WARMUP POLICIES
-- ============================================
CREATE POLICY "Authenticated users can view domain_warmup"
    ON domain_warmup FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert domain_warmup"
    ON domain_warmup FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update domain_warmup"
    ON domain_warmup FOR UPDATE
    TO authenticated
    USING (true);

-- ============================================
-- SETTINGS POLICIES
-- ============================================
CREATE POLICY "Authenticated users can view settings"
    ON settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can update settings"
    ON settings FOR UPDATE
    TO authenticated
    USING (true);
