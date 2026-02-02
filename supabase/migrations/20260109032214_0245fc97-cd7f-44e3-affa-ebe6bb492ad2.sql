-- Add phone column to tutor_applications table
ALTER TABLE public.tutor_applications ADD COLUMN IF NOT EXISTS phone text;

-- Create table for enrollment requests (trial and real)
CREATE TABLE public.enrollment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('trial', 'real')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'student_accepted', 'admin_approved', 'rejected', 'expired')),
  content TEXT,
  amount NUMERIC,
  payment_image_url TEXT,
  student_phone TEXT,
  student_address TEXT,
  trial_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for enrollment_requests
CREATE POLICY "Students can view their own requests" 
ON public.enrollment_requests 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Admins can view all requests" 
ON public.enrollment_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create requests" 
ON public.enrollment_requests 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tutors can view requests for their classes" 
ON public.enrollment_requests 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM classes WHERE classes.id = enrollment_requests.class_id AND classes.tutor_id = auth.uid()
));

CREATE POLICY "Students can update their own requests" 
ON public.enrollment_requests 
FOR UPDATE 
USING (student_id = auth.uid());

CREATE POLICY "Admins can update all requests" 
ON public.enrollment_requests 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trial enrollment tracking to enrollments table
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS enrollment_type TEXT DEFAULT 'real' CHECK (enrollment_type IN ('trial', 'real'));
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP WITH TIME ZONE;

-- Create trigger to update updated_at
CREATE TRIGGER update_enrollment_requests_updated_at
BEFORE UPDATE ON public.enrollment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for enrollment_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollment_requests;