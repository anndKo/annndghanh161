-- Table for class sharing and tutor requests
CREATE TABLE public.class_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Track which classes are shared (available for tutors to request)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.class_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_requests
CREATE POLICY "Tutors can create requests"
ON public.class_requests
FOR INSERT
WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can view own requests"
ON public.class_requests
FOR SELECT
USING (auth.uid() = tutor_id);

CREATE POLICY "Admins can view all requests"
ON public.class_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update requests"
ON public.class_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_class_requests_updated_at
BEFORE UPDATE ON public.class_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for class_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_requests;