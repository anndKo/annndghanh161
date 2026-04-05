
-- CRITICAL: Fix handle_new_user to prevent admin role injection via signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- If first user, make them admin
  IF public.is_first_user() THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- SECURITY: Only allow 'student' or 'tutor' from metadata, NEVER 'admin'
    requested_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'role', 'admin')::app_role,
      'student'
    );
    -- Double-check: if somehow admin slipped through, force student
    IF requested_role = 'admin' THEN
      requested_role := 'student';
    END IF;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, requested_role);
  END IF;
  
  RETURN NEW;
END;
$$;
