-- Migration: Add admin dashboard support to cad_quotes table
-- Date: 2024-02-18
-- Description: Adds admin_notes and updated_at columns, plus trigger for auto-updating

-- Add admin_notes column for internal notes
ALTER TABLE cad_quotes 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add updated_at column for tracking last modification
ALTER TABLE cad_quotes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row update
DROP TRIGGER IF EXISTS update_cad_quotes_updated_at ON cad_quotes;
CREATE TRIGGER update_cad_quotes_updated_at
    BEFORE UPDATE ON cad_quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add index on updated_at for better query performance
CREATE INDEX IF NOT EXISTS idx_cad_quotes_updated_at ON cad_quotes(updated_at);

-- Update existing rows to set updated_at = created_at (for historical data)
UPDATE cad_quotes SET updated_at = created_at WHERE updated_at IS NULL;
