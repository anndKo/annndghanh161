-- Add gender and education status to tutor_applications table
ALTER TABLE public.tutor_applications
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS education_status text;