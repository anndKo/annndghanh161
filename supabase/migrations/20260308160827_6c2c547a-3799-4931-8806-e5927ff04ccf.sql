
CREATE TABLE public.tos_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  accepted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tos_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own acceptance" ON public.tos_acceptances
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own acceptance" ON public.tos_acceptances
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
