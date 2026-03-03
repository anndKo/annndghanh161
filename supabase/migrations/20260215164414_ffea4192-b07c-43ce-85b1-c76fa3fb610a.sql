-- Add full_name as a generated column that mirrors display_name
-- This fixes ALL queries across the entire codebase that reference profiles.full_name
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text GENERATED ALWAYS AS (display_name) STORED;
