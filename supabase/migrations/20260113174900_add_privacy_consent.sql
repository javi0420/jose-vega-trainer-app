-- Migration: Add Privacy Consent Fields to Profiles
-- Created: 2026-01-13
-- Purpose: GDPR compliance - track user consent for data processing

-- Add privacy consent columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Create index for efficient querying of consent status
CREATE INDEX IF NOT EXISTS idx_profiles_accepted_terms 
ON profiles(accepted_terms);

-- Add comment for documentation
COMMENT ON COLUMN profiles.accepted_terms IS 'Indicates whether the user has accepted the privacy terms and conditions';
COMMENT ON COLUMN profiles.accepted_at IS 'Timestamp when the user accepted the terms';

-- Note: Existing users will have accepted_terms = false by default
-- They will need to accept terms on next login
