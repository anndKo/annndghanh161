-- Create tutor_bank_accounts table
CREATE TABLE public.tutor_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  bank_name TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tutor_id)
);

-- Create payment request status enum
CREATE TYPE public.payment_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create tutor_payment_requests table (for sending class completion tasks)
CREATE TABLE public.tutor_payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  requested_amount NUMERIC NOT NULL,
  approved_amount NUMERIC,
  note TEXT,
  status payment_request_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tutor_revenue table (for tracking revenue history)
CREATE TABLE public.tutor_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  payment_request_id UUID REFERENCES public.tutor_payment_requests(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tutor_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_revenue ENABLE ROW LEVEL SECURITY;

-- RLS for tutor_bank_accounts
CREATE POLICY "Tutors can view own bank account"
ON public.tutor_bank_accounts FOR SELECT
USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can insert own bank account"
ON public.tutor_bank_accounts FOR INSERT
WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can update own bank account"
ON public.tutor_bank_accounts FOR UPDATE
USING (auth.uid() = tutor_id);

CREATE POLICY "Admins can view all bank accounts"
ON public.tutor_bank_accounts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for tutor_payment_requests
CREATE POLICY "Tutors can view own payment requests"
ON public.tutor_payment_requests FOR SELECT
USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can create payment requests"
ON public.tutor_payment_requests FOR INSERT
WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Admins can view all payment requests"
ON public.tutor_payment_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payment requests"
ON public.tutor_payment_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for tutor_revenue
CREATE POLICY "Tutors can view own revenue"
ON public.tutor_revenue FOR SELECT
USING (auth.uid() = tutor_id);

CREATE POLICY "Admins can manage revenue"
ON public.tutor_revenue FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_tutor_bank_accounts_updated_at
BEFORE UPDATE ON public.tutor_bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tutor_payment_requests_updated_at
BEFORE UPDATE ON public.tutor_payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();