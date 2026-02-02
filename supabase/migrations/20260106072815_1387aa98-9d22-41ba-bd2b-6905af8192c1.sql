-- Create tutor complaints table
CREATE TABLE public.tutor_complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  notification_id UUID,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutor_complaints ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tutors can create their own complaints"
ON public.tutor_complaints
FOR INSERT
WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can view their own complaints"
ON public.tutor_complaints
FOR SELECT
USING (auth.uid() = tutor_id);

CREATE POLICY "Admins can view all complaints"
ON public.tutor_complaints
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update complaints"
ON public.tutor_complaints
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_tutor_complaints_updated_at
BEFORE UPDATE ON public.tutor_complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();