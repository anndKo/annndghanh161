-- Create blacklisted_emails table to store emails that cannot register again
CREATE TABLE IF NOT EXISTS public.blacklisted_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blacklisted_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blacklisted emails
CREATE POLICY "Admins can manage blacklisted emails"
  ON public.blacklisted_emails
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view blacklisted emails
CREATE POLICY "Admins can view blacklisted emails"
  ON public.blacklisted_emails
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));