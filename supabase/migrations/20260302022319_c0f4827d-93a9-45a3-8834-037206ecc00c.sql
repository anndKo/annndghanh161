
-- Add missing columns to password_reset_requests
ALTER TABLE public.password_reset_requests
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS admin_response text;

-- Make user_id nullable since unauthenticated users submit this form
ALTER TABLE public.password_reset_requests
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT NULL;

-- Add missing note column to class_requests
ALTER TABLE public.class_requests
  ADD COLUMN IF NOT EXISTS note text;
