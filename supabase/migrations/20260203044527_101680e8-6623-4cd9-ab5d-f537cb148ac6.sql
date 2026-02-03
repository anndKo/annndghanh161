-- Create table for password reset requests
CREATE TABLE public.password_reset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create password reset requests (no auth required)
CREATE POLICY "Anyone can create password reset requests"
ON public.password_reset_requests
FOR INSERT
WITH CHECK (true);

-- Only admins can view all requests
CREATE POLICY "Admins can view all password reset requests"
ON public.password_reset_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update requests
CREATE POLICY "Admins can update password reset requests"
ON public.password_reset_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update trigger for updated_at
CREATE TRIGGER update_password_reset_requests_updated_at
BEFORE UPDATE ON public.password_reset_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();