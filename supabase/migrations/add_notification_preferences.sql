-- Add notification_preferences JSONB column to profiles table
-- This stores per-type notification preferences (expiry, invites, responses, new vouchers, transfers)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"voucher_expiry":true,"family_invitation":true,"invitation_response":true,"voucher_new":true,"voucher_transfer":true}';
