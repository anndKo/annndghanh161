
-- Add unique constraint on user_id alone for user_roles
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Also fix profiles if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.profiles'::regclass 
    AND contype = 'u' 
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass AND attname = 'user_id')
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;
