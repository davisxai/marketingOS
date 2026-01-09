-- Add QStash schedule tracking to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS qstash_schedule_id VARCHAR(255);
