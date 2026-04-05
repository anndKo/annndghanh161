-- Create a SECURITY DEFINER function to handle all security operations
-- This bypasses RLS and schema permissions completely
CREATE OR REPLACE FUNCTION public.security_record_login_attempt(
  p_fingerprint_hash text,
  p_email text DEFAULT NULL,
  p_ip_address text DEFAULT 'unknown',
  p_success boolean DEFAULT false,
  p_user_agent text DEFAULT 'unknown'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block record;
  v_fail_count integer;
  v_max_attempts integer;
  v_lockout_minutes integer;
  v_block_count integer;
  v_blocked_until timestamptz;
  v_is_permanent boolean;
  v_window_start timestamptz;
  v_days_since_update numeric;
BEGIN
  -- Insert login attempt
  INSERT INTO login_attempts (fingerprint_hash, email, ip_address, success, user_agent)
  VALUES (p_fingerprint_hash, p_email, p_ip_address, p_success, p_user_agent);

  -- Insert audit log
  INSERT INTO security_audit_log (fingerprint_hash, ip_address, action, details, risk_level)
  VALUES (
    p_fingerprint_hash, p_ip_address,
    CASE WHEN p_success THEN 'login_success' ELSE 'login_failed' END,
    jsonb_build_object('email', LEFT(p_email, 3) || '***'),
    CASE WHEN p_success THEN 'low' ELSE 'medium' END
  );

  -- If successful login, return immediately
  IF p_success THEN
    RETURN jsonb_build_object('success', true, 'remaining_attempts', null);
  END IF;

  -- Check existing block and handle 10-day reset
  SELECT * INTO v_block FROM device_blocks WHERE fingerprint_hash = p_fingerprint_hash LIMIT 1;
  
  IF v_block IS NOT NULL THEN
    v_days_since_update := EXTRACT(EPOCH FROM (now() - v_block.updated_at)) / 86400;
    IF v_days_since_update >= 10 AND NOT COALESCE(v_block.is_permanent, false) THEN
      DELETE FROM device_blocks WHERE id = v_block.id;
      INSERT INTO security_audit_log (fingerprint_hash, ip_address, action, details, risk_level)
      VALUES (p_fingerprint_hash, p_ip_address, 'block_reset_10_days', 
              jsonb_build_object('previous_block_count', v_block.block_count), 'low');
      v_block := NULL;
    END IF;
  END IF;

  -- Determine block count
  v_block_count := COALESCE(v_block.block_count, 0);
  
  -- Check if currently blocked
  IF v_block IS NOT NULL THEN
    IF COALESCE(v_block.is_permanent, false) THEN
      RETURN jsonb_build_object('success', true, 'blocked', true, 'permanent', true, 'remaining_attempts', 0);
    END IF;
    IF v_block.blocked_until IS NOT NULL AND v_block.blocked_until > now() THEN
      RETURN jsonb_build_object('success', true, 'blocked', true, 
        'blocked_until', v_block.blocked_until, 'remaining_attempts', 0);
    END IF;
  END IF;

  -- Get phase config
  IF v_block_count = 0 THEN v_max_attempts := 5; v_lockout_minutes := 15;
  ELSIF v_block_count = 1 THEN v_max_attempts := 3; v_lockout_minutes := 30;
  ELSIF v_block_count = 2 THEN v_max_attempts := 3; v_lockout_minutes := 60;
  ELSIF v_block_count = 3 THEN v_max_attempts := 3; v_lockout_minutes := 1440;
  ELSE v_max_attempts := 3; v_lockout_minutes := NULL;
  END IF;

  -- Count recent fails
  IF v_block_count > 0 AND v_block IS NOT NULL AND v_block.blocked_until IS NOT NULL THEN
    SELECT COUNT(*) INTO v_fail_count FROM login_attempts
    WHERE fingerprint_hash = p_fingerprint_hash AND success = false
    AND created_at >= v_block.blocked_until;
  ELSE
    v_window_start := now() - interval '30 minutes';
    SELECT COUNT(*) INTO v_fail_count FROM login_attempts
    WHERE fingerprint_hash = p_fingerprint_hash AND success = false
    AND created_at >= v_window_start;
  END IF;

  -- Check if we need to create/update block
  IF v_fail_count >= v_max_attempts THEN
    v_block_count := v_block_count + 1;
    v_is_permanent := (v_lockout_minutes IS NULL);
    IF v_lockout_minutes IS NOT NULL THEN
      v_blocked_until := now() + (v_lockout_minutes || ' minutes')::interval;
    ELSE
      v_blocked_until := NULL;
    END IF;

    IF v_block IS NOT NULL THEN
      UPDATE device_blocks SET
        block_count = v_block_count,
        blocked_until = v_blocked_until,
        is_permanent = v_is_permanent,
        reason = 'brute_force',
        risk_score = LEAST(100, v_block_count * 20),
        updated_at = now()
      WHERE fingerprint_hash = p_fingerprint_hash;
    ELSE
      INSERT INTO device_blocks (fingerprint_hash, block_count, blocked_until, is_permanent, reason, risk_score)
      VALUES (p_fingerprint_hash, 1, v_blocked_until, v_is_permanent, 'brute_force', 20);
    END IF;

    INSERT INTO security_audit_log (fingerprint_hash, ip_address, action, details, risk_level)
    VALUES (p_fingerprint_hash, p_ip_address, 'device_blocked_brute_force',
            jsonb_build_object('block_count', v_block_count, 'lockout_minutes', v_lockout_minutes), 'critical');

    RETURN jsonb_build_object('success', true, 'blocked', true,
      'blocked_until', v_blocked_until, 'permanent', v_is_permanent, 'remaining_attempts', 0);
  END IF;

  RETURN jsonb_build_object('success', true, 'remaining_attempts', v_max_attempts - v_fail_count);
END;
$$;

-- Function to check block status
CREATE OR REPLACE FUNCTION public.security_check_block_status(p_fingerprint_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block record;
  v_fail_count integer;
  v_max_attempts integer;
  v_block_count integer;
  v_window_start timestamptz;
  v_days_since_update numeric;
BEGIN
  SELECT * INTO v_block FROM device_blocks WHERE fingerprint_hash = p_fingerprint_hash LIMIT 1;
  
  -- Handle 10-day reset
  IF v_block IS NOT NULL THEN
    v_days_since_update := EXTRACT(EPOCH FROM (now() - v_block.updated_at)) / 86400;
    IF v_days_since_update >= 10 AND NOT COALESCE(v_block.is_permanent, false) THEN
      DELETE FROM device_blocks WHERE id = v_block.id;
      v_block := NULL;
    END IF;
  END IF;

  -- Check if blocked
  IF v_block IS NOT NULL THEN
    IF COALESCE(v_block.is_permanent, false) THEN
      RETURN jsonb_build_object('blocked', true, 'permanent', true, 'remaining_attempts', 0);
    END IF;
    IF v_block.blocked_until IS NOT NULL AND v_block.blocked_until > now() THEN
      RETURN jsonb_build_object('blocked', true, 'blocked_until', v_block.blocked_until, 'remaining_attempts', 0);
    END IF;
  END IF;

  v_block_count := COALESCE((SELECT block_count FROM device_blocks WHERE fingerprint_hash = p_fingerprint_hash), 0);

  -- Get phase config
  IF v_block_count = 0 THEN v_max_attempts := 5;
  ELSE v_max_attempts := 3;
  END IF;

  -- Count recent fails
  IF v_block_count > 0 AND v_block IS NOT NULL AND v_block.blocked_until IS NOT NULL THEN
    SELECT COUNT(*) INTO v_fail_count FROM login_attempts
    WHERE fingerprint_hash = p_fingerprint_hash AND success = false
    AND created_at >= v_block.blocked_until;
  ELSE
    v_window_start := now() - interval '30 minutes';
    SELECT COUNT(*) INTO v_fail_count FROM login_attempts
    WHERE fingerprint_hash = p_fingerprint_hash AND success = false
    AND created_at >= v_window_start;
  END IF;

  RETURN jsonb_build_object('blocked', false, 'remaining_attempts', GREATEST(0, v_max_attempts - v_fail_count), 'max_attempts', v_max_attempts);
END;
$$;

-- Function to check registration
CREATE OR REPLACE FUNCTION public.security_check_register(p_fingerprint_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block record;
  v_device_count integer;
BEGIN
  SELECT * INTO v_block FROM device_blocks WHERE fingerprint_hash = p_fingerprint_hash
    AND (is_permanent = true OR blocked_until > now()) LIMIT 1;
  
  IF v_block IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'device_blocked',
      'blocked_until', v_block.blocked_until, 'permanent', COALESCE(v_block.is_permanent, false));
  END IF;

  SELECT COUNT(*) INTO v_device_count FROM device_fingerprints WHERE fingerprint_hash = p_fingerprint_hash;
  
  IF v_device_count >= 3 THEN
    INSERT INTO security_audit_log (fingerprint_hash, action, details, risk_level)
    VALUES (p_fingerprint_hash, 'max_accounts_reached', jsonb_build_object('count', v_device_count), 'high');
    RETURN jsonb_build_object('allowed', false, 'reason', 'max_accounts', 'max', 3);
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Function to register device
CREATE OR REPLACE FUNCTION public.security_register_device(
  p_fingerprint_hash text,
  p_user_id uuid,
  p_components jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT 'unknown'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO device_fingerprints (fingerprint_hash, user_id, components, ip_address)
  VALUES (p_fingerprint_hash, p_user_id, p_components, p_ip_address);
  
  INSERT INTO security_audit_log (fingerprint_hash, ip_address, action, details, risk_level)
  VALUES (p_fingerprint_hash, p_ip_address, 'account_registered', jsonb_build_object('user_id', p_user_id::text), 'low');
  
  RETURN jsonb_build_object('success', true);
END;
$$;