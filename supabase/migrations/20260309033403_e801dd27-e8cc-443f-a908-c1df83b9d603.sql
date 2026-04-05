
-- Device fingerprints tracking table
CREATE TABLE public.device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash text NOT NULL,
  user_id uuid NOT NULL,
  components jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  is_suspicious boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_device_fingerprints_hash ON public.device_fingerprints(fingerprint_hash);
CREATE INDEX idx_device_fingerprints_user ON public.device_fingerprints(user_id);

-- Login attempts tracking
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash text NOT NULL,
  email text,
  ip_address text,
  success boolean DEFAULT false,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_attempts_hash ON public.login_attempts(fingerprint_hash);
CREATE INDEX idx_login_attempts_created ON public.login_attempts(created_at);

-- Device blocks
CREATE TABLE public.device_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash text NOT NULL UNIQUE,
  block_count integer DEFAULT 1,
  blocked_until timestamptz,
  is_permanent boolean DEFAULT false,
  reason text,
  risk_score integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_blocks_hash ON public.device_blocks(fingerprint_hash);

-- Security audit log
CREATE TABLE public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash text,
  ip_address text,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  risk_level text DEFAULT 'low',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_audit_created ON public.security_audit_log(created_at);

-- Enable RLS on all tables
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can read these tables, edge functions use service role
CREATE POLICY "Admins can view device fingerprints"
ON public.device_fingerprints FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view login attempts"
ON public.login_attempts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view device blocks"
ON public.device_blocks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage device blocks"
ON public.device_blocks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view audit log"
ON public.security_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow anon to read device_blocks for lockout check (by fingerprint only)
CREATE POLICY "Anyone can check device block status"
ON public.device_blocks FOR SELECT TO anon
USING (true);
