-- Add discount and revenue percentage fields to classes
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tutor_percentage INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS schedule_days TEXT,
ADD COLUMN IF NOT EXISTS schedule_start_time TIME,
ADD COLUMN IF NOT EXISTS schedule_end_time TIME;

-- Add enrollment expiration field
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS enrollment_expires_at TIMESTAMP WITH TIME ZONE;

-- Add class_id to real enrollment requests
ALTER TABLE public.enrollment_requests
ADD COLUMN IF NOT EXISTS enrollment_days INTEGER;