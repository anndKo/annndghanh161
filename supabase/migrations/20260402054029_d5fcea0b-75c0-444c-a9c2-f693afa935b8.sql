
-- Table for tracking deleted/banned accounts
CREATE TABLE public.deleted_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  reason TEXT,
  deleted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage deleted accounts" ON public.deleted_accounts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can check if deleted" ON public.deleted_accounts
  FOR SELECT TO anon, authenticated USING (true);

-- Table for appeals from deleted users
CREATE TABLE public.account_appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.account_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create appeals" ON public.account_appeals
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage appeals" ON public.account_appeals
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view own appeals by email" ON public.account_appeals
  FOR SELECT TO anon, authenticated USING (true);
