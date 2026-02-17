-- Supabase Schema for CAD Quote Calculator
-- This schema supports OTP verification and quote storage

-- ============================================================
-- Table: otp_requests
-- Stores OTP verification requests with hashed OTP values
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(64) NOT NULL, -- SHA256 hash of email:otp
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_otp_requests_email ON otp_requests(email);
CREATE INDEX IF NOT EXISTS idx_otp_requests_expires_at ON otp_requests(expires_at);

-- Enable Row Level Security
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: No direct access from client (functions use service role key)
CREATE POLICY "Service role only" ON otp_requests
  FOR ALL USING (false);

-- ============================================================
-- Table: cad_quotes
-- Stores customer quote details and computed pricing
-- ============================================================
CREATE TABLE IF NOT EXISTS cad_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  design_type VARCHAR(50) NOT NULL,
  stones VARCHAR(50) NOT NULL,
  metal VARCHAR(50) NOT NULL,
  delivery VARCHAR(50) NOT NULL,
  add_render BOOLEAN DEFAULT false,
  render_tones INTEGER,
  price_min INTEGER NOT NULL,
  price_max INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,
  image_path TEXT, -- Path to image in Supabase Storage
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cad_quotes_email ON cad_quotes(email);
CREATE INDEX IF NOT EXISTS idx_cad_quotes_created_at ON cad_quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_cad_quotes_status ON cad_quotes(status);

-- Enable Row Level Security
ALTER TABLE cad_quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: No direct access from client (functions use service role key)
CREATE POLICY "Service role only" ON cad_quotes
  FOR ALL USING (false);

-- ============================================================
-- Storage Bucket Setup
-- ============================================================
-- Run this in Supabase Dashboard Storage section:
-- 1. Create bucket named: design-images
-- 2. Set bucket to PRIVATE (not public)
-- 3. Functions will use service role key to upload images
-- 
-- No RLS policies needed on storage as service role bypasses them
-- ============================================================
