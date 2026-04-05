
CREATE TABLE public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create support requests"
ON public.support_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own support requests"
ON public.support_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own requests"
ON public.support_requests FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all support requests"
ON public.support_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update support requests"
ON public.support_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_requests;
